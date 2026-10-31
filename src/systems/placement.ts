import { ITEMS } from '../config/items';
import type { ItemInstance, ItemKind } from '../models/types';
export interface Cell { x: number; y: number; }
export function itemSize(kind: ItemKind, rotated: boolean): { w: number; h: number } {
  const d = ITEMS[kind];
  return rotated && d.rotatable ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
}
/** 某件装备以 (x,y) 左上角、给定朝向时占据的格子 */
export function occupiedCells(kind: ItemKind, x: number, y: number, rotated: boolean): Cell[] {
  const { w, h } = itemSize(kind, rotated);
  const out: Cell[] = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push({ x: x + dx, y: y + dy });
  return out;
}
export type ItemPlace = 'bag' | 'reserve' | 'legacy' | 'temp' | 'hand' | 'armor';
/** 备用、旧档暂存和已穿上的主手/护甲都不占背包格子。 */
export function itemPlace(i: ItemInstance): ItemPlace {
  if (i.bin === 'reserve' || i.bin === 'legacy' || i.bin === 'hand' || i.bin === 'armor') return i.bin;
  if (i.x !== null && i.y !== null) return 'bag';
  return 'temp';
}
export function inBag(i: ItemInstance): boolean { return itemPlace(i) === 'bag'; }
/** 是否可以放置（忽略 ignoreId 自身原位，用于移动/原位旋转） */
export function canPlace(items: ItemInstance[], cols: number, rows: number, kind: ItemKind, x: number, y: number, rotated: boolean, ignoreId?: string): boolean {
  const cells = occupiedCells(kind, x, y, rotated);
  if (cells.some(c => c.x < 0 || c.y < 0 || c.x >= cols || c.y >= rows)) return false;
  const taken = new Set<string>();
  for (const it of items) {
    if (it.id === ignoreId || !inBag(it)) continue;
    for (const c of occupiedCells(it.kind, it.x!, it.y!, it.rotated)) taken.add(c.x + ',' + c.y);
  }
  return cells.every(c => !taken.has(c.x + ',' + c.y));
}
export function itemAt(items: ItemInstance[], cx: number, cy: number): ItemInstance | undefined {
  return items.find(it => inBag(it) && occupiedCells(it.kind, it.x!, it.y!, it.rotated).some(c => c.x === cx && c.y === cy));
}
/** 寻找第一个可放置位置（先尝试原朝向，再尝试旋转） */
export function findSpot(items: ItemInstance[], cols: number, rows: number, kind: ItemKind, ignoreId?: string): { x: number; y: number; rotated: boolean } | null {
  for (const rotated of [false, true]) {
    if (rotated && !ITEMS[kind].rotatable) continue;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
      if (canPlace(items, cols, rows, kind, x, y, rotated, ignoreId)) return { x, y, rotated };
  }
  return null;
}
