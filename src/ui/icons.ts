import { webAsset } from '../art/webAsset';
import type { ItemKind } from '../models/types';
/** 本地 SVG 装备图标（viewBox 0 0 64 64） */
const S: Partial<Record<ItemKind, string>> = {
  dagger: `<g transform="rotate(-45 32 32)"><path d="M29 6 L35 6 L36 40 L28 40 Z" fill="#dfeefc" stroke="#5a6b7c" stroke-width="2"/><path d="M32 8 L32 38" stroke="#fff" stroke-width="1.5"/><rect x="21" y="40" width="22" height="5" rx="2.5" fill="#e8b64c" stroke="#7a5418" stroke-width="1.5"/><rect x="29" y="45" width="6" height="11" rx="2" fill="#7a4a24"/><circle cx="32" cy="58" r="3.5" fill="#e8b64c"/></g>`,
  greatsword: `<g transform="rotate(-45 32 32)"><path d="M27 2 L37 2 L38 42 L32 48 L26 42 Z" fill="#c9d6e3" stroke="#4a5866" stroke-width="2"/><path d="M32 4 L32 44" stroke="#fff" stroke-width="2"/><rect x="16" y="44" width="32" height="6" rx="3" fill="#e8b64c" stroke="#7a5418" stroke-width="1.5"/><rect x="29" y="50" width="6" height="9" rx="2" fill="#6b3a1e"/><circle cx="32" cy="61" r="3" fill="#ff5d6c"/></g>`,
  shield: `<path d="M32 6 L54 14 C54 34 46 50 32 58 C18 50 10 34 10 14 Z" fill="#4f8fd6" stroke="#e8b64c" stroke-width="4"/><path d="M32 14 L46 19 C46 33 41 44 32 50 Z" fill="#7fb6ef"/><circle cx="32" cy="30" r="7" fill="#ffd45c" stroke="#7a5418" stroke-width="2"/>`,
  potion: `<rect x="26" y="6" width="12" height="10" rx="2" fill="#c08a4a"/><path d="M24 16 H40 V24 C50 28 52 36 52 42 C52 52 44 58 32 58 C20 58 12 52 12 42 C12 36 14 28 24 24 Z" fill="#ff7fa8" stroke="#fff" stroke-width="2.5"/><path d="M16 40 C22 36 42 46 48 40 C48 50 42 55 32 55 C22 55 16 50 16 40Z" fill="#e0407a"/><circle cx="24" cy="32" r="4" fill="#fff" opacity=".7"/>`,
  ruby: `<path d="M32 6 L54 24 L32 58 L10 24 Z" fill="#ff3d55" stroke="#ffd0d6" stroke-width="2.5"/><path d="M10 24 H54 M22 24 L32 6 L42 24 L32 58 Z" fill="none" stroke="#ffb0bc" stroke-width="1.5"/><path d="M22 24 L32 6 L42 24Z" fill="#ff8a9a"/>`,
  moneybag: `<path d="M24 14 L40 14 L36 22 L28 22 Z" fill="#b8843a" stroke="#6b4a1a" stroke-width="2"/><path d="M28 22 C10 28 8 54 22 58 H42 C56 54 54 28 36 22 Z" fill="#d9a545" stroke="#6b4a1a" stroke-width="2.5"/><rect x="24" y="19" width="16" height="5" rx="2" fill="#ff5d6c"/><text x="32" y="50" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff6c8" stroke="#6b4a1a" stroke-width="1">¥</text>`,
  spear: `<g transform="rotate(-30 32 32)"><rect x="30" y="4" width="4" height="48" fill="#c8e6ff" stroke="#4a6a8a" stroke-width="1.5"/><path d="M28 4 L36 4 L32 -2 Z" fill="#e8f4ff" stroke="#4a6a8a"/><rect x="26" y="48" width="12" height="6" rx="2" fill="#e8b64c"/></g>`,
  compass: `<circle cx="32" cy="32" r="22" fill="#1a3048" stroke="#a8d8ff" stroke-width="3"/><circle cx="32" cy="32" r="3" fill="#ffd45c"/><path d="M32 14 L36 32 L32 28 L28 32 Z" fill="#ff6b5a"/><path d="M32 50 L28 32 L32 36 L36 32 Z" fill="#8fd8ff"/>`,
  firework_crossbow: `<rect x="10" y="28" width="36" height="10" rx="2" fill="#8a4a2a" stroke="#4a2a1a"/><path d="M46 22 L58 33 L46 44 Z" fill="#ff9a6b" stroke="#8a3a1a"/><circle cx="18" cy="24" r="4" fill="#ffd45c"/><circle cx="28" cy="20" r="3" fill="#ff7fa8"/><circle cx="22" cy="16" r="2.5" fill="#9fd3ff"/>`,
  fold_wall: `<rect x="14" y="10" width="12" height="44" rx="2" fill="#9ab0c8" stroke="#4a5866" stroke-width="2"/><rect x="26" y="14" width="12" height="40" rx="2" fill="#b0c4d8" stroke="#4a5866" stroke-width="2"/><rect x="38" y="10" width="12" height="44" rx="2" fill="#9ab0c8" stroke="#4a5866" stroke-width="2"/>`,
  travel_lamp: `<rect x="26" y="38" width="12" height="16" rx="2" fill="#6a4a2a"/><path d="M20 38 H44 L40 18 H24 Z" fill="#ffe08a" stroke="#c8a040" stroke-width="2"/><circle cx="32" cy="26" r="6" fill="#fff6c8" opacity=".8"/><path d="M28 12 H36 V18 H28 Z" fill="#c8a040"/>`,
  emergency_ledger: `<rect x="14" y="10" width="36" height="44" rx="3" fill="#e8d4a8" stroke="#8a6a3a" stroke-width="2"/><path d="M20 20 H44 M20 28 H40 M20 36 H42 M20 44 H36" stroke="#8a6a3a" stroke-width="2"/><circle cx="44" cy="48" r="6" fill="#ffd45c"/>`,
  crossbow: `<rect x="8" y="26" width="40" height="12" rx="2" fill="#8ec8ff" stroke="#3a5a7a"/><path d="M48 20 L60 32 L48 44 Z" fill="#cfe8ff" stroke="#3a5a7a"/><circle cx="18" cy="22" r="3" fill="#ffd45c"/><circle cx="28" cy="20" r="2.5" fill="#ff9a6b"/>`,
  chain_hammer: `<circle cx="44" cy="22" r="12" fill="#c9a06b" stroke="#5a4020" stroke-width="2"/><rect x="10" y="28" width="28" height="8" rx="3" fill="#8a6a3a"/><path d="M38 28 L44 22" stroke="#5a4020" stroke-width="3"/>`,
  warhammer: `<rect x="28" y="18" width="8" height="36" fill="#a09080" stroke="#4a4038"/><rect x="14" y="10" width="36" height="16" rx="2" fill="#b0a090" stroke="#4a4038" stroke-width="2"/>`,
  ice_crystal: `<path d="M32 6 L44 32 L32 58 L20 32 Z" fill="#a8e8ff" stroke="#4a8aaa" stroke-width="2"/><path d="M20 32 H44 M32 6 V58" stroke="#dff6ff" stroke-width="1.5"/>`,
  war_banner: `<rect x="14" y="8" width="6" height="48" fill="#8a6a3a"/><path d="M20 10 H48 L40 22 L48 34 H20 Z" fill="#e8b060" stroke="#8a5010" stroke-width="2"/>`,
  burden: `<rect x="18" y="14" width="28" height="36" rx="3" fill="#6a5060" stroke="#c8a0b0" stroke-width="2"/><path d="M24 24 H40 M24 32 H36 M24 40 H38" stroke="#c8a0b0" stroke-width="2"/>`,
  poison_needle: `<g transform="rotate(-45 32 32)"><rect x="30" y="8" width="4" height="36" fill="#b8e080" stroke="#4a6a2a"/><path d="M28 8 L36 8 L32 2 Z" fill="#d0f0a0"/><rect x="24" y="44" width="16" height="6" rx="2" fill="#5a8a3a"/><circle cx="40" cy="20" r="4" fill="#7dff9a" opacity=".7"/></g>`,
};
/** 手绘装备图标（统一画风，128px 透明 PNG，public/art/items/<kind>.png）；SVG 仅作缺图回退 */
const PAINTED: ReadonlySet<ItemKind> = new Set<ItemKind>([
  'dagger', 'greatsword', 'shield', 'potion', 'ruby', 'moneybag', 'spear', 'compass', 'firework_crossbow',
  'fold_wall', 'travel_lamp', 'emergency_ledger', 'poison_needle', 'crossbow', 'chain_hammer', 'warhammer', 'ice_crystal', 'war_banner',
]);
function svgIcon(kind: ItemKind): string {
  return `<svg viewBox="0 0 64 64" class="icon" aria-hidden="true">${S[kind] ?? ''}</svg>`;
}
export function iconSvg(kind: ItemKind): string {
  if (!PAINTED.has(kind)) return svgIcon(kind);
  const fb = svgIcon(kind).replace(/"/g, '&quot;');
  return `<img src="${webAsset(`art/items/${kind}.png`)}" class="icon" alt="" aria-hidden="true" draggable="false" data-fb="${fb}" onerror="this.outerHTML=this.dataset.fb">`;
}
