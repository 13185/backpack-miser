# GenerateImage Queue — continuous animation frames

Parent: drop finished frames into `art/inbox/` named `{class}_{state}_f{NN}.jpg` (01-indexed), preferably **green-screen (#00FF00) background**.
Processor will chroma-key → 1024×1024 foot (512,928) → 512 runtime → atlas.

## Global style (append to every prompt)
- Original 2D hand-painted dark fairy-tale + comic exaggeration
- Deep ink outline slight weight variation; clear light/shadow planes
- Palette: leather brown, rice-white, iron-grey; warm gold / honey-orange accents; moss green / ruby red spots
- Single character, full body, NO text NO grid NO UI NO watermark
- Transparent-ready: solid lime green #00FF00 background
- Keep face, hair, outfit, weapons IDENTICAL across frames of same class
- Square 1:1, character not oversized; foot contact near lower third

## Already delivered (do not regenerate as f01 duplicates unless improving)
- merchant_defend_v2 → defend f01 (modified defense) ✅
- merchant_idle_01 → idle f01 ✅
- merchant_move f01–f08 → **8/8 complete** ✅
- merchant_idle f01–f04 → **4/4 complete** ✅
- merchant_attack f01–f06 → **6/6 complete** ✅
- merchant_defend f01–f04 → **4/4 complete** ✅
- merchant_hurt f01–f03 → **3/3 complete** ✅
- merchant_drink f01–f06 → **6/6 complete** ✅
- merchant_special f01–f06 → **6/6 complete** ✅
- merchant_victory f01–f06 → **6/6 complete** ✅
- merchant_defeat f01–f06 → **6/6 complete** ✅
- guard_idle f01–f04 → **4/4 complete** ✅
- guard_move f01–f08 → **8/8 complete** ✅
- guard_attack f01–f06 → **6/6 complete** ✅
- guard_defend f01–f04 → **4/4 complete** ✅
- guard_hurt f01–f03 → **3/3 complete** ✅
- guard_drink f01–f06 → **6/6 complete** ✅
- guard_special f01–f06 → **6/6 complete** ✅
- guard_victory f01–f06 → **6/6 complete** ✅
- guard_defeat f01–f06 → **6/6 complete** ✅
- ranger_idle f01–f04 → **4/4 complete** ✅
- ranger_move f01–f08 → **8/8 complete** ✅
- ranger_attack f01–f06 → **6/6 complete** ✅
- ranger_defend f01–f04 → **4/4 complete** ✅
- ranger_hurt f01–f03 → **3/3 complete** ✅
- ranger_drink f01–f06 → **6/6 complete** ✅
- ranger_special f01–f06 → **6/6 complete** ✅
- ranger_victory f01–f06 → **6/6 complete** ✅
- ranger_defeat f01–f06 → **6/6 complete** ✅

## Missing frames

### merchant
- Identity lock: Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi.
- References: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_idle_f02.jpg`
  - prompt: merchant idle animation frame 2 of 4. Idle standing pose, subtle breathing weight shift. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_idle_f03.jpg`
  - prompt: merchant idle animation frame 3 of 4. Idle standing pose, subtle breathing weight shift. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_idle_f04.jpg`
  - prompt: merchant idle animation frame 4 of 4. Idle standing pose, subtle breathing weight shift. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_move_f03.jpg`
  - prompt: merchant move animation frame 3 of 8. Walk/run cycle with clear foot contact, cloak billow. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_move_f04.jpg`
  - prompt: merchant move animation frame 4 of 8. Walk/run cycle with clear foot contact, cloak billow. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_move_f05.jpg`
  - prompt: merchant move animation frame 5 of 8. Walk/run cycle with clear foot contact, cloak billow. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_move_f06.jpg`
  - prompt: merchant move animation frame 6 of 8. Walk/run cycle with clear foot contact, cloak billow. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_move_f07.jpg`
  - prompt: merchant move animation frame 7 of 8. Walk/run cycle with clear foot contact, cloak billow. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_move_f08.jpg`
  - prompt: merchant move animation frame 8 of 8. Walk/run cycle with clear foot contact, cloak billow. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_attack_f01.jpg`
  - prompt: merchant attack animation frame 1 of 6. Attack wind-up, strike, follow-through. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_attack_f02.jpg`
  - prompt: merchant attack animation frame 2 of 6. Attack wind-up, strike, follow-through. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_attack_f03.jpg`
  - prompt: merchant attack animation frame 3 of 6. Attack wind-up, strike, follow-through. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_attack_f04.jpg`
  - prompt: merchant attack animation frame 4 of 6. Attack wind-up, strike, follow-through. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_attack_f05.jpg`
  - prompt: merchant attack animation frame 5 of 6. Attack wind-up, strike, follow-through. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_attack_f06.jpg`
  - prompt: merchant attack animation frame 6 of 6. Attack wind-up, strike, follow-through. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_defend_f02.jpg`
  - prompt: merchant defend animation frame 2 of 4. MODIFIED defense: low center-of-gravity bow stance, side-on huge backpack blocking impact with sparks, one arm guarding head, other arm tightly clutching gold pot, gritted teeth, powerful resistance. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_defend_f03.jpg`
  - prompt: merchant defend animation frame 3 of 4. MODIFIED defense: low center-of-gravity bow stance, side-on huge backpack blocking impact with sparks, one arm guarding head, other arm tightly clutching gold pot, gritted teeth, powerful resistance. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_defend_f04.jpg`
  - prompt: merchant defend animation frame 4 of 4. MODIFIED defense: low center-of-gravity bow stance, side-on huge backpack blocking impact with sparks, one arm guarding head, other arm tightly clutching gold pot, gritted teeth, powerful resistance. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_hurt_f01.jpg`
  - prompt: merchant hurt animation frame 1 of 3. Hit reaction recoil. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_hurt_f02.jpg`
  - prompt: merchant hurt animation frame 2 of 3. Hit reaction recoil. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_hurt_f03.jpg`
  - prompt: merchant hurt animation frame 3 of 3. Hit reaction recoil. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_drink_f01.jpg`
  - prompt: merchant drink animation frame 1 of 6. Drink potion, stow weapon correctly, no extra arms. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_drink_f02.jpg`
  - prompt: merchant drink animation frame 2 of 6. Drink potion, stow weapon correctly, no extra arms. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_drink_f03.jpg`
  - prompt: merchant drink animation frame 3 of 6. Drink potion, stow weapon correctly, no extra arms. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_drink_f04.jpg`
  - prompt: merchant drink animation frame 4 of 6. Drink potion, stow weapon correctly, no extra arms. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_drink_f05.jpg`
  - prompt: merchant drink animation frame 5 of 6. Drink potion, stow weapon correctly, no extra arms. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_drink_f06.jpg`
  - prompt: merchant drink animation frame 6 of 6. Drink potion, stow weapon correctly, no extra arms. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_special_f01.jpg`
  - prompt: merchant special animation frame 1 of 6. picking gold coins from ground while protecting purse. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_special_f02.jpg`
  - prompt: merchant special animation frame 2 of 6. picking gold coins from ground while protecting purse. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_special_f03.jpg`
  - prompt: merchant special animation frame 3 of 6. picking gold coins from ground while protecting purse. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_special_f04.jpg`
  - prompt: merchant special animation frame 4 of 6. picking gold coins from ground while protecting purse. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_special_f05.jpg`
  - prompt: merchant special animation frame 5 of 6. picking gold coins from ground while protecting purse. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_special_f06.jpg`
  - prompt: merchant special animation frame 6 of 6. picking gold coins from ground while protecting purse. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_victory_f01.jpg`
  - prompt: merchant victory animation frame 1 of 6. Victory flourish matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_victory_f02.jpg`
  - prompt: merchant victory animation frame 2 of 6. Victory flourish matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_victory_f03.jpg`
  - prompt: merchant victory animation frame 3 of 6. Victory flourish matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_victory_f04.jpg`
  - prompt: merchant victory animation frame 4 of 6. Victory flourish matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_victory_f05.jpg`
  - prompt: merchant victory animation frame 5 of 6. Victory flourish matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_victory_f06.jpg`
  - prompt: merchant victory animation frame 6 of 6. Victory flourish matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_defeat_f01.jpg`
  - prompt: merchant defeat animation frame 1 of 6. Defeat collapse matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_defeat_f02.jpg`
  - prompt: merchant defeat animation frame 2 of 6. Defeat collapse matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_defeat_f03.jpg`
  - prompt: merchant defeat animation frame 3 of 6. Defeat collapse matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_defeat_f04.jpg`
  - prompt: merchant defeat animation frame 4 of 6. Defeat collapse matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_defeat_f05.jpg`
  - prompt: merchant defeat animation frame 5 of 6. Defeat collapse matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

- [x] `merchant_defeat_f06.jpg`
  - prompt: merchant defeat animation frame 6 of 6. Defeat collapse matching class personality. Merchant (商旅): stout greedy man, mustard-yellow tattered cloak, huge wooden backpack with bedroll and flasks, clutching overflowing gold pot, big nose black curly hair short beard. Dark fairy-tale hand-painted 2D, thick ink outlines, leather brown iron-grey warm gold accents. NOT pixel NOT 3D plastic NOT chibi. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/merchant-9grid.png`, `art/characters/merchant/keyframes/merchant_idle.png`

### guard
- Identity lock: Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible.
- References: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_idle_f01.jpg`
  - prompt: guard idle animation frame 1 of 4. Idle standing pose, subtle breathing weight shift. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_idle_f02.jpg`
  - prompt: guard idle animation frame 2 of 4. Idle standing pose, subtle breathing weight shift. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_idle_f03.jpg`
  - prompt: guard idle animation frame 3 of 4. Idle standing pose, subtle breathing weight shift. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_idle_f04.jpg`
  - prompt: guard idle animation frame 4 of 4. Idle standing pose, subtle breathing weight shift. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_move_f01.jpg`
  - prompt: guard move animation frame 1 of 8. Walk/run cycle with clear foot contact, cloak billow. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_move_f02.jpg`
  - prompt: guard move animation frame 2 of 8. Walk/run cycle with clear foot contact, cloak billow. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_move_f03.jpg`
  - prompt: guard move animation frame 3 of 8. Walk/run cycle with clear foot contact, cloak billow. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_move_f04.jpg`
  - prompt: guard move animation frame 4 of 8. Walk/run cycle with clear foot contact, cloak billow. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_move_f05.jpg`
  - prompt: guard move animation frame 5 of 8. Walk/run cycle with clear foot contact, cloak billow. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_move_f06.jpg`
  - prompt: guard move animation frame 6 of 8. Walk/run cycle with clear foot contact, cloak billow. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_move_f07.jpg`
  - prompt: guard move animation frame 7 of 8. Walk/run cycle with clear foot contact, cloak billow. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_move_f08.jpg`
  - prompt: guard move animation frame 8 of 8. Walk/run cycle with clear foot contact, cloak billow. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_attack_f01.jpg`
  - prompt: guard attack animation frame 1 of 6. Attack wind-up, strike, follow-through. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_attack_f02.jpg`
  - prompt: guard attack animation frame 2 of 6. Attack wind-up, strike, follow-through. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_attack_f03.jpg`
  - prompt: guard attack animation frame 3 of 6. Attack wind-up, strike, follow-through. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_attack_f04.jpg`
  - prompt: guard attack animation frame 4 of 6. Attack wind-up, strike, follow-through. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_attack_f05.jpg`
  - prompt: guard attack animation frame 5 of 6. Attack wind-up, strike, follow-through. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_attack_f06.jpg`
  - prompt: guard attack animation frame 6 of 6. Attack wind-up, strike, follow-through. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defend_f01.jpg`
  - prompt: guard defend animation frame 1 of 4. Block absorb and recover. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defend_f02.jpg`
  - prompt: guard defend animation frame 2 of 4. Block absorb and recover. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defend_f03.jpg`
  - prompt: guard defend animation frame 3 of 4. Block absorb and recover. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defend_f04.jpg`
  - prompt: guard defend animation frame 4 of 4. Block absorb and recover. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_hurt_f01.jpg`
  - prompt: guard hurt animation frame 1 of 3. Hit reaction recoil. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_hurt_f02.jpg`
  - prompt: guard hurt animation frame 2 of 3. Hit reaction recoil. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_hurt_f03.jpg`
  - prompt: guard hurt animation frame 3 of 3. Hit reaction recoil. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_drink_f01.jpg`
  - prompt: guard drink animation frame 1 of 6. Drink potion, stow weapon correctly, no extra arms. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_drink_f02.jpg`
  - prompt: guard drink animation frame 2 of 6. Drink potion, stow weapon correctly, no extra arms. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_drink_f03.jpg`
  - prompt: guard drink animation frame 3 of 6. Drink potion, stow weapon correctly, no extra arms. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_drink_f04.jpg`
  - prompt: guard drink animation frame 4 of 6. Drink potion, stow weapon correctly, no extra arms. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_drink_f05.jpg`
  - prompt: guard drink animation frame 5 of 6. Drink potion, stow weapon correctly, no extra arms. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_drink_f06.jpg`
  - prompt: guard drink animation frame 6 of 6. Drink potion, stow weapon correctly, no extra arms. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_special_f01.jpg`
  - prompt: guard special animation frame 1 of 6. coiled counter-attack with shield forward sword pulled back. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_special_f02.jpg`
  - prompt: guard special animation frame 2 of 6. coiled counter-attack with shield forward sword pulled back. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_special_f03.jpg`
  - prompt: guard special animation frame 3 of 6. coiled counter-attack with shield forward sword pulled back. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_special_f04.jpg`
  - prompt: guard special animation frame 4 of 6. coiled counter-attack with shield forward sword pulled back. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_special_f05.jpg`
  - prompt: guard special animation frame 5 of 6. coiled counter-attack with shield forward sword pulled back. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_special_f06.jpg`
  - prompt: guard special animation frame 6 of 6. coiled counter-attack with shield forward sword pulled back. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_victory_f01.jpg`
  - prompt: guard victory animation frame 1 of 6. Victory flourish matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_victory_f02.jpg`
  - prompt: guard victory animation frame 2 of 6. Victory flourish matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_victory_f03.jpg`
  - prompt: guard victory animation frame 3 of 6. Victory flourish matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_victory_f04.jpg`
  - prompt: guard victory animation frame 4 of 6. Victory flourish matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_victory_f05.jpg`
  - prompt: guard victory animation frame 5 of 6. Victory flourish matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_victory_f06.jpg`
  - prompt: guard victory animation frame 6 of 6. Victory flourish matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defeat_f01.jpg`
  - prompt: guard defeat animation frame 1 of 6. Defeat collapse matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defeat_f02.jpg`
  - prompt: guard defeat animation frame 2 of 6. Defeat collapse matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defeat_f03.jpg`
  - prompt: guard defeat animation frame 3 of 6. Defeat collapse matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defeat_f04.jpg`
  - prompt: guard defeat animation frame 4 of 6. Defeat collapse matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defeat_f05.jpg`
  - prompt: guard defeat animation frame 5 of 6. Defeat collapse matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

- [x] `guard_defeat_f06.jpg`
  - prompt: guard defeat animation frame 6 of 6. Defeat collapse matching class personality. Guard (守卫): broad-shouldered bearded man, small kettle helm, weathered iron armor, off-white surcoat with dark cross, blue tattered cape, broadsword and tall kite shield. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/guard-9grid.png`, `art/characters/guard/keyframes/guard_idle.png`

### ranger
- Identity lock: Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible.
- References: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_idle_f01.jpg`
  - prompt: ranger idle animation frame 1 of 4. Idle standing pose, subtle breathing weight shift. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_idle_f02.jpg`
  - prompt: ranger idle animation frame 2 of 4. Idle standing pose, subtle breathing weight shift. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_idle_f03.jpg`
  - prompt: ranger idle animation frame 3 of 4. Idle standing pose, subtle breathing weight shift. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_idle_f04.jpg`
  - prompt: ranger idle animation frame 4 of 4. Idle standing pose, subtle breathing weight shift. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_move_f01.jpg`
  - prompt: ranger move animation frame 1 of 8. Walk/run cycle with clear foot contact, cloak billow. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_move_f02.jpg`
  - prompt: ranger move animation frame 2 of 8. Walk/run cycle with clear foot contact, cloak billow. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_move_f03.jpg`
  - prompt: ranger move animation frame 3 of 8. Walk/run cycle with clear foot contact, cloak billow. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_move_f04.jpg`
  - prompt: ranger move animation frame 4 of 8. Walk/run cycle with clear foot contact, cloak billow. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_move_f05.jpg`
  - prompt: ranger move animation frame 5 of 8. Walk/run cycle with clear foot contact, cloak billow. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_move_f06.jpg`
  - prompt: ranger move animation frame 6 of 8. Walk/run cycle with clear foot contact, cloak billow. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_move_f07.jpg`
  - prompt: ranger move animation frame 7 of 8. Walk/run cycle with clear foot contact, cloak billow. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_move_f08.jpg`
  - prompt: ranger move animation frame 8 of 8. Walk/run cycle with clear foot contact, cloak billow. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_attack_f01.jpg`
  - prompt: ranger attack animation frame 1 of 6. Attack wind-up, strike, follow-through. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_attack_f02.jpg`
  - prompt: ranger attack animation frame 2 of 6. Attack wind-up, strike, follow-through. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_attack_f03.jpg`
  - prompt: ranger attack animation frame 3 of 6. Attack wind-up, strike, follow-through. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_attack_f04.jpg`
  - prompt: ranger attack animation frame 4 of 6. Attack wind-up, strike, follow-through. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_attack_f05.jpg`
  - prompt: ranger attack animation frame 5 of 6. Attack wind-up, strike, follow-through. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_attack_f06.jpg`
  - prompt: ranger attack animation frame 6 of 6. Attack wind-up, strike, follow-through. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defend_f01.jpg`
  - prompt: ranger defend animation frame 1 of 4. Block absorb and recover. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defend_f02.jpg`
  - prompt: ranger defend animation frame 2 of 4. Block absorb and recover. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defend_f03.jpg`
  - prompt: ranger defend animation frame 3 of 4. Block absorb and recover. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defend_f04.jpg`
  - prompt: ranger defend animation frame 4 of 4. Block absorb and recover. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_hurt_f01.jpg`
  - prompt: ranger hurt animation frame 1 of 3. Hit reaction recoil. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_hurt_f02.jpg`
  - prompt: ranger hurt animation frame 2 of 3. Hit reaction recoil. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_hurt_f03.jpg`
  - prompt: ranger hurt animation frame 3 of 3. Hit reaction recoil. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_drink_f01.jpg`
  - prompt: ranger drink animation frame 1 of 6. Drink potion, stow weapon correctly, no extra arms. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_drink_f02.jpg`
  - prompt: ranger drink animation frame 2 of 6. Drink potion, stow weapon correctly, no extra arms. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_drink_f03.jpg`
  - prompt: ranger drink animation frame 3 of 6. Drink potion, stow weapon correctly, no extra arms. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_drink_f04.jpg`
  - prompt: ranger drink animation frame 4 of 6. Drink potion, stow weapon correctly, no extra arms. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_drink_f05.jpg`
  - prompt: ranger drink animation frame 5 of 6. Drink potion, stow weapon correctly, no extra arms. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_drink_f06.jpg`
  - prompt: ranger drink animation frame 6 of 6. Drink potion, stow weapon correctly, no extra arms. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_special_f01.jpg`
  - prompt: ranger special animation frame 1 of 6. low crouch dodge with wind swirl, daggers ready. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_special_f02.jpg`
  - prompt: ranger special animation frame 2 of 6. low crouch dodge with wind swirl, daggers ready. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_special_f03.jpg`
  - prompt: ranger special animation frame 3 of 6. low crouch dodge with wind swirl, daggers ready. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_special_f04.jpg`
  - prompt: ranger special animation frame 4 of 6. low crouch dodge with wind swirl, daggers ready. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_special_f05.jpg`
  - prompt: ranger special animation frame 5 of 6. low crouch dodge with wind swirl, daggers ready. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_special_f06.jpg`
  - prompt: ranger special animation frame 6 of 6. low crouch dodge with wind swirl, daggers ready. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_victory_f01.jpg`
  - prompt: ranger victory animation frame 1 of 6. Victory flourish matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_victory_f02.jpg`
  - prompt: ranger victory animation frame 2 of 6. Victory flourish matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_victory_f03.jpg`
  - prompt: ranger victory animation frame 3 of 6. Victory flourish matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_victory_f04.jpg`
  - prompt: ranger victory animation frame 4 of 6. Victory flourish matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_victory_f05.jpg`
  - prompt: ranger victory animation frame 5 of 6. Victory flourish matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_victory_f06.jpg`
  - prompt: ranger victory animation frame 6 of 6. Victory flourish matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defeat_f01.jpg`
  - prompt: ranger defeat animation frame 1 of 6. Defeat collapse matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defeat_f02.jpg`
  - prompt: ranger defeat animation frame 2 of 6. Defeat collapse matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defeat_f03.jpg`
  - prompt: ranger defeat animation frame 3 of 6. Defeat collapse matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defeat_f04.jpg`
  - prompt: ranger defeat animation frame 4 of 6. Defeat collapse matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defeat_f05.jpg`
  - prompt: ranger defeat animation frame 5 of 6. Defeat collapse matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

- [x] `ranger_defeat_f06.jpg`
  - prompt: ranger defeat animation frame 6 of 6. Defeat collapse matching class personality. Ranger (游侠): slim agile woman, brown braid, moss-green pointed hood and tattered cloak with gold trim, crimson sash, leather armor, dual curved silver daggers. Same art bible. Consistent proportions with reference. Lime green #00FF00 solid background. Foot planted for ground contact (or consistent ground reference if airborne).
  - refs: `art/refs/ranger-9grid.png`, `art/characters/ranger/keyframes/ranger_idle.png`

## Count remaining: **12** frames