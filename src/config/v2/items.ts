/** V2 12种装备配置骨架（数值来自规格；战斗接入前仅作数据源） */
export const V2_ITEMS = {
  W01: { id: 'W01', name: '匕首', size: [1, 2], category: 'weapon', interval: 0.8, effect: [5, 9, 16], buy: 8 },
  W02: { id: 'W02', name: '大剑', size: [1, 3], category: 'weapon', interval: 2.0, effect: [14, 25, 44], buy: 12 },
  D01: { id: 'D01', name: '盾牌', size: [2, 2], category: 'defense', interval: 3.0, effect: [7, 12, 20], buy: 10 },
  H01: { id: 'H01', name: '药水', size: [1, 1], category: 'heal', interval: 0, effect: [18, 30, 48], buy: 7 },
  S01: { id: 'S01', name: '红宝石', size: [1, 1], category: 'support', interval: 0, effect: [15, 25, 40], buy: 10 },
  E01: { id: 'E01', name: '钱袋', size: [1, 1], category: 'econ', interval: 0, effect: [4, 8, 13], buy: 12 },
  W03: { id: 'W03', name: '连弩', size: [2, 2], category: 'weapon', interval: 1.6, effect: [4, 7, 12], buy: 14, note: '连射2箭' },
  W04: { id: 'W04', name: '链锤', size: [2, 2], category: 'weapon', interval: 2.4, effect: [12, 22, 38], buy: 14, note: '溅射50%' },
  W05: { id: 'W05', name: '毒针', size: [1, 2], category: 'weapon', interval: 1.3, effect: [3, 5, 8], buy: 12, note: '附毒2/3/5' },
  W06: { id: 'W06', name: '战锤', size: [2, 3], category: 'weapon', interval: 3.0, effect: [26, 46, 80], buy: 18, note: '忽略50%护甲' },
  S02: { id: 'S02', name: '冰晶', size: [1, 2], category: 'control', interval: 6.0, effect: [20, 25, 30], buy: 12, note: '全体减速%' },
  S03: { id: 'S03', name: '战旗', size: [1, 2], category: 'support', interval: 0, effect: [6, 10, 15], buy: 12, note: '邻接间隔缩短%' },
} as const;
