/** Tiny DOM helpers shared by all UI modules. */
export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
export const $$ = <T extends Element = HTMLElement>(sel: string): T[] =>
  Array.from(document.querySelectorAll(sel)) as T[];

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function inputValue(id: string): string {
  return ($(id) as HTMLInputElement).value;
}
export function setInputValue(id: string, v: string): void {
  ($(id) as HTMLInputElement).value = v;
}
