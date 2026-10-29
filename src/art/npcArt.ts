/** NPC 半身立绘（剧情弹窗头像位）。1024 画布，底部对齐。 */
export const NPC_ART: Record<string, { name: string; src: string }> = {
  lumi: { name: '露米', src: 'art/npc/lumi_512.png' },
  old_rivet: { name: '老铆', src: 'art/npc/old_rivet_512.png' },
  mr_crow: { name: '乌先生', src: 'art/npc/mr_crow_512.png' },
  eve: { name: '伊芙', src: 'art/npc/eve_512.png' },
};

/** 按文本中首个出现的 NPC 名返回头像 HTML；无则空串 */
export function npcPortraitHtml(text: string): string {
  let best: { i: number; id: string } | null = null;
  for (const [id, a] of Object.entries(NPC_ART)) {
    const i = text.indexOf(a.name);
    if (i >= 0 && (!best || i < best.i)) best = { i, id };
  }
  if (!best) return '';
  const a = NPC_ART[best.id];
  return `<div class="npcPortrait" style="float:left;width:96px;height:96px;margin:0 12px 6px 0;border-radius:10px;overflow:hidden;background:#2a211c;border:2px solid #6b5230"><img src="${a.src}" alt="${a.name}" style="width:100%;height:100%;object-fit:cover;object-position:50% 12%" onerror="this.parentElement&&this.parentElement.remove()"></div>`;
}
