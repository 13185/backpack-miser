# 美术接入说明（art-v1）

## 规范与清单
- `art/ART_BIBLE.md` — 画风、色板、角色锁定、锚点、禁止风格
- `art/ASSET_MANIFEST.json` — 全量素材状态（ready / pending）
- 参考九宫格：`art/refs/{merchant,guard,ranger}-9grid.png`

## 主角规格
- Master：`art/characters/<class>/keyframes/<class>_<state>.png`，1024×1024，真 Alpha，脚底锚点 **(512, 928)**
- Runtime：`public/art/characters/<class>/<class>_<state>_512.png`（及同目录图集）
- 状态：idle / move / attack / defend / hurt / drink / special / victory / defeat
- **诚实说明：每状态目前仅 1 张关键帧（HOLD），不是连续动画。** 目标帧数见 ART_BIBLE；需 GenerateImage 按参考图补中间帧。
- 商旅防御格：已用参考九宫格姿势接入；圣经要求的「修改版防御」标记为 `ready_keyframe_needs_regen`

## 运行时
- `src/art/HeroSprite.ts` — 状态机驱动换帧；伤害不由动画命中次数决定
- `src/scenes/AnimPreviewScene.ts` — `?debugArt=1` 或标题「美术预览」；正式流程默认不进
- `src/scenes/BattleScene.ts` — 战斗使用英雄精灵 + 第一章背景 + 史莱姆图；其余怪仍程序绘制
- Phaser origin = `(0.5, 928/1024)`

## V2 脚手架（默认关）
- `src/config/v2/*` — 20关预算、12装备、24遗物、三职业
- 开启：`?v2=1` 或 `localStorage.bm_v2=1`（本局玩法仍走 V1 闭环，避免破坏存档）

## 命令
```bash
npm test
npm run build
npm run preview
```

## 截图
见 `art/screenshots/`
