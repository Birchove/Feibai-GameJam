# 美术与音频资产清单（Feibai-GameJam）

本文档与**当前代码中的硬编码路径**一致：`index.html` 与 `js/` 下使用 `assets/...`（相对项目根目录）；`css/style.css` 使用 `../assets/...`（相对 `css/`）。  
**所有列出的文件均应放在项目根目录下的 `assets/` 夹中**（与 `index.html` 同级），例如：

```text
Feibai-GameJam/
  index.html
  assets/
    main_menu_bg.png
    card_c1.png
    ...
```

---

## 1. 全屏 / 界面背景图（PNG 等位图）

| 资产文件名 | 用途（界面） | 引用位置 |
|-----------|--------------|----------|
| `main_menu_bg.png` | 主菜单 `#screen-main` | `css/style.css` |
| `saves_menu_bg.png` | 存档选择 `#screen-saves` | `css/style.css` |
| `class_select_bg.png` | 流派选择 `#screen-class` | `css/style.css` |
| `map_bg.png` | 大地图 `#screen-map` 内容区 | `css/style.css` |
| `event_bg.png` | 事件对话 `#screen-event` **默认背景**（无 `eventSkin` 或未认出的皮肤时）；**战斗结算** `#screen-settlement` | `css/style.css` |
| `event_bg_teahouse.png` | 事件 **茶楼**（`Events.vn2`，地图节点「茶楼」） | `css/style.css`（`#screen-event.event-bg-teahouse`） |
| `event_bg_village.png` | 事件 **村庄 / 荒村**（`village_hub_*`、`Village_buildHub`） | `css/style.css`（`#screen-event.event-bg-village`） |
| `event_bg_temple.png` | 事件 **破庙**（`Events.vn3`） | `css/style.css`（`#screen-event.event-bg-temple`） |
| `event_bg_wangxiang.png` | 事件 **望乡台**（`Events.vn1`） | `css/style.css`（`#screen-event.event-bg-wangxiang`） |
| `event_bg_naihe.png` | 事件 **奈何桥**结局（`Events.end_story`） | `css/style.css`（`#screen-event.event-bg-naihe`） |

说明：

- 事件背景由 `js/data/events.js` 里各事件的 **`eventSkin`** 字段（`teahouse` / `village` / `temple` / `wangxiang` / `naihe`）决定；`js/systems/map.js` 中 `EventSys.applyEventBackground` 会在进入事件时给 `#screen-event` 挂上对应 class，**CSS 变量** `--event-bg-image` 指向上表 PNG。
- **战斗结算**仍单独使用 `event_bg.png`，与事件皮肤无关；若结算也要分区换图，需另加 CSS 规则。
- 若某专用 PNG 暂缺，可复制 `event_bg.png` 占位同名文件，避免 404。
- `saves_menu_bg.png`（回忆一 / 回忆二 / 回忆三 共用）生图提示词：
  - 正向词：`Chinese dark wuxia underworld memory hall, ancient stone chamber with three subtle memorial altars, drifting incense smoke, dim candle light, faded paper talismans, melancholy and solemn atmosphere, ink wash + painterly 2D game background, dark blue and desaturated cyan palette with slight warm amber highlights, center area clean for UI buttons and save slot text, high clarity, no characters, no text`
  - 负向词：`characters, people, text, watermark, logo, modern furniture, neon lights, sci-fi elements, photorealistic, 3d render, over-detailed foreground clutter, blurry, noisy`
  - 出图建议：优先 `16:9`（如 `1920x1080`）；画面中部与偏下位置留“低细节空区”，用于承载“回忆一/二/三”按钮与状态文字，避免背景干扰可读性。

以下为 **`class_select_bg.png`**（流派选择）、**`event_bg.png`**（事件默认 + 战斗结算）、**`event_bg_naihe.png`**（奈何桥结局皮肤）的生图提示词，风格与主菜单 / 战斗背景一致（冥府水墨武侠、`Feibai` 气质）。

#### `class_select_bg.png` — `#screen-class`

- **正向词**：`Chinese dark underworld wuxia class selection hall, ancient pavilion terrace overlooking misty ghost peaks, faint sword qi brushed as dry ink strokes in mid-air, drifting pale lanterns, cold moon rim, ink wash plus painterly 2D game background, charcoal blue-grey palette with restrained antique gold glints on railings, solemn breathable mood, center third relatively calm with soft vignette for sword-school emblem UI and choice buttons, high clarity, no readable text, no characters`
- **负向词**：`text, letters, watermark, logo, people, faces, crowds, photorealistic skin, neon cyberpunk, sci-fi, cluttered foreground props, modern architecture`
- **出图建议**：优先 `16:9`；**正中偏上**可略疏朗，便于 `#screen-class` 中央圆形流派图标与说明文字。

#### `event_bg.png` — `#screen-event` 默认 / `#screen-settlement`

- **正向词**：`Chinese ink wash ghost-realm council backdrop, wide panoramic riverbank under ash moon, twisted dead trees and broken stone lanterns, thin bridge silhouette dissolving in fog, painterly 2D game background for dialogue overlay, muted teal-grey and soot paper tones with faint warm lantern bloom for readability, mid-ground atmospheric density, bottom quarter softer gradient for dialog box legibility, melancholic but majestic underworld travelogue tone matching Feibai, high clarity, no characters, no text`
- **负向词**：`text, watermark, logo, bright saturation, cartoon UI frame, photorealistic crowds, modern city, neon`
- **出图建议**：优先 `16:9`；**画面下半约 30%** 宜偏低对比，便于叠加半透明对话框。

#### `event_bg_naihe.png` — 奈何桥结局（`eventSkin: 'naihe'`）

- **正向词**：`Chinese mythic Naihe bridge over forgetting river, spectral stone arch bridge spanning blood-red to ink-black water shimmer, distant silhouette of judgment halls dissolving in mist, mournful cherry-blossom petals as pale ash drifting, ink wash with touches of cinnabar seal red accents only on bridge pillars or ribbons, epic ending-story mood, painterly 2D game CG background, cold moon halo, horizontal composition for widescreen, foreboding serenity, no characters, no text`
- **负向词**：`text, watermark, readable signage, photorealistic gore spray, cute anime style, neon cyberpunk, sci-fi spaceship`
- **出图建议**：优先 `16:9`；桥面或水体可作视觉主线横贯中部，左右留白宜对称稳重。

---

## 2. 战斗场景背景

| 资产文件名 | 用途 | 引用位置 |
|-----------|------|----------|
| `combat_bg.png` | 战斗界面 `#screen-combat` **全屏底层**（所有遭遇共用） | `css/style.css` |
| `combat_bg_mountain.png` | **山路**遭遇：仅叠在战区 `.combat-middle` 内（`::before`），半透明 + 底部渐变隐去，**不铺满手牌区**，减轻对前景 UI 的干扰 | `css/style.css`（`#screen-combat.combat-bg-mountain .combat-middle::before`） |

说明：

- 地图节点在 `js/data/events.js` 的 `MapChapters` 中可通过可选字段 **`combatBg: 'mountain'`** 标记（当前所有名为「山路」的节点及第一章 `fight1` / `fight2` 已配置）。`js/systems/map.js` 在进入战斗前调用 `Combat.setNextCombatBackground(node.combatBg)`，`js/systems/combat.js` 在 `Combat.start` 开头消费该值并为 `#screen-combat` 添加或移除 class **`combat-bg-mountain`**。
- 从开发者面板等路径直接 `Combat.start(...)`、未经过地图节点时，不会设置山路皮肤，仍为默认仅 `combat_bg.png`。
- 美术建议：山路立绘构图偏 **中上景**（天际/远山），下方留虚或低密度，与 `mask` 渐变衔接更自然；若文件缺失，可复制 `combat_bg.png` 为占位文件名，避免 404。
- `combat_bg.png` 生图提示词（可直接用）：
  - 正向词：`Chinese dark wuxia underworld battlefield, moonlit ghost mountain path, dead trees and broken stone road, distant misty ridges, ink-wash texture blended with painterly 2D game background, cinematic cold blue and dark teal palette, subtle warm lantern accents, atmospheric fog, high clarity, low visual noise in lower screen area for card UI readability, no characters, no text`
  - 负向词：`characters, people, monsters, text, watermark, logo, modern buildings, neon cyberpunk, photorealistic, 3d render, oversaturated colors, blurry, noisy`
  - 出图建议：优先 `16:9`（如 `1920x1080`）；画面重心偏中上，底部 25%-30% 保持低细节，避免压手牌与按钮。

---

## 3. 主角立绘（信息界面 / 战斗界面）

统一在 **`css/style.css`** 的 `:root` 中通过变量引用（路径相对 **`css/`**，指向 `../assets/`）：

| CSS 变量 | 资产路径（站点根下） | 界面 | 显示区域与比例 |
|----------|----------------------|------|----------------|
| `--portrait-info-url` | `assets/portrait_info.png` | 「侠客信息」`#info-content` **中栏**（`index.html` → `.info-col-portrait` + `.info-portrait-layer`） | 与 `#info-content` 同高 **600px**（`max-height: 85vh` 时随容器缩放），中栏约 **⅓ 行宽**。槽位视觉比例约 **1 : 2**（竖长条，`background-size: cover` 裁切）。建议原画 **540×1080** 或 **360×720**（竖版，主体偏中上，底部可弱化以便叠 UI）。 |
| `--portrait-combat-url` | `assets/portrait_combat.png` | 战斗 `#player` 立绘（`index.html` → `.player-combat-portrait` + `.entity-sprite`） | 与妖怪槽一致：默认 **180×240 px** → **3 : 4**；`max-height: 600px` 时为 **100×140** → **5 : 7**（见 `css/style.css` 中 `.entity-sprite` 与媒体查询）。建议原画 **360×480** 或 **540×720**（竖版，`cover` 裁切）。 |

迁移：若本地仍只有旧文件，可复制或重命名为上述文件名：

- `info_character.png` → `portrait_info.png`
- `player_sprite.png` → `portrait_combat.png`

敌方妖怪 PNG 清单与比例见 **§4**。卡面插图比例见 **§5** 开头说明。

---

## 4. 敌人 / 妖怪立绘（按 archetype 分文件）

命名规则（与 `js/data/enemies.js` 中 **`EnemyArchetypes` 的键名 `archKey` 一致**）：

```text
assets/enemy_<archKey>.png
```

由 **`enemySpriteStyle(archKey)`** 注入 `background`（`center/cover`），路径相对站点根目录。新增妖怪时在 `EnemyArchetypes` 增加条目并放置对应 PNG 即可。

### 4.1 上架清单（文件名 → 典型名称）

| 资产文件名 | `archKey` | 典型显示名 |
|-----------|-----------|------------|
| `enemy_legacy_fight1.png` | `legacy_fight1` | 游魂 |
| `enemy_legacy_fight2.png` | `legacy_fight2` | 恶鬼 |
| `enemy_di_fu_ye_gui.png` | `di_fu_ye_gui` | 地府野鬼 |
| `enemy_bai_hun_ye_gui.png` | `bai_hun_ye_gui` | 白魂野鬼 |
| `enemy_lan_shi_guai.png` | `lan_shi_guai` | 烂尸怪 |
| `enemy_chi_mei_single.png` | `chi_mei_single` | 魑魅魍魉（四体同图，仅名称后缀不同） |
| `enemy_ye_ku_gui.png` | `ye_ku_gui` | 夜哭鬼 |
| `enemy_yin_sha.png` | `yin_sha` | 阴煞 |
| `enemy_ku_hai_guan_li.png` | `ku_hai_guan_li` | 枯骸官吏 |
| `enemy_diao_si_gui.png` | `diao_si_gui` | 吊死鬼 |
| `enemy_ye_xun_a.png` | `ye_xun_a` | 夜巡阴差·甲 |
| `enemy_ye_xun_b.png` | `ye_xun_b` | 夜巡阴差·乙 |
| `enemy_hei_wu_chang.png` | `hei_wu_chang` | 黑无常 |
| `enemy_bai_wu_chang.png` | `bai_wu_chang` | 白无常 |
| `enemy_yan_luo_wang.png` | `yan_luo_wang` | 阎罗王 |
| `enemy_village_strong_rand.png` | `village_strong_rand` | 路劫阴魁 |

### 4.2 像素比例（与 `css/style.css` 一致）

| 场景 | 显示尺寸（逻辑像素） | 宽高比 | 建议原画（示例） |
|------|----------------------|--------|------------------|
| 默认敌方 `.entity-sprite` | **180 × 240** | **3 : 4** | **360×480**、**540×720**（竖版，`cover` 会裁边） |
| 四魑并排 `.enemy-layout-chi-four` | **92 × 114** | 约 **46 : 57** | 可按 184×228 交稿再压缩 |
| 移动端窄屏 `.entity-sprite` | **100 × 140** | **5 : 7** | 可按 **200×280** 交稿 |

构图宜将角色主体放在**中下方**，头顶留少量余量，避免被意图条（`.intent`）遮挡。

---

## 5. 卡牌插画（每张牌一张图）

**卡面插图比例（UI）**：整卡外框 **150 × 230 px**，比例 **15 : 23**；中部 `card-img` 仅为一条横带（高约 **50 px**，小屏 **35 px**），可视区宽约 **130 px**，`background-size: cover`，重要内容避开上下裁切。建议整卡插画按 **15:23**（如 **600×920**）交稿，或单独为横条准备约 **2.6 : 1** 的宽图。

命名规则（与 `CardDB` 的 `id` **完全一致**）：

```text
assets/card_<cardId>.png
```

卡图在 `js/systems/game.js` 的 `Game.createCardDOM` 与图鉴 `gallery` 中共用，战斗手牌与卡牌列表均依赖此规则。

### 5.1 常规与秘籍牌（`c1`–`c4`，`c6`–`c50`；**无 `c5`**：绣剑为神兵 `WeaponDB.xiuJian`，非卡牌）

| 文件名 | 卡牌名（`CardDB`） |
|--------|-------------------|
| `card_c1.png` | 横劈 |
| `card_c2.png` | 闪避 |
| `card_c3.png` | 蝶恋花 |
| `card_c4.png` | 点水 |
| `card_c6.png` | 破阵子 |
| `card_c7.png` | 定风波 |
| `card_c8.png` | 水调歌头 |
| `card_c9.png` | 念奴娇 |
| `card_c10.png` | 满江红 |
| `card_c11.png` | 习武 |
| `card_c12.png` | 刺击 |
| `card_c13.png` | 舞剑 |
| `card_c14.png` | 挂剑 |
| `card_c15.png` | 撩剑 |
| `card_c16.png` | 抗衡 |
| `card_c17.png` | 斡旋 |
| `card_c18.png` | 缮甲 |
| `card_c19.png` | 磨刀 |
| `card_c20.png` | 伏击 |
| `card_c21.png` | 双斩 |
| `card_c22.png` | 歃血为盟 |
| `card_c23.png` | 一转攻势 |
| `card_c24.png` | 束手就擒 |
| `card_c25.png` | 厉兵秣马 |
| `card_c26.png` | 万夫莫开 |
| `card_c27.png` | 摧枯拉朽 |
| `card_c28.png` | 白虹贯日 |
| `card_c29.png` | 峨眉剑法 |
| `card_c30.png` | 以逸待劳 |
| `card_c31.png` | 一剑封喉 |
| `card_c32.png` | 波诡云谲 |
| `card_c33.png` | 流星落月 |
| `card_c34.png` | 坚壁清野 |
| `card_c35.png` | 付之一炬 |
| `card_c36.png` | 封刀挂剑 |
| `card_c37.png` | 七步成诗 |
| `card_c38.png` | 投笔从戎 |
| `card_c39.png` | 拔山扛鼎 |
| `card_c40.png` | 文思泉涌 |
| `card_c41.png` | 万剑归宗 |
| `card_c42.png` | 城焚烬余 |
| `card_c43.png` | 折戟沉沙 |
| `card_c44.png` | 唇枪舌剑 |
| `card_c45.png` | 固若金汤 |
| `card_c46.png` | 案剑瞋目 |
| `card_c47.png` | 刀光剑影 |
| `card_c48.png` | 金蝉脱壳 |
| `card_c49.png` | 操戈擐甲 |
| `card_c50.png` | 枯木逢春 |

### 5.2 衍生物 / 诅咒等特殊卡

| 文件名 | 卡牌名 |
|--------|--------|
| `card_c_duwu.png` | 黩武 |
| `card_c_jingkong.png` | 惊恐 |
| `card_c_jia_suo.png` | 枷锁 |
| `card_c_hui.png` | 悔 |

### 5.3 卡面横条生图提示词（`card_c7`、`card_c23`–`card_c50`）

**比例**：整段插图按 **2.6 : 1** 出图（如 **1040×400** 或 **780×300**），主视觉放在**水平居中**，上下预留少许裁切安全边，便于 `card-img` 横向 `cover`。

---

#### `card_c7.png` — 定风波

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — calm-after-storm metaphor: great waves and violent wind rendered as curling ink ribbons gradually flattening into smooth grey mist; a faint whirlwind ring suggesting restraint and control; subtle hint of blood-price as one thin red ink vein fading into black; epic but quiet tension. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c23.png` — 一转攻势

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — reversal of fortune: a spiral torque of ink and faint blade arcs twisting from collapse into rising momentum; yin-yang-like motion without literal taiji symbol; feeling of traded weakness becoming stored power in ghost arena. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c24.png` — 束手就擒

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — captured willingly motif: shadowy silk-rope and cuff-like ink bindings suggested by flowing brushstrokes (not graphic torture); restrained figure silhouette lowering aggression; enemy pressure visualized as slowing descending ink strokes and softened blade reflections. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c25.png` — 厉兵秣马

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — sharpen blades feed horses idiom: ghost-armory vibe; rows of blurred spearheads and sword edges catching cold moon glint; faint spectral horses as charcoal silhouettes drinking from ink-black water; preparation before battle underworld dawn fog. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c26.png` — 万夫莫开

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — narrow mountain pass fortress gate: towering cliff ink strokes forming a bottleneck; heavy wooden gate silhouette barely opening to mist; solitary guardian shadow implying immovable defense; massive scale contrast. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c27.png` — 摧枯拉朽

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — crush rotten wood idiom: splintered dead branches exploding into dust; sweeping ink slash tearing through decayed structures; visceral sense of collapse and vulnerability exposed; flying debris as dry ink flecks. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c28.png` — 白虹贯日

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — white rainbow piercing sun: a pale sword beam streak across a murky sky disk (sun as muted gold orb behind clouds); high contrast blade-light core against sooty clouds; mythic omen atmosphere without sci-fi lasers. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c29.png` — 峨眉剑法

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — Emei sword elegance: graceful arcs of sword qi like bamboo wind; slim blade afterimages forming layered curves; mountain mist suggestion with cliff silhouette hints; feminine-steel precision, no portrait face needed. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c30.png` — 以逸待劳

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — wait at ease: seated warrior shadow under twisted pine; resting blade across knees; distant exhausted enemy silhouettes blurred in fog; calm breathing smoke wisps; traps implied by subtle ink tripwire hints (abstract). Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c31.png` — 一剑封喉

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — one strike lethal precision: extreme close angle of a single blade tip stopping at ink-black throat line suggested by shadow gap (no gore); tension frozen millisecond; thin red accent line as seal ink not blood splatter; ruthless efficiency. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c32.png` — 波诡云谲

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — treacherous waves and deceitful clouds idiom: swirling ink masses folding into each other like unpredictable tide; masks and fog layers implying schemes; knife-like cloud edges; uneasy motion without a stable horizon. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c33.png` — 流星落月

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — meteor across moon: long streak of pale blade-light tearing night mist; pale moon disk partly veiled; trailing sparks as dry ink flecks; chain-reaction energy implied by forked afterglow lines to secondary targets. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c34.png` — 坚壁清野

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — strong walls scorched-earth defense: massive rampart silhouette ink strokes; blackened fields before walls; empty plain leading to gate; ash-like mist; fortress endurance mood. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c35.png` — 付之一炬

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — burn it all idiom: torch flame rendered as controlled vermillion ink bloom consuming curling scroll-like shapes; rising ash as pale grey particles; sacrifice for change; heat shimmer lines without cartoon fire. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c36.png` — 封刀挂剑

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — seal the blade hang the sword: ancient weapon rack in moonlit hall shadow; silk-sealed sabre with red seal stamp motif (abstract shape only); quiet dojo underworld atmosphere; promise of drawing cards like drawing breath. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c37.png` — 七步成诗

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — poem in seven steps: seven faint footsteps as ripples on ink pond; brushstroke verses appearing as vertical wet streaks without letters; sudden bloom of gold flecks as inspiration; literary ghost aura. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c38.png` — 投笔从戎

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — cast brush join army: scholar brush dissolving into spear silhouette mid-air; ink splatter transforming into weapon edge; pivot from words to war under ghost banners; resolve and courage. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c39.png` — 拔山扛鼎

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — uproot mountains lift cauldron strength: colossal shadow lifting exaggerated bronze tripod silhouette; mountain ridge ink mass tilting; dust shockwave rings; raw martial might as ink weight and gold edge highlights. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c40.png` — 文思泉涌

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — thoughts gushing like spring: ink pouring upward like water jet from cracked stone well; brush hovering releasing endless stream; clearing mind fog into shields as rippling rings; creative surge becoming defense (abstract). Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c41.png` — 万剑归宗

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — myriad swords return to one sect: countless slim blade silhouettes converging toward central radiant point; symmetrical formation like migratory birds; mirror shards suggested as duplicate reflections of steel; overwhelming unified strike. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c42.png` — 城焚烬余

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — city burned embers remain: collapsed battlement silhouettes in charred ink; orange-red ember glow cooled to controlled accents; ash flakes drifting; hollow skyline implying hand emptied then wreckage dealt (abstract). Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c43.png` — 折戟沉沙

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — broken halberd sunk in sand: ancient weapon half-buried in black sand dunes of ink; tide line marks; retrieval hope from forgotten grave; weathered metal glint under moon; melancholy battlefield aftermath. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c44.png` — 唇枪舌剑

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — verbal blades crossing: two opposing arcs of thin razor wind meeting; lip-shaped mist curls stylized abstractly (not literal mouths); flying needle-like lines implying ze-tone strikes on random foes; sharp debate as combat. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c45.png` — 固若金汤

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — strong as molten metal soup fortress: golden citadel walls reflecting cold moon; moat as ink pool; seamless ramparts loop; ping-tone rhythm suggested by repeating circular masonry arcs; impregnable calm. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c46.png` — 案剑瞋目

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — hand on sword angry glare: tight close-up of gloved hand gripping jian hilt on low table; glaring eye shine in darkness (single eye light spot); tension before reckless gamble; countdown fate suggested by three faint ring pulses in mist. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c47.png` — 刀光剑影

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — blade flashes sword shadows: chaotic intersecting white arcs in black fog; fast duel implied by crossing streaks; doubled effects echo as faint ghost blades; slender sword silhouettes repeating. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c48.png` — 金蝉脱壳

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — golden cicada sheds shell: split translucent cicada husk left as hollow golden-brown silhouette; escaping shadow streak slipping sideways; previous state frozen in shell; trickster survival underworld escape. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c49.png` — 操戈擐甲

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — wield spear don armor: heavy lamellar armor silhouette reflecting steel grey ink; polearm raised for crushing overhead blow; dust shock; battlefield elite pressure; massive single-hit damage feeling. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

#### `card_c50.png` — 枯木逢春

```
Ultra-wide horizontal illustration 2.6:1 aspect ratio (game card strip), Chinese dark underworld wuxia ink-wash style matching Feibai, painterly 2D game art, cold moonlit palette (deep charcoal, desaturated blue-teal, faint parchment warmth), restrained cinnabar red and antique gold accents only as highlights, subtle paper grain and wet ink diffusion, ghost-realm mood, single strong symbolic focal motif centered for horizontal banner crop, high clarity, readable silhouette at small size — withered tree meets spring: gnarled dead tree trunk split by single vivid cyan-green sprout line (ghost spring); life returning to HP metaphor; mist parting; faint gold sunlight through cracks in charcoal bark; tender hope in grim realm. Negative: text, letters, watermark, signature, logo, photorealistic, 3D render, neon cyberpunk, oversaturated candy colors, cluttered composition, messy borders, UI frame, modern objects
```

---

## 6. 视频

| 资产文件名 | 用途 | 引用位置 |
|-----------|------|----------|
| `PV.mp4` | 新游戏流程中的开场 PV 叠加层 `#pv-overlay` | `index.html` |

---

## 7. 音乐与音效（MP3 或浏览器支持的格式）

`js/core/audio.js` 使用 HTML5 `Audio`，路径与 `index.html` 同级时均为 `assets/...`。

### 7.1 BGM（循环播放，`loop = true`，默认音量约 0.5）

三类主循环曲目在 `js/core/audio.js` 的 **`AudioSys.BGM`** 中配置，并通过 **`AudioSys.playBGMTrack('world'|'combat'|'boss')`** 切换；同一曲目不会重复从头打断。

| 资产文件名 | 用途 | 引用位置 |
|-----------|------|----------|
| `bgm_boss.mp3` | **Boss 战**：地图节点「鬼门关」，遭遇 `enc_yan_luo_wang` | `js/systems/combat.js` → `Combat.start` |
| `bgm_combat.mp3` | **战斗**（除 Boss 战外所有遭遇） | `js/systems/combat.js` → `Combat.start` |
| `bgm_world.mp3` | **探索**：大地图 + 事件界面（共用同一曲） | `js/systems/game.js`（`initGame`）、`js/systems/map.js`（`EventSys.start`）、`js/systems/combat.js`（撤离战斗、胜利进结算前） |

迁移说明：原先使用的 **`bgm_map.mp3`** 请改名为或替换为 **`bgm_world.mp3`**，与上表一致。

### 7.2 SFX（单次播放，默认音量约 0.8）

| 资产文件名 | 触发场景 | 引用位置 |
|-----------|----------|----------|
| `sfx_draw.mp3` | 抽牌 | `js/systems/combat.js` |
| `sfx_hit.mp3` | 受击/打击类反馈（多处） | `js/systems/combat.js` |
| `sfx_pingze.mp3` | 平仄历史更新相关反馈 | `js/systems/combat.js` |

---

## 8. 当前代码未使用单独图片的资源

- **诗句残篇（`PoetryDB`）**：`Game.createPoetryCardDOM` 仅为文字卡片，无独立 `assets/poetry_*.png` 约定。
- **图鉴全屏 `#screen-gallery`**：背景为纯色 `var(--ink-bg)`，无专用背景图文件名。
- **Icon / 字体**：界面大量依赖 Unicode 符号与 CSS，无统一 icon 表。

若后续要为诗句或图鉴增加插画，需**新增代码路径**后再把文件名补进本文档。

---

## 9. 交付前自检清单

- [ ] 上述 `assets/` 下文件与**表内文件名逐字一致**（含 `card_` / `enemy_` 前缀与 `id`、`archKey`）。
- [ ] 在本地用 **HTTP 伺服**打开游戏（避免部分浏览器对 `file://` 限制音视加载）。
- [ ] 中文文件名音频在目标操作系统与打包流程中无乱码。

---

*文档生成依据：仓库内 `css/style.css`、`index.html`、`js/systems/game.js`、`js/systems/combat.js`、`js/systems/map.js`、`js/data/enemies.js`、`js/data/cards.js`、`js/core/audio.js` 的引用。*
