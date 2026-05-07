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

### 5.1 常规与秘籍牌（c1–c50）

| 文件名 | 卡牌名（`CardDB`） |
|--------|-------------------|
| `card_c1.png` | 横劈 |
| `card_c2.png` | 闪避 |
| `card_c3.png` | 蝶恋花 |
| `card_c4.png` | 点水 |
| `card_c5.png` | 绣剑 |
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
开场 PV 等仍可使用 **`AudioSys.playBGM(路径)`** 直链（会清除当前 track 标记）。

| 资产文件名 | 用途 | 引用位置 |
|-----------|------|----------|
| `bgm_boss.mp3` | **Boss 战**：地图节点「鬼门关」，遭遇 `enc_yan_luo_wang` | `js/systems/combat.js` → `Combat.start` |
| `bgm_combat.mp3` | **战斗**（除 Boss 战外所有遭遇） | `js/systems/combat.js` → `Combat.start` |
| `bgm_world.mp3` | **探索**：大地图 + 事件界面（共用同一曲） | `js/systems/game.js`（`initGame`）、`js/systems/map.js`（`EventSys.start`）、`js/systems/combat.js`（撤离战斗、胜利进结算前） |
| `铁雨尘朝.mp3` | （可选）播放开场 PV 时与视频同步 | `js/systems/game.js` → `selectSave` |

迁移说明：原先使用的 **`bgm_map.mp3`** 请改名为或替换为 **`bgm_world.mp3`**，与上表一致。

注意：`铁雨尘朝.mp3` 为**中文文件名**，落盘时需与代码字符串完全一致（含编码），避免部署后 404。

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
