export type ItemKind =
  | 'dagger' | 'greatsword' | 'shield' | 'potion' | 'ruby' | 'moneybag'
  | 'spear' | 'compass' | 'firework_crossbow' | 'fold_wall' | 'travel_lamp'
  | 'emergency_ledger' | 'poison_needle'
  | 'crossbow' | 'chain_hammer' | 'warhammer' | 'ice_crystal' | 'war_banner'
  | 'burden' | 'luck_charm';
export type Level = 1 | 2 | 3 | 4 | 5;
/** 装备实例：位于背包时有 x,y；临时区时为 null */
export interface ItemInstance {
  id: string;
  kind: ItemKind;
  level: Level;
  x: number | null;
  y: number | null;
  rotated: boolean;
  /** 负担物：商店价额外% */
  burdenShopPct?: number;
  /** 负担物：最大生命降低% */
  burdenMaxHpPct?: number;
}
export interface ShopSlot { kind: ItemKind; level: Level; bought: boolean; }
export type Phase = 'prep' | 'battle' | 'loot' | 'camp' | 'victory' | 'defeat' | 'event' | 'route';
export type CampaignMode = 'story' | 'ironman';
export interface RunStats {
  kills: number;
  goldEarned: number;
  contribution: Record<string, number>;
}
export interface LastBattle {
  level: number;
  won: boolean;
  reason: string;
  time: number;
  weaponDamage: { id: string; label: string; value: number }[];
  shieldAbsorb: number;
  potionHeal: number;
  bagGold: number;
  baseGold: number;
}
/** 已装备或暂存的符文；itemId=null 表示未附着（不生效） */
export interface RuneInstance {
  runeId: string;
  itemId: string | null;
}
export interface ChapterCheckpoint {
  level: number;
  chapter: number;
  hp: number;
  maxHp: number;
  gold: number;
  rows: number;
  cols: number;
  expansions: number;
  items: ItemInstance[];
  nextId: number;
  rng: number;
  shop: { level: number; slots: ShopSlot[]; refreshes: number };
  stats: RunStats;
  storyFlags: Record<string, boolean>;
  questStates: Record<string, string>;
  npcStates: Record<string, string>;
  runes: RuneInstance[];
  doctrine: string | null;
  seenDialogue: string[];
  pendingRuneChoices: string[] | null;
  pendingDoctrineChoices: string[] | null;
  endingChoice: string | null;
  relics: string[];
  pendingRelicChoices: string[] | null;
  campServiceUsed: boolean;
  pendingCheckpointAfterCamp: boolean;
  battleToken: number;
  settledToken: number;
  /** 完整状态快照（JSON），恢复以此为准 */
  state?: string;
  /** 援助整备起点（首次援助后生成，重复援助复用，不叠加） */
  assistState?: string;
}
export interface GameState {
  version: number;
  phase: Phase;
  level: number;
  hp: number;
  maxHp: number;
  gold: number;
  rows: number;
  cols: number;
  expansions: number;
  /** 刚解锁下一档背包，界面提示一次后清除 */
  pendingBagToast?: number;
  /** 锻造专用随机流，与掉落、商店分开 */
  forgeRng?: number;
  forgeVouchers?: number;
  /** 已发放的锻造券关卡：12 / 25 / 35 */
  forgeVoucherGranted?: number[];
  /** 已经做过首领整备的关卡 */
  bossPrep?: number[];
  /** 附录 A10 旧档补偿只做一次 */
  a10Compensated?: boolean;
  items: ItemInstance[];
  nextId: number;
  rng: number;
  loot: { level: number; options: { kind: ItemKind; level: Level }[]; claimed: boolean } | null;
  shop: { level: number; slots: ShopSlot[]; refreshes: number };
  battleToken: number;
  settledToken: number;
  stats: RunStats;
  last: LastBattle | null;
  campaignLength: number;
  campaignVersion: number;
  mode: CampaignMode;
  currentChapter: number;
  attemptId: number;
  assistanceUsed: boolean;
  retryCount: number;
  storyFlags: Record<string, boolean>;
  questStates: Record<string, string>;
  npcStates: Record<string, string>;
  endingChoice: string | null;
  runes: RuneInstance[];
  doctrine: string | null;
  seenDialogue: string[];
  chapterCheckpoint: ChapterCheckpoint | null;
  /** 符文三选一候选（预生成）；选完清空 */
  pendingRuneChoices: string[] | null;
  /** 专精三选一候选 */
  pendingDoctrineChoices: string[] | null;
  /** 待展示剧情 id（UI 消费后写入 seenDialogue） */
  pendingStoryId: string | null;
  relics: string[];
  pendingRelicChoices: string[] | null;
  /** 本章营地是否已用主服务（休息/锻造） */
  campServiceUsed: boolean;
  /** 刚打完的 Boss 关，营地结束后写检查点 */
  pendingCheckpointAfterCamp: boolean;
  heroClass: HeroClass;
  campKind: CampKind | null;
  pendingChoice: PendingChoice | null;
  /** 第40关后营地的专精免费重选候选（预生成，一次） */
  doctrineRerollChoices: string[] | null;
  assist: AssistState | null;
  completion: CompletionRecord | null;
  /** 剧情日志（已见主线/支线 id 顺序） */
  storyLog: string[];
  /** 本关是否走精英（第3/8/…/48） */
  eliteActive: boolean;
  /** 进入精英层前的路线选择 */
  pendingRoute: boolean;
  /** 待处理随机事件 */
  pendingEventId: string | null;
  /** 本局已见事件（不重复） */
  seenEvents: string[];
  /** 事件升级待选装备 id */
  pendingUpgrade: { fromLevel: 1 | 2 } | null;
  /** 本局固定最大生命增加累计（上限20） */
  fixedMaxHpBonus: number;
}
export type HeroClass = 'merchant' | 'guard' | 'ranger';
export type CampKind = 'chapter' | 'final';
/** 必经剧情选择（支线代价）；选完清空 */
export interface PendingChoice { id: string; options: string[] }
/** 援助整备：同一检查点只生成一次候选 */
export interface AssistState { level: number; attempt: number; options: { kind: ItemKind; level: Level }[]; used: boolean }
export interface CompletionRecord { type: 'pure' | 'assisted' | 'ironman'; ending: string | null; retries: number; level: number }
export interface Settings { sound: boolean; tutorialDone: boolean; openingSeen?: boolean; voice: number; }
