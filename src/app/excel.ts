/* ==========================================================================
 * Excel 导出数据工具 — v2.0.2 新增功能（工具菜单 / 工具条按钮）
 *
 * 原版用 SheetJS + JSZip 读 `.xlsx`，然后把「第一行描述 / 第二行字段名 /
 * 第三行字段类型」的表转成 json / xml / 代码脚本。
 *
 * 这里不引第三方库：
 *   - `.xlsx` 本质是个 zip，用浏览器原生的 `DecompressionStream('deflate-raw')`
 *     解压（Chrome 80+ / Edge / Safari 16.4+），再解析 sheet XML；
 *   - `.csv` / `.tsv` 直接切分。
 * 于是整个工具零依赖、离线可用，和本项目其余部分的取向一致。
 * ========================================================================== */

export type CellType = 'int' | 'number' | 'string' | 'bool' | 'any';

export interface SheetTable {
  name: string;
  rows: string[][];
}

/** 一个工作表的字段定义（由前三行推出来）。 */
export interface FieldDef {
  name: string;
  type: CellType;
  desc: string;
}

const TEXT = new TextDecoder('utf-8');

/* ------------------------------- ZIP ---------------------------------- */

interface ZipEntry { name: string; method: number; compSize: number; dataStart: number }

function findEocd(dv: DataView): number {
  // End of central directory: 0x06054b50, within the last 65557 bytes.
  const min = Math.max(0, dv.byteLength - 65557);
  for (let i = dv.byteLength - 22; i >= min; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) return i;
  }
  return -1;
}

function readZipIndex(buf: ArrayBuffer): Map<string, ZipEntry> {
  const dv = new DataView(buf);
  const eocd = findEocd(dv);
  if (eocd < 0) throw new Error('不是有效的 xlsx（找不到 zip 目录）');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = new Map<string, ZipEntry>();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = TEXT.decode(new Uint8Array(buf, p + 46, nameLen));
    // Data begins after the *local* header, whose extra field can differ in size.
    const lNameLen = dv.getUint16(localOff + 26, true);
    const lExtraLen = dv.getUint16(localOff + 28, true);
    out.set(name, { name, method, compSize, dataStart: localOff + 30 + lNameLen + lExtraLen });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function unzipText(buf: ArrayBuffer, entry: ZipEntry | undefined): Promise<string | null> {
  if (!entry) return null;
  const raw = new Uint8Array(buf, entry.dataStart, entry.compSize);
  if (entry.method === 0) return TEXT.decode(raw);
  if (entry.method !== 8) return null;              // only "stored" and "deflate"
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([raw as unknown as BlobPart]).stream().pipeThrough(ds);
  return new Response(stream).text();
}

/* ---------------------------- XML helpers ------------------------------ */

function xmlDoc(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml');
}

/** "AB" -> 27 (0-based column index). */
function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) n = n * 26 + (c - 64);
    else break;
  }
  return n - 1;
}

function parseSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const doc = xmlDoc(xml);
  return Array.from(doc.getElementsByTagName('si')).map(si =>
    Array.from(si.getElementsByTagName('t')).map(t => t.textContent || '').join(''));
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const doc = xmlDoc(xml);
  const rows: string[][] = [];
  for (const row of Array.from(doc.getElementsByTagName('row'))) {
    const cells: string[] = [];
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const ref = c.getAttribute('r') || '';
      const idx = ref ? colIndex(ref) : cells.length;
      const t = c.getAttribute('t');
      let val = '';
      if (t === 's') {
        const v = c.getElementsByTagName('v')[0];
        val = v ? (shared[Number(v.textContent)] ?? '') : '';
      } else if (t === 'inlineStr') {
        val = Array.from(c.getElementsByTagName('t')).map(x => x.textContent || '').join('');
      } else {
        const v = c.getElementsByTagName('v')[0];
        val = v ? (v.textContent || '') : '';
      }
      while (cells.length < idx) cells.push('');
      cells[idx] = val;
    }
    rows.push(cells);
  }
  return rows;
}

/* ------------------------------ readers -------------------------------- */

/** Read every worksheet of an .xlsx file. */
export async function readXlsx(buf: ArrayBuffer): Promise<SheetTable[]> {
  const index = readZipIndex(buf);
  const shared = parseSharedStrings(await unzipText(buf, index.get('xl/sharedStrings.xml')));

  // Sheet order + names come from workbook.xml; the sheet parts are conventionally
  // xl/worksheets/sheetN.xml, so pair them positionally.
  const wbXml = await unzipText(buf, index.get('xl/workbook.xml'));
  const names: string[] = [];
  if (wbXml) {
    const doc = xmlDoc(wbXml);
    for (const s of Array.from(doc.getElementsByTagName('sheet'))) {
      names.push(s.getAttribute('name') || '');
    }
  }

  const sheets: SheetTable[] = [];
  for (let i = 1; i <= Math.max(1, names.length); i++) {
    const xml = await unzipText(buf, index.get(`xl/worksheets/sheet${i}.xml`));
    if (xml == null) continue;
    const rows = parseSheet(xml, shared);
    if (!rows.length) continue;
    sheets.push({ name: names[i - 1] || 'Sheet' + i, rows });
  }
  if (!sheets.length) throw new Error('这个 xlsx 里没有可读的工作表');
  return sheets;
}

/** Split a CSV/TSV body. Handles quoted fields and CRLF. */
export function parseDelimited(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === sep) { row.push(cell); cell = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

/* ------------------------------ schema --------------------------------- */

const TYPES: CellType[] = ['int', 'number', 'string', 'bool', 'any'];

function toType(raw: string): CellType {
  const s = (raw || '').trim().toLowerCase();
  if (s === 'int' || s === 'integer') return 'int';
  if (s === 'number' || s === 'float' || s === 'double') return 'number';
  if (s === 'string' || s === 'str' || s === 'text') return 'string';
  if (s === 'bool' || s === 'boolean') return 'bool';
  return TYPES.includes(s as CellType) ? (s as CellType) : 'any';
}

/**
 * 前三行是表头：描述 / 字段名 / 类型。
 * 少于 3 行直接报错（原版提示「最少3行」）。
 */
export function readFields(rows: string[][]): { fields: FieldDef[]; dataRows: string[][] } {
  if (rows.length < 3) throw new Error('最少3行：第一行是描述，第二行是字段名，第三行是字段类型');
  const desc = rows[0], names = rows[1], types = rows[2];
  const fields: FieldDef[] = [];
  const seen = new Set<string>();
  for (let c = 0; c < names.length; c++) {
    const name = (names[c] || '').trim();
    if (!name) continue;
    if (seen.has(name)) throw new Error('出现重复值：字段名「' + name + '」重复');
    seen.add(name);
    fields.push({ name, type: toType(types[c] || ''), desc: (desc[c] || '').trim() });
  }
  if (!fields.length) throw new Error('第二行没有读到任何字段名');
  return { fields, dataRows: rows.slice(3) };
}

function coerce(v: string, t: CellType): unknown {
  const s = (v ?? '').trim();
  if (t === 'int') { const n = parseInt(s, 10); return Number.isFinite(n) ? n : 0; }
  if (t === 'number') { const n = Number(s); return Number.isFinite(n) ? n : 0; }
  if (t === 'bool') return /^(1|true|yes|是)$/i.test(s);
  return s;
}

/* ----------------------------- exporters ------------------------------- */

export function toJson(fields: FieldDef[], dataRows: string[][]): string {
  const arr = dataRows.map(r => {
    const o: Record<string, unknown> = {};
    fields.forEach((f, i) => { o[f.name] = coerce(r[i], f.type); });
    return o;
  });
  return JSON.stringify(arr, null, 2);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
}

export function toXml(fields: FieldDef[], dataRows: string[][]): string {
  const body = dataRows.map(r => {
    const inner = fields.map((f, i) => '    <' + f.name + '>' + esc(r[i] ?? '') + '</' + f.name + '>').join('\n');
    return '  <item>\n' + inner + '\n  </item>';
  }).join('\n');
  return '<?xml version="1.0" encoding="utf-8"?>\n<root>\n' + body + '\n</root>\n';
}

const TS_TYPE: Record<CellType, string> = {
  int: 'number', number: 'number', string: 'string', bool: 'boolean', any: 'any',
};

export function toTs(fields: FieldDef[], dataRows: string[][], tableName: string): string {
  const iface = 'export interface ' + tableName + ' {\n'
    + fields.map(f => '  /** ' + (f.desc || f.name) + ' */\n  ' + f.name + ': ' + TS_TYPE[f.type] + ';').join('\n')
    + '\n}\n';
  const arr = dataRows.map(r => {
    const o = fields.map((f, i) => {
      const v = coerce(r[i], f.type);
      return f.name + ': ' + (typeof v === 'string' ? JSON.stringify(v) : String(v));
    }).join(', ');
    return '  { ' + o + ' },';
  }).join('\n');
  return iface + '\nexport const ' + tableName + 'List: ' + tableName + '[] = [\n' + arr + '\n];\n';
}

/* -------------------------------- UI ----------------------------------- */

const DEMO = [
  ['道具名称', '道具编号', '售价', '可否堆叠', '说明'],
  ['name', 'id', 'price', 'stackable', 'desc'],
  ['string', 'int', 'number', 'bool', 'string'],
  ['小血瓶', '1001', '15', 'true', '恢复 30 点生命'],
  ['大血瓶', '1002', '45', 'true', '恢复 120 点生命'],
  ['铁剑', '2001', '120', 'false', '攻击力 +8'],
  ['钥匙', '3001', '0', 'false', '开启地牢大门'],
];

let sheets: SheetTable[] = [];

function $(id: string): HTMLElement { return document.getElementById(id) as HTMLElement; }

function currentTable(): SheetTable | null {
  const sel = $('excelSheet') as HTMLSelectElement;
  const i = Number(sel.value) || 0;
  return sheets[i] || null;
}

function renderSheetSelect(): void {
  const sel = $('excelSheet') as HTMLSelectElement;
  sel.innerHTML = '';
  sheets.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = String(i); o.textContent = s.name;
    sel.appendChild(o);
  });
  sel.value = '0';
}

function renderPreview(): void {
  const box = $('excelPreview');
  const t = currentTable();
  if (!t) { box.innerHTML = '<div class="excel-empty">还没有数据</div>'; return; }
  const rows = t.rows.slice(0, 40);
  const html = ['<table>'];
  rows.forEach((r, ri) => {
    const tag = ri === 0 ? 'th' : 'td';
    html.push('<tr>' + r.map(c => '<' + tag + '>' + esc(c ?? '') + '</' + tag + '>').join('') + '</tr>');
  });
  html.push('</table>');
  if (t.rows.length > 40) html.push('<div class="excel-empty">仅预览前 40 行，共 ' + t.rows.length + ' 行</div>');
  box.innerHTML = html.join('');
}

function setSheets(next: SheetTable[], note: string): void {
  sheets = next;
  renderSheetSelect();
  renderPreview();
  $('excelStatus').textContent = note;
}

async function loadFile(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx')) {
    const s = await readXlsx(buf);
    setSheets(s, '已加载 ' + file.name + '（' + s.length + ' 个表单）');
    return;
  }
  const text = TEXT.decode(new Uint8Array(buf));
  const sep = lower.endsWith('.tsv') ? '\t' : (text.indexOf('\t') >= 0 && text.indexOf(',') < 0 ? '\t' : ',');
  setSheets([{ name: file.name.replace(/\.[^.]+$/, ''), rows: parseDelimited(text, sep) }],
            '已加载 ' + file.name);
}

export function bindExcel(): void {
  const file = $('excelFile') as HTMLInputElement;
  $('excelPick').addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    loadFile(f).catch(err => {
      $('excelStatus').textContent = '读取文件失败：' + (err as Error).message;
    });
    file.value = '';
  });

  $('excelDemo').addEventListener('click', () => {
    setSheets([{ name: '道具表', rows: DEMO.map(r => r.slice()) }], '已载入示例表（道具表）');
  });

  ($('excelSheet') as HTMLSelectElement).addEventListener('change', renderPreview);

  $('excelExport').addEventListener('click', () => {
    const t = currentTable();
    if (!t) { $('excelStatus').textContent = '还没选择Excel文件'; return; }
    let fields: FieldDef[], dataRows: string[][];
    try {
      const parsed = readFields(t.rows);
      fields = parsed.fields; dataRows = parsed.dataRows;
    } catch (err) {
      $('excelStatus').textContent = '导出数据发生异常：' + (err as Error).message;
      return;
    }
    const kind = ($('excelType') as HTMLSelectElement).value;
    const tableName = (t.name || 'Table').replace(/[^\w\u4e00-\u9fff]/g, '') || 'Table';
    const base = tableName.replace(/[\u4e00-\u9fff]/g, '') || 'data';
    let text: string, name: string, mime: string;
    if (kind === 'xml') {
      text = toXml(fields, dataRows); name = base + '.xml'; mime = 'application/xml';
    } else if (kind === 'ts') {
      text = toTs(fields, dataRows, base.charAt(0).toUpperCase() + base.slice(1));
      name = base + '.ts'; mime = 'text/plain';
    } else {
      text = toJson(fields, dataRows); name = base + '.json'; mime = 'application/json';
    }
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    $('excelStatus').textContent = '完成导出 ' + name + '（' + dataRows.length + ' 行 / ' + fields.length + ' 个字段）';
  });

  renderPreview();
}
