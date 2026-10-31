import { ITEM_KINDS } from '../config/items';
import { DOCTRINE_IDS, DOCTRINES } from '../config/v3/doctrines';
import { V3_RELICS, type RelicId } from '../config/v3/relics';
import { RUNE_IDS, RUNES } from '../config/v3/runes';
import { ARMOR_KINDS } from '../config/v4/armor';
import elementFrames from './elementFrames.json';

export const ASSET_VERSION = '3.9.0';

export type AssetStatus = 'verified' | 'wired' | 'fallback' | 'missing';

export interface AssetRecord {
  id: string;
  assetKey: string;
  type: 'item' | 'armor' | 'boss-pose' | 'vfx' | 'relic' | 'rune' | 'doctrine';
  path: string | null;
  version: string;
  status: AssetStatus;
  note: string;
}

const PAINTED_ITEMS = new Set([
  'dagger', 'greatsword', 'shield', 'potion', 'ruby', 'moneybag', 'spear', 'compass', 'firework_crossbow',
  'fold_wall', 'travel_lamp', 'emergency_ledger', 'poison_needle', 'crossbow', 'chain_hammer', 'warhammer',
  'ice_crystal', 'war_banner', 'luck_charm',
]);

const BOSSES: { id: string; file: string; poses?: Record<string, string> }[] = [
  { id: 'B05', file: 'B05_mimic' },
  { id: 'B10', file: 'B10_iron_warden' },
  { id: 'B15', file: 'B15_spider_queen' },
  { id: 'B20', file: 'B20_tax_lord' },
  { id: 'B25', file: 'B25_salt_captain' },
  { id: 'B30', file: 'B30_mirror_auditor' },
  { id: 'B35', file: 'B35_furnace_colossus', poses: {
    idle: 'B35_furnace_colossus',
    windup: 'B35_furnace_windup',
    attack: 'B35_furnace_attack',
    hurt: 'B35_furnace_hurt',
    defeat: 'B35_furnace_defeat',
  } },
  { id: 'B40', file: 'B40_silent_warden' },
  { id: 'B45', file: 'B45_debt_regent' },
  { id: 'B50', file: 'B50_golden_heart' },
];

const POSE_NAMES = ['idle', 'windup', 'attack', 'hurt', 'defeat'] as const;

function row(partial: Omit<AssetRecord, 'version'>): AssetRecord {
  return { ...partial, version: ASSET_VERSION };
}

export function registryRecords(): AssetRecord[] {
  const out: AssetRecord[] = [];
  for (const kind of ITEM_KINDS) {
    const armor = (ARMOR_KINDS as readonly string[]).includes(kind);
    if (armor) {
      out.push(row({
        id: kind, assetKey: `item.${kind}`, type: 'armor',
        path: `public/art/items/${kind}.png`, status: 'wired',
        note: '3.9.0 手绘透明图，结构彼此不同。小格辨识待实机看。',
      }));
    } else if (PAINTED_ITEMS.has(kind)) {
      out.push(row({
        id: kind, assetKey: `item.${kind}`, type: 'item',
        path: `public/art/items/${kind}.png`, status: 'verified',
        note: '沿用已上线的手绘图，本版没有重画。',
      }));
    } else {
      out.push(row({
        id: kind, assetKey: `item.${kind}`, type: 'item',
        path: null, status: 'fallback',
        note: '没有正式图，界面用 SVG 轮廓。',
      }));
    }
  }
  for (const boss of BOSSES) {
    for (const pose of POSE_NAMES) {
      const file = boss.poses?.[pose];
      out.push(row({
        id: `${boss.id}.${pose}`,
        assetKey: `boss.${boss.id}.${pose}`,
        type: 'boss-pose',
        path: file ? `public/art/enemies/${file}.png` : (pose === 'idle' ? `public/art/enemies/${boss.file}.png` : null),
        status: file || pose === 'idle' ? (boss.id === 'B35' && pose !== 'idle' ? 'wired' : 'verified') : 'missing',
        note: file || pose === 'idle'
          ? (boss.id === 'B35' && pose !== 'idle' ? '熔炉新姿态，战斗事件里切换。' : '原有单张立绘。')
          : '这一姿态还没有独立图，不会拿待机图复制充数。',
      }));
    }
  }
  for (const [el, pack] of Object.entries(elementFrames)) {
    out.push(row({
      id: pack.id,
      assetKey: pack.effectId,
      type: 'vfx',
      path: pack.frames[0]?.file ? `public/${pack.frames[0].file}` : null,
      status: pack.frames.length >= 4 ? 'wired' : 'missing',
      note: `${pack.frames.length} 帧，每帧 ${pack.frames[0]?.ms ?? 0}ms，锚点 ${pack.anchor.join(',')}，不循环。`,
    }));
  }
  for (const id of Object.keys(V3_RELICS) as RelicId[]) {
    out.push(row({
      id, assetKey: `relic.${id}`, type: 'relic', path: null, status: 'fallback',
      note: `${V3_RELICS[id].name} 用文字印，不是绘稿。`,
    }));
  }
  for (const id of RUNE_IDS) {
    out.push(row({
      id, assetKey: `rune.${id}`, type: 'rune', path: null, status: 'fallback',
      note: `${RUNES[id].name} 用文字印，不是绘稿。`,
    }));
  }
  for (const id of DOCTRINE_IDS) {
    out.push(row({
      id, assetKey: `doctrine.${id}`, type: 'doctrine', path: null, status: 'fallback',
      note: `${DOCTRINES[id].name} 用文字印，不是绘稿。`,
    }));
  }
  return out;
}
