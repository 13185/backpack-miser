/**
 * V3 §08 正式剧情文本：章节开场 / Boss 前后 / 每关一句 / 职业语气 / 支线回收 / 结局变体。
 * 主线信息全部挂在必经节点；跳过文字不跳过选择。
 */
import type { HeroClass } from '../../models/types';
import { withBossElement } from '../v4/bosses';

export type EndingId = 'break_bond' | 'public_ledger' | 'takeover';
export type StoryTone = HeroClass; // merchant | guard | ranger

/** 字数校验（中文按字符） */
export function charLen(s: string): number { return [...s].length; }

export interface ChapterStory {
  id: string;
  title: string;
  goal: string;
  /** 60–120 字；可按职业取变体 */
  intro: string;
  introsByClass?: Partial<Record<StoryTone, string>>;
  progress: string;
  outcome: string;
  bossPre: string;
  bossPost: string;
  bossPreByClass?: Partial<Record<StoryTone, string>>;
  bossPostByClass?: Partial<Record<StoryTone, string>>;
}

export const CHAPTER_STORIES: Record<number, ChapterStory> = {
  1: {
    id: 'ch1_intro', title: '贪婪矿洞',
    goal: '护送救命物资穿过矿洞，弄清“欠款”从何而来。',
    intro: '矿灯还亮着，账本已经比命更重。你们护送的救命物资，在第一道关卡就被写成了“欠款”。灯火摇晃处，有人低声说：黄金心脏还在更深处跳动，每一笔利息都从活人的明天里扣。',
    introsByClass: {
      merchant: '矿灯还亮着，算盘比剑先响。你们护送的救命物资，在第一道关卡就被写成了“欠款”。作为走货的人，你认得这笔账的气味——不是税，是预售明天。',
      guard: '矿灯还亮着，盾面映着欠条。你们护送的救命物资，在第一道关卡就被写成了“欠款”。旧命令墨迹未干，你却清楚：护的是人，不是利息。',
      ranger: '矿灯还亮着，脚印比路牌更诚实。你们护送的救命物资，在第一道关卡就被写成了“欠款”。你沿矿脉往下听——黄金心脏的跳动，远得像另一场风暴。',
    },
    progress: '沿矿道下行，宝箱怪守住出口。',
    outcome: '宝箱裂开，露出通往牢城的铁轨。债契印章尚热。',
    bossPre: '黄金宝箱怪堵住矿道出口。它不吃金币，只吃你们还没签下的明天。战前看清暴怒阈值，别被金光晃晕。',
    bossPost: '货……都在这里。那个带路的姑娘……被押进牢城了……箱盖再也合不上。',
  },
  2: {
    id: 'ch2_intro', title: '铁锈牢城',
    goal: '穿过牢城，救出被写成“货物”的人，摸清看守的命令来源。',
    intro: '铁门落下不是为了关怪物，是为了关还不起税的人。守卫的旧命令，墨迹未干，写着把活人登记成抵押物。锈水滴在锁上，像一笔笔利息。你们必须在命令被执行完之前走到另一头。',
    introsByClass: {
      merchant: '铁门落下。名单上的名字被标成“可周转货物”。你咽下骂人的话——先记账，再救人，顺序错了会两头空。',
      guard: '铁门落下。旧命令要你把人押走；你把盾横在名单前。护住的是人，命令可以稍后撕掉。',
      ranger: '铁门落下。通风口里有人轻咳。你记下三条逃生路线，再决定哪一把锁先撬。',
    },
    progress: '牢城通道狭窄，铸铁看守堵住中央厅。',
    outcome: '看守倒下，露米获救；更深处的巢穴气味渗出。',
    bossPre: '铸铁看守踏出中央厅。护甲厚重，每第三次攻击是蓄力重击——破绽就在重击之后那两秒。',
    bossPost: '名单上写着欠税……我只负责关门。可那些人，明明已经交过钱……',
  },
  3: {
    id: 'ch3_intro', title: '幽毒巢穴',
    goal: '取回被改道的药材样本，弄清毒与债如何互相喂养。',
    intro: '药被改道，毒却留下。有人靠别人的明天续命，有人在墨水里写下下一笔债。蛛网粘着空药瓶，瓶底印着王库的火漆。你们进来不是猎奇，是要把样本带给还能救人的人。',
    progress: '巢穴深处，蛛后孵化着下一轮“抵押品”。',
    outcome: '样本到手。工坊的炉火气味开始出现在风里。',
    bossPre: '孵化蛛后护着卵囊。第八秒与第二十秒会放出弱蛛——先清召唤，再打本体，别被缠住。',
    bossPost: '你们送来的药……他们拿去养墨了。王库里的账，是活的……纹路一盏盏灭掉。',
  },
  4: {
    id: 'ch4_intro', title: '黄金王库',
    goal: '冲进王库，揭开税金领主只是收税站的真相。',
    intro: '王库金光刺眼。你们以为终点在此——税金领主却只是更深处的收税站。金砖垒成墙，墙后管道通向港口、工坊与圣堂。打穿这里，旅程不会结束，只会看见管道的下一截。',
    progress: '账房、金库、领主宝座依次打开。',
    outcome: '王冠碎裂，管道显形；金冠背后还有心脏。',
    bossPre: '税金领主端坐宝座。生命跌破七成与三成半时会叠护盾，第四击是蓄力重击。别被金光晃花。',
    bossPost: '你以为……我是收钱的人？我也只是账上的一个名字。去商港……船还没走。',
  },
  5: {
    id: 'ch5_intro', title: '沉没商港',
    goal: '在潮汐里夺回证据与商队路线，学会符文改写旧装备。',
    intro: '潮水吞掉码头，也吞掉证据。债金币从这里装船运走；符文能改写旧装备，却改不掉海上的账。露米指着雾里的灯塔：商队还在下一条水道，选错路线就会变成下一船“货物”。',
    progress: '潮甲与蓄力在港口交错出现；船长守在雾心。',
    outcome: '船长沉入浪里。救援或证据的选择开始回收。',
    bossPre: '盐雾船长踏着潮甲上来。八秒一轮潮汐，第三次攻击是一点六倍重击。看清潮汐条再出手。',
    bossPost: '我运的从来不只是金币……最早的契约，在镜砂里。拿着印记，去找。',
  },
  6: {
    id: 'ch6_intro', title: '镜砂遗迹',
    goal: '在会回声的沙子里核对账本，让两份相同的名字只留下该留下的。',
    intro: '沙子会回声，账本会复制。两份相同的名字里，总有一份要被抹去。审计官把回响当成审判：你打出的每一击，沙地都会晚半拍还回来。带上已取得的证据，才能在镜子里认出真伪。',
    progress: '哨兵与弩手教学回响；审计官把规则推到极限。',
    outcome: '镜子碎裂，账本真伪可辨；工坊的烟尘压过来。',
    bossPre: '镜砂审计官抬起双镜。每第三次攻击后追加半额回响；半血时会获得护盾。死亡即取消回响。',
    bossPost: '副本可以撕掉……原契却一直生效。工坊每铸一枚金币，就有人多欠一天。',
  },
  7: {
    id: 'ch7_intro', title: '灰烬工坊',
    goal: '决定是否援助停炉，打断把明天熔成金币的订单。',
    intro: '炉火不熄，是因为有人的明天还在被熔成金币。旧订单上的断臂仍在催货。老铆守在闸门边：停炉需要材料，硬拆会炸掉半座工坊。你们的钱袋和良心，都要在熔炉旁过一遍秤。',
    progress: '过热与护甲归零窗口交替出现；巨像是最终考题。',
    outcome: '炉火按你们的选择熄灭或炸裂；圣堂的静默已在前方。',
    bossPre: '熔炉巨像撑起炉门。基础护甲五，三次普攻后一点八倍过热击，随后护甲归零三秒。残血时过热更狠。',
    bossPost: '铸造……已停止。债契仍存于圣堂。权限钥匙……交接。炉膛黑了下去。',
  },
  8: {
    id: 'ch8_intro', title: '静默圣堂',
    goal: '在不许愈合的誓言里，带走签名或名单，逼近债契保管室。',
    intro: '誓言无声，伤不许愈。债契保管室里，活人的签名比神像更整齐。祝祷者给同伴加盾，典狱长用沉默执行利息。这里没有布道，只有一份份尚未到期的明天，被钉在墙上等候征收。',
    progress: '祝祷与蓄力逼你们做目标选择；保管室的门在最后打开。',
    outcome: '典狱长倒下。证据与救援的取舍写入终局选项。',
    bossPre: '缄默典狱长与一名弱祝祷者同时出现。祝祷者占两成生命预算；典狱长第四击蓄力。先拆辅助，或用范围压过去。',
    bossPost: '我们守着契约……却忘了签名的人还活着。去王庭。有人还在替所有人续约。',
  },
  9: {
    id: 'ch9_intro', title: '逆流王庭',
    goal: '收束救援、证据与NPC线，在摄政王面前确认最终处置原则。',
    intro: '摄政王审判的不是罪，是利息。货物被“归还”，明天却被留下。王庭回响卫重复你们听过的规则，却把护盾与回响叠得更狠。第45关必须选定断契、公账或接管——选定后不能无代价反悔。',
    progress: '熟悉机制两两组合；摄政王是债契的代言人。',
    outcome: '原则已定。通往黄金心脏的门向外打开。',
    bossPre: '债契摄政王展开卷宗。基础护甲四，第四击后四成回响；六成与三成生命时各获七十护盾。稳住输出，别被利息拖死。',
    bossPost: '毁掉它，还是成为下一个掌管它的人？进去吧。别到最后，才决定自己为何而来。',
  },
  10: {
    id: 'ch10_intro', title: '黄金心脏',
    goal: '完成债契拆解，击败黄金心脏，按有效选择结算结局。',
    intro: '旧矿灯再亮。铁门终于向外开——心脏仍在跳，等待你们最后一笔追索，或最后一次放下。三阶段规则已在战前写明：重击、回响、过热依次上场，换阶段给盾，不清毒不回血。带上整条路的选择，去结束循环。',
    progress: '重访熟悉考题；第49关最后整备；第50关一战收束。',
    outcome: '心脏停跳或改律。结局按断契／公账／接管与支线结果展开。',
    bossPre: '黄金心脏显露三层律动。七成换回响，三成半换过热；每阶段只保留当前技能。活着走出这里，才算把选择写进世界。',
    bossPost: '契约……失去执行者。此后的明天……由谁书写？金线从核心上脱落。',
  },
};

/** 兼容旧导入名 */
export const CHAPTER_INTROS: Record<number, { id: string; title: string; body: string }> =
  Object.fromEntries(Object.entries(CHAPTER_STORIES).map(([k, v]) => [k, { id: v.id, title: v.title, body: v.intro }]));

export const MID_ACT_STORY = {
  id: 'mid_act_20',
  title: '金冠背后',
  body: '王冠碎裂的瞬间，你们看见更深处的管道：王库只是收税站，黄金心脏还在跳动。旅程没有结束——港口、镜砂、工坊与圣堂，都还挂在同一条债上。',
};

/** 每关一句（8–24 字） */
export const LEVEL_LINES: Record<number, string> = {
  1: '矿灯摇晃，欠条比路更亮。',
  2: '蝙蝠掠过，像催债的催单。',
  3: '骨甲发出利息的轻响。',
  4: '物资袋角被盖上火漆。',
  5: '宝箱怪堵住出口，笑得很金。',
  6: '铁门名单把人写成货物。',
  7: '锈水滴在未执行的命令上。',
  8: '侧室传来被捂住的咳嗽。',
  9: '账页边角露出异常墨迹。',
  10: '露米跌出铁室，仍握着半页单。',
  11: '空药瓶印着王库火漆。',
  12: '蛛丝粘住未送达的药单。',
  13: '育母的粮仓里堆着明天。',
  14: '毒雾里仍有人在记账。',
  15: '蛛后倒下，样本终于到手。',
  16: '金砖墙后传来管道轰鸣。',
  17: '账房的算盘比剑更快。',
  18: '金库门缝漏出利息的光。',
  19: '原始账页压在机关下面。',
  20: '领主宝座只是更深处的站台。',
  21: '潮声里，符文第一次改写旧刃。',
  22: '潮甲蟹随涨落切换护甲。',
  23: '水道分叉：救人，或抢清单。',
  24: '水线以下，先前选择开始回声。',
  25: '盐雾船长踏潮而来。',
  26: '沙子复述你刚才的一击。',
  27: '双影在镜面上对质。',
  28: '两份同名账，只留一份真。',
  29: '回响倒计时写在沙上。',
  30: '审计官的镜子照见证据真伪。',
  31: '炉烟解释：订单要的是断臂。',
  32: '过热的锤声像催货锣。',
  33: '监造的窗口：护甲归零三秒。',
  34: '熔炉旁，材料或硬拆二选一。',
  35: '巨像撑起炉门，停炉在此一战。',
  36: '圣堂禁止愈合，专精写下新律。',
  37: '祝祷者给同伴盖上薄盾。',
  38: '押送名单墨迹未干。',
  39: '签名与名单，只能带走一样。',
  40: '典狱长与祝祷者同时现身。',
  41: '王庭回响卫叠起旧课。',
  42: '归还的货物，兑现旧承诺。',
  43: '追债骑士不反弹，只加压。',
  44: '原则将定，反悔要付代价。',
  45: '摄政王展开卷宗，请选结局。',
  46: '熟悉的考题再次排成队。',
  47: '核心铸兵沿用炉甲旧规。',
  48: '最后审计官亮出阶段盾。',
  49: '放下与带走：最后一次整备。',
  50: '黄金心脏等待最终记账。',
};

export interface EndingDef {
  id: EndingId;
  title: string;
  summary: string;
  /** 第45关说明条件 */
  conditionHint: string;
  /** 基础终章；支线追加见 resolveEndingFinale */
  finale: string;
}

export const ENDING_CHOICES: Record<EndingId, EndingDef> = {
  break_bond: {
    id: 'break_bond', title: '断契',
    summary: '撕毁债契，让循环停转——也承受一夜之间的崩塌。',
    conditionHint: '无额外条件。财富归还画面取决于救援与停炉线。',
    finale: '你们斩断契约。金币不再生长，地牢短暂陷入黑暗。有人得救，有人失去依靠。但至少，明天不再被预售。',
  },
  public_ledger: {
    id: 'public_ledger', title: '公账',
    summary: '公开账本，把征收变成可审计的共有规则。',
    conditionHint: '需要证据≥2。缺证据时本选项禁用，并提前显示原因。',
    finale: '债契被钉在广场上。黄金心脏仍跳，却第一次接受监督。征税收税，必须见光。',
  },
  takeover: {
    id: 'takeover', title: '接管',
    summary: '握住心脏，用你们的规则重新征收——风险自担。',
    conditionHint: '无额外条件。结局呈现管理风险，不是完美结局。',
    finale: '你们坐上旧王座。心脏听从新主人，循环依旧。你们发誓只征收该征收的——誓言会不会也变成下一笔债，只有以后知道。',
  },
};

export const ENDING_IDS = Object.keys(ENDING_CHOICES) as EndingId[];

export interface EndingContext {
  ending: EndingId;
  heroClass?: StoryTone;
  questStates?: Record<string, string>;
  npcStates?: Record<string, string>;
}

/** 按 endingChoice + 支线结果拼结局正文 */
export function resolveEndingFinale(ctx: EndingContext): string {
  const base = ENDING_CHOICES[ctx.ending].finale;
  const q = ctx.questStates ?? {};
  const parts: string[] = [base];
  const rescue = q.rescue ?? 'none';
  const forge = q.forge ?? 'none';
  const evidence = Number(q.ledgerEvidence ?? '0') || 0;

  if (rescue === 'protected' || rescue === 'saved_late') {
    parts.push(rescue === 'protected'
      ? '商队在灯火里靠岸，露米把剩下的药箱分给还活着的人。'
      : '延误的商队终于被救回，露米的笑里仍有潮水的咸。');
  } else if (rescue === 'lumi_saved' || rescue === 'delayed') {
    parts.push('露米活着，但商队只剩散落的箱子与一张未完成的名单。');
  } else {
    parts.push('商队的灯没有出现在结局的岸边——有些债，救人比记账更早到期。');
  }

  if (forge === 'stopped_clean' || forge === 'helped') {
    parts.push('灰烬工坊的炉门关死，老铆把未熔的订单叠成纸船，说以后只打农具。');
  } else if (forge === 'stopped_rough') {
    parts.push('工坊炸开半边墙。老铆活着，却不再看向熔炉的方向。');
  } else {
    parts.push('炉火是否真正熄灭，故事没有给你们一张收据。');
  }

  if (ctx.ending === 'public_ledger') {
    parts.push(evidence >= 2
      ? `广场上钉着${evidence}页对得上的原始账，审计第一次有据可依。`
      : '账册公开了，可证据不足的页角仍在风里翻——监督注定跛行。');
  } else if (ctx.ending === 'break_bond') {
    parts.push(evidence >= 1
      ? '被撕碎的债契残页里，仍能辨认你们一路捡起的墨迹。'
      : '契约碎成夜色。没有足够的纸，去证明谁曾被怎样书写。');
  } else {
    parts.push('新规则写在旧王座上。救援与停炉的余温，是你们仅有的提醒。');
  }

  if (ctx.heroClass === 'merchant') parts.push('你把算盘合上：有些利润，不入账才算赚到。');
  else if (ctx.heroClass === 'guard') parts.push('你放下盾，第一次不是为了挡刀，是为了让路。');
  else if (ctx.heroClass === 'ranger') parts.push('你收起脚印图：有些路，走完就可以不再回头。');

  return parts.join('');
}

/** 解析任意剧情 id 的标题与正文（供 UI / 日志） */
export function resolveStoryText(
  id: string,
  opts?: { heroClass?: StoryTone; endingCtx?: EndingContext },
): { title: string; body: string } {
  if (id === MID_ACT_STORY.id) return { title: MID_ACT_STORY.title, body: MID_ACT_STORY.body };
  if (id === 'ending_brief_45') return { title: '终局原则预告', body: ENDING_BRIEF_BEFORE_45 };
  if (id.startsWith('ending_')) {
    const eid = id.slice('ending_'.length) as EndingId;
    const e = ENDING_CHOICES[eid];
    if (!e) return { title: '结局', body: id };
    const body = opts?.endingCtx
      ? resolveEndingFinale({ ...opts.endingCtx, ending: eid })
      : e.finale;
    return { title: e.title, body };
  }
  if (id.startsWith('boss_pre_')) {
    const ch = Number(id.slice('boss_pre_'.length));
    const s = CHAPTER_STORIES[ch];
    if (!s) return { title: '战前', body: id };
    const body = (opts?.heroClass && s.bossPreByClass?.[opts.heroClass]) || s.bossPre;
    return { title: withBossElement(ch * 5, `${s.title}·战前`), body };
  }
  if (id.startsWith('boss_post_')) {
    const ch = Number(id.slice('boss_post_'.length));
    const s = CHAPTER_STORIES[ch];
    if (!s) return { title: '战后', body: id };
    const body = (opts?.heroClass && s.bossPostByClass?.[opts.heroClass]) || s.bossPost;
    return { title: withBossElement(ch * 5, `${s.title}·战后`), body };
  }
  if (id.startsWith('lv_')) {
    const lv = Number(id.slice(3));
    return { title: `第${lv}关`, body: LEVEL_LINES[lv] ?? '' };
  }
  const ch = Object.values(CHAPTER_STORIES).find(c => c.id === id);
  if (ch) {
    const body = (opts?.heroClass && ch.introsByClass?.[opts.heroClass]) || ch.intro;
    return { title: ch.title, body };
  }
  return { title: '剧情', body: id };
}

/** 第45关前可展示的结局条件说明 */
export const ENDING_BRIEF_BEFORE_45 =
  '三种终局方案均须挑战第50关：断契——撕毁循环，归还画面看救援与停炉；公账——需证据≥2，缺则禁用并提前提示；接管——握住心脏继续管理，风险自担。第45关选定后不可无代价更改。';
