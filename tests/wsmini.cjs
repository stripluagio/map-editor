// Minimal WebSocket client for CDP (no deps), only text frames, client->server masked.
const net = require('net');
const crypto = require('crypto');
class WS {
  constructor(url) {
    const u = new URL(url);
    this.host = u.hostname; this.port = u.port; this.path = u.pathname + u.search;
    this.buf = Buffer.alloc(0); this.handlers = []; this.readyPromise = new Promise(res => this._onready = res);
    this.sock = net.connect(+this.port, this.host, () => {
      const key = crypto.randomBytes(16).toString('base64');
      this.sock.write(`GET ${this.path} HTTP/1.1\r\nHost: ${this.host}:${this.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
    });
    let handshake = false;
    this.sock.on('data', d => {
      this.buf = Buffer.concat([this.buf, d]);
      if (!handshake) {
        const i = this.buf.indexOf('\r\n\r\n');
        if (i < 0) return;
        handshake = true; this.buf = this.buf.slice(i + 4); this._onready();
      }
      this._parse();
    });
  }
  ready() { return this.readyPromise; }
  onMessage(fn) { this.handlers.push(fn); }
  _parse() {
    while (this.buf.length >= 2) {
      const b1 = this.buf[0], b2 = this.buf[1];
      const fin = b1 & 0x80, opcode = b1 & 0x0f, masked = b2 & 0x80;
      let len = b2 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      let mask = null;
      if (masked) { if (this.buf.length < off + 4) return; mask = this.buf.slice(off, off + 4); off += 4; }
      if (this.buf.length < off + len) return;
      let payload = this.buf.slice(off, off + len);
      if (mask) { const p = Buffer.from(payload); for (let i = 0; i < p.length; i++) p[i] ^= mask[i % 4]; payload = p; }
      this.buf = this.buf.slice(off + len);
      if (opcode === 1) { const s = payload.toString('utf8'); for (const h of this.handlers) h(s); }
      else if (opcode === 8) { this.sock.end(); return; }
    }
  }
  send(str) {
    const data = Buffer.from(str, 'utf8');
    const mask = crypto.randomBytes(4);
    let head;
    if (data.length < 126) { head = Buffer.from([0x81, 0x80 | data.length]); }
    else if (data.length < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 0x80 | 126; head.writeUInt16BE(data.length, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 0x80 | 127; head.writeBigUInt64BE(BigInt(data.length), 2); }
    const body = Buffer.from(data); for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
    this.sock.write(Buffer.concat([head, mask, body]));
  }
  close() { try { this.sock.end(); } catch (e) {} }
}
module.exports = WS;
