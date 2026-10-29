# 音频

音乐和语音在 `public/audio/`（v1.1 音频包）。实现在 `src/ui/bgm.ts`、`src/ui/voice.ts` 和 `src/ui/audio.ts`。它们共用一个 `AudioContext`，第一次指针点击之后才创建，并播一段静音缓冲，用来解开 iOS 的音频锁。曲目按需 `fetch`，不打进 JS 包。标题画面在这次点击之后只拉标题曲，接着预取整理曲；其余曲目和语音在对应场面再拉，并预取下一首可能用到的。

能播 OGG Opus 的浏览器用 `.ogg`。Safari / iOS 的 `canPlayType('audio/ogg; codecs="opus"')` 为空，改用 `.m4a`。循环走 WebAudio：`decodeAudioData` 之后用 `AudioBufferSourceNode.loop`，`loopStart` / `loopEnd` 取音频包清单里的秒数，避免 AAC 用 `<audio loop>` 时的编码器留白接缝。换曲交叉淡化大约 0.8 秒。文件拉不下来或解码失败时，退回原来的 8 音合成循环（胜利 / 战败仍是四个短音）。

| 状态 | 文件 | 说明 |
|---|---|---|
| 标题 | `bgm_title` | 新 id。标题画面，解锁后才开始拉 |
| 整理 / 战斗 A / B / 精英 / 首领 / 最终首领 / 剧情 | 同名 `bgm_*` | `setBgm` 遇到同一个循环 id 不会再开一份 |
| 胜利 / 战败 | `bgm_win` / `bgm_lose` | 不循环，可以盖过当前循环 |

主音量增益 0.18，沿用原来的音乐电平。对白或剧情压低时收到 0.09，大约 −6 dB，两处同时发生也不再叠一次。语音走单独的增益（满刻度约 0.5，设置里的语音滑条再乘上去）。设置里的音效开关同时关掉音效、音乐和语音。切到后台时 `visibilitychange` 会 `suspend` 这个 `AudioContext`，回到前台再 `resume`。2 倍速只加大 `stepCombat` 的步长和 Phaser 的 `timeScale`，不改音乐的 `playbackRate`。

语音（Edge TTS，不是配音演员）对着字幕：

- 开场 `OPEN01` / `OPEN02`，以及按这一局职业的 `OPEN03`。换了职业会再放一次开场，好让这一句对上新人。这一幕至少停满原来的时长；句子更长就等到说完再自动翻页。继续、跳过或重新开始会停掉当前一句。
- 首领战前 `boss_pre_1`…`10` 在战前文字里播，点继续会停。
- 首领战后 `boss_post_1`…`10` 在落败演出里播，规则和开场一样。
- 战斗里 `maybeShout(heroClass)` 仍是约 20%（`Math.random`，不用战斗随机流），同角色 2.5 秒内只一声。喊声是该职业五句里随机一句；文件失败才退回合成短音。喊的时候同样把音乐压低约 6 dB。

这些曲子是本项目用 TinySoundFont（MIT）和 FluidR3_GM 音源（MIT）渲出来的原创 GM 旋律，听得出来是音源，不是录音棚乐队。语音是微软 Edge 神经网络 TTS，适合免费试玩；商用再发行需要另换有授权的合成。开场和首领落败用 `public/art/cinema` 的画，图画加载失败时才退回色块。操作音效仍是 `src/ui/audio.ts` 里的合成音，不经过音乐总线。
