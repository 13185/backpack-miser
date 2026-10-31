/** 遗物、符文、专精还没有正式绘稿。这是可辨认的文字印，不是空白图。 */
export function sealSvg(title: string, hue: number): string {
  const ch = title.slice(0, 1) || '印';
  return `<svg viewBox="0 0 64 64" class="icon" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="hsl(${hue} 42% 22%)" stroke="#e8b64c" stroke-width="3"/><circle cx="32" cy="32" r="20" fill="none" stroke="#f3d7a0" stroke-width="1"/><text x="32" y="42" text-anchor="middle" font-size="26" font-weight="700" fill="#ffe7a8">${ch}</text></svg>`;
}
export function sealHue(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 33 + id.charCodeAt(i)) % 360;
  return n;
}
