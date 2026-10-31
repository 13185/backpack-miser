export type MonsterKind =
  | 'slime' | 'bat' | 'skeleton' | 'brute' | 'mimic' | 'rats'
  | 'beetle' | 'archer' | 'spider' | 'miner' | 'vault_guard' | 'hound'
  | 'harbor_patrol' | 'tide_crab' | 'salt_captain' | 'smuggler'
  | 'mirror_auditor' | 'mirror_sentinel' | 'sandmirror_xbow'
  | 'ash_sapper' | 'furnace_guard'
  | 'iron_warden' | 'spider_queen' | 'tax_lord'
  | 'furnace_colossus' | 'silence_warden' | 'debt_regent' | 'golden_heart'
  | 'priest' | 'chanter' | 'amulet_attendant' | 'echo_guard' | 'core_soldier' | 'lamp_priest'
  | 'elite_foreman' | 'elite_dual_guard' | 'elite_brood' | 'elite_executioner'
  | 'elite_smuggler_deacon' | 'elite_twin_auditors' | 'elite_forge_overseer'
  | 'elite_sealing_friar' | 'elite_debt_knight' | 'elite_last_auditor'
  | 'loot_goblin';

export const MONSTER_BASE: Record<MonsterKind, { name: string; ability: string }> = {
  slime: { name: '史莱姆', ability: '凝胶再生：周期性回复少量生命。' },
  bat: { name: '洞穴蝙蝠', ability: '俯冲重击：每4击短蓄力1.6倍。' },
  skeleton: { name: '骷髅卫士', ability: '骨甲：每次受到的伤害减少固定值（至少造成1点）。' },
  brute: { name: '地牢蛮兵', ability: '重砸：每3击1.7倍蓄力。' },
  mimic: { name: '黄金宝箱怪', ability: '首领：每3击2.2倍撕咬蓄力；开场转盾；半血再盾；残血暴怒加速。' },
  rats: { name: '双生鼠群', ability: '双单位：两只各占50%生命预算，须全部击败。' },
  beetle: { name: '结晶甲虫', ability: '护甲2；开场甲壳护盾。' },
  archer: { name: '蓄力弓手', ability: '每第3次攻击为1.5倍重击，提前2秒蓄力。' },
  spider: { name: '孵化幼蛛', ability: '产卵：战斗中召唤幼蛛。' },
  miner: { name: '狂热矿工', ability: '重砸：每3击1.7倍蓄力。' },
  vault_guard: { name: '王库守卫', ability: '护甲3；开场甲壳护盾。' },
  hound: { name: '黄金猎犬', ability: '扑咬：每3击1.7倍蓄力。' },
  harbor_patrol: { name: '港口巡丁', ability: '巡丁蓄力：每4击1.5倍。' },
  tide_crab: { name: '潮甲蟹', ability: '潮汐周期：每8秒一轮，前4秒护甲+2，后4秒恢复基础护甲。' },
  salt_captain: { name: '盐雾船长', ability: '首领：潮汐护甲；每3击1.6倍重击。' },
  smuggler: { name: '走私弩手', ability: '每第3次攻击为1.5倍重击，提前2秒蓄力。' },
  mirror_auditor: { name: '镜砂审计官', ability: '首领：每2击后70%回响；65%/35%各获110盾。' },
  mirror_sentinel: { name: '镜砂哨兵', ability: '每第3次普通攻击后1.5秒追加50%回响。' },
  sandmirror_xbow: { name: '砂镜弩手', ability: '每第4次攻击后1秒追加35%回响。' },
  ash_sapper: { name: '灰烬工兵', ability: '每3次普攻后下一击×1.4过热，之后停手2秒。' },
  furnace_guard: { name: '炉甲守卫', ability: '护甲3；每第3次攻击后过热停手2秒且护甲归零。' },
  iron_warden: { name: '铸铁看守', ability: '首领：护甲5；每3击2倍重击（蓄力2秒），其后2秒护甲归零。' },
  spider_queen: { name: '孵化蛛后', ability: '首领：第8/20秒召唤弱蛛；死后停召。' },
  tax_lord: { name: '税金领主', ability: '首领：70%／35%各获60盾，仅一次；每4击1.5倍重击，提前3秒。' },
  furnace_colossus: { name: '熔炉巨像', ability: '首领：每2击后×2.2过热并停手；半血100盾；每4击1.9倍蓄力。' },
  silence_warden: { name: '缄默典狱长', ability: '首领：祝祷者占26%预算；55%/25%各获120盾；每3击1.9倍蓄力。' },
  debt_regent: { name: '债契摄政王', ability: '首领：护甲4；每3击后60%回响；三档阶段盾；每3击2.0倍蓄力。' },
  golden_heart: { name: '黄金心脏', ability: '三阶段。66%/33%无敌3秒，随后放大火；普攻可大暴击；换阶段各获90盾。' },
  priest: { name: '补给祭司', ability: '祝祷：周期性有限自盾。' },
  chanter: { name: '祝祷者', ability: '每7秒给主目标加有限护盾（单目标时自盾）。' },
  amulet_attendant: { name: '护符侍从', ability: '开战将自身10%生命转为护盾。' },
  echo_guard: { name: '王庭回响卫', ability: '护甲2；每第4次攻击后1.5秒产生35%回响。' },
  core_soldier: { name: '核心铸兵', ability: '护甲4；过热规则同炉甲守卫。' },
  lamp_priest: { name: '执灯祭司', ability: '每8秒自我治疗（预算3%近似为固定小额）。' },
  elite_foreman: { name: '矿洞监工', ability: '精英：生命+25%；轻蓄力重击。' },
  elite_dual_guard: { name: '铁甲双卫', ability: '精英双体：两名守卫各占50%预算，须全灭。' },
  elite_brood: { name: '剧毒育母', ability: '精英：周期性附毒压力（简化为更高攻速）。' },
  elite_executioner: { name: '王库执刑官', ability: '精英：重击频率更高。' },
  elite_smuggler_deacon: { name: '走私执事', ability: '精英：潮甲+重击两机制。' },
  elite_twin_auditors: { name: '双面稽核者', ability: '精英双体：共享回响规则，各占50%预算。' },
  elite_forge_overseer: { name: '锻债监造', ability: '精英：过热后3秒护甲归零窗口。' },
  elite_sealing_friar: { name: '封账修士', ability: '精英：主攻+弱祝祷者（25%预算）。' },
  elite_debt_knight: { name: '王庭追债骑士', ability: '精英：回响+有限护甲。' },
  elite_last_auditor: { name: '最后审计官', ability: '精英：蓄力重击+一次阶段护盾。' },
  loot_goblin: { name: '罗纹口袋哥布林', ability: '限时打宝。它不还手。时间到就逃走，不掉装备。' },
};

export const MONSTER_ART: Partial<Record<MonsterKind, { key: string; src: string }>> = {
  slime: { key: 'enemy_slime', src: 'art/enemies/N01_slime.png' },
  bat: { key: 'enemy_bat', src: 'art/enemies/N02_bat.png' },
  skeleton: { key: 'enemy_skeleton', src: 'art/enemies/N03_skeleton.png' },
  brute: { key: 'enemy_brute', src: 'art/enemies/N04_brute.png' },
  rats: { key: 'enemy_rats', src: 'art/enemies/N05_rats.png' },
  beetle: { key: 'enemy_beetle', src: 'art/enemies/N06_beetle.png' },
  archer: { key: 'enemy_archer', src: 'art/enemies/N07_archer.png' },
  priest: { key: 'enemy_priest', src: 'art/enemies/N08_priest.png' },
  spider: { key: 'enemy_spider', src: 'art/enemies/N09_spider.png' },
  miner: { key: 'enemy_miner', src: 'art/enemies/N10_miner.png' },
  vault_guard: { key: 'enemy_vault_guard', src: 'art/enemies/N11_vault_guard.png' },
  hound: { key: 'enemy_hound', src: 'art/enemies/N12_hound.png' },
  harbor_patrol: { key: 'enemy_harbor_patrol', src: 'art/enemies/N13_harbor_patrol.png' },
  tide_crab: { key: 'enemy_tide_crab', src: 'art/enemies/N14_tide_crab.png' },
  smuggler: { key: 'enemy_smuggler_xbow', src: 'art/enemies/N15_smuggler_xbow.png' },
  mirror_sentinel: { key: 'enemy_mirror_sentinel', src: 'art/enemies/N16_mirror_sentinel.png' },
  sandmirror_xbow: { key: 'enemy_sandmirror_xbow', src: 'art/enemies/N17_sandmirror_xbow.png' },
  ash_sapper: { key: 'enemy_ash_sapper', src: 'art/enemies/N18_ash_sapper.png' },
  furnace_guard: { key: 'enemy_furnace_guard', src: 'art/enemies/N19_furnace_guard.png' },
  chanter: { key: 'enemy_chanter', src: 'art/enemies/N20_chanter.png' },
  amulet_attendant: { key: 'enemy_amulet_attendant', src: 'art/enemies/N21_amulet_attendant.png' },
  echo_guard: { key: 'enemy_echo_guard', src: 'art/enemies/N22_echo_guard.png' },
  core_soldier: { key: 'enemy_core_soldier', src: 'art/enemies/N23_core_soldier.png' },
  lamp_priest: { key: 'enemy_lamp_priest', src: 'art/enemies/N24_lamp_priest.png' },
  mimic: { key: 'enemy_mimic', src: 'art/enemies/B05_mimic.png' },
  salt_captain: { key: 'enemy_salt_captain', src: 'art/enemies/B25_salt_captain.png' },
  mirror_auditor: { key: 'enemy_mirror_auditor', src: 'art/enemies/B30_mirror_auditor.png' },
  iron_warden: { key: 'enemy_iron_warden', src: 'art/enemies/B10_iron_warden.png' },
  spider_queen: { key: 'enemy_spider_queen', src: 'art/enemies/B15_spider_queen.png' },
  tax_lord: { key: 'enemy_tax_lord', src: 'art/enemies/B20_tax_lord.png' },
  furnace_colossus: { key: 'enemy_furnace_colossus', src: 'art/enemies/B35_furnace_colossus.png' },
  silence_warden: { key: 'enemy_silence_warden', src: 'art/enemies/B40_silent_warden.png' },
  debt_regent: { key: 'enemy_debt_regent', src: 'art/enemies/B45_debt_regent.png' },
  golden_heart: { key: 'enemy_golden_heart', src: 'art/enemies/B50_golden_heart.png' },
  elite_foreman: { key: 'enemy_e03', src: 'art/enemies/E03_foreman.png' },
  elite_dual_guard: { key: 'enemy_e08', src: 'art/enemies/E08_dual_guard.png' },
  elite_brood: { key: 'enemy_e13', src: 'art/enemies/E13_brood.png' },
  elite_executioner: { key: 'enemy_e18', src: 'art/enemies/E18_executioner.png' },
  elite_smuggler_deacon: { key: 'enemy_e23', src: 'art/enemies/E23_smuggler_deacon.png' },
  elite_twin_auditors: { key: 'enemy_e28', src: 'art/enemies/E28_twin_auditors.png' },
  elite_forge_overseer: { key: 'enemy_e33', src: 'art/enemies/E33_forge_overseer.png' },
  elite_sealing_friar: { key: 'enemy_e38', src: 'art/enemies/E38_sealing_friar.png' },
  elite_debt_knight: { key: 'enemy_e43', src: 'art/enemies/E43_debt_knight.png' },
  elite_last_auditor: { key: 'enemy_e48', src: 'art/enemies/E48_last_auditor.png' },
  loot_goblin: { key: 'enemy_loot_goblin', src: 'art/enemies/G_loot_goblin_idle.png' },
};

export const CHAPTER_BG: Record<number, { key: string; src: string }> = {
  1: { key: 'bg_ch1', src: 'art/backgrounds/chapter1_mine.png' },
  2: { key: 'bg_ch2', src: 'art/backgrounds/chapter2_prison.png' },
  3: { key: 'bg_ch3', src: 'art/backgrounds/chapter3_nest.png' },
  4: { key: 'bg_ch4', src: 'art/backgrounds/chapter4_vault.png' },
  5: { key: 'bg_ch5', src: 'art/backgrounds/chapter5_harbor.png' },
  6: { key: 'bg_ch6', src: 'art/backgrounds/chapter6_mirrorsand.png' },
  7: { key: 'bg_ch7', src: 'art/backgrounds/chapter7_ashforge.png' },
  8: { key: 'bg_ch8', src: 'art/backgrounds/chapter8_sanctum.png' },
  9: { key: 'bg_ch9', src: 'art/backgrounds/chapter9_court.png' },
  10: { key: 'bg_ch10', src: 'art/backgrounds/chapter10_heart.png' },
};

/** 双体精英 / 鼠群：战斗层拆分为真实多单位 */
export const DUAL_UNIT_KINDS: MonsterKind[] = ['rats', 'elite_dual_guard', 'elite_twin_auditors'];
