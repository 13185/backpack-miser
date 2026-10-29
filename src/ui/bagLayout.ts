/** 背包格子只跟视口宽度和列数走。不用窗口高度，避免手机地址栏伸缩时格子忽大忽小。 */
export function bagCellSize(viewportWidth: number, cols: number, wide: boolean): number {
  const availW = wide ? 520 : Math.min(viewportWidth, 600) - 36;
  const n = Math.max(1, cols);
  return Math.max(40, Math.min(72, Math.floor(availW / n)));
}
