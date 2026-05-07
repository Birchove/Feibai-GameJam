@index.html 

你是一个资深的游戏前端架构师。`index.html` 单文件拆分工作已经完成，当前项目进入“模块化后维护阶段”。
本文件不再作为拆分指令，而是作为**现状对照说明**，用于后续迭代时快速校验结构是否被破坏。

请严格综合考虑游戏中涉及的【所有维度】（玩家基础属性、流派、卡牌、敌人、法宝、武器、诗句、事件），按照以下【架构现状】和【维护红线】执行后续开发：

### 一、 架构现状（文件结构与职责）

当前项目目录如下（已落地）：

📂 根目录
 ┣ 📄 index.html        (纯 DOM 骨架 + 内联事件入口 + 依赖脚本引入)
 ┣ 📂 css
 ┃ ┗ 📄 style.css       (全局样式、媒体查询、动画、战斗与结算 UI)
 ┣ 📂 js
 ┃ ┣ 📂 core           (核心基石层)
 ┃ ┃ ┣ 📄 utils.js      (通用工具函数、关键词 tooltip 绑定)
 ┃ ┃ ┣ 📄 state.js      (State 全局状态树：玩家、地图、战斗)
 ┃ ┃ ┗ 📄 audio.js      (AudioSys 音频控制)
 ┃ ┣ 📂 data           (静态数据字典层)
 ┃ ┃ ┣ 📄 constants.js  (K 术语悬停字典)
 ┃ ┃ ┣ 📄 classes.js    (流派字典：剑、弓、枪、毒、棍、拳)
 ┃ ┃ ┣ 📄 cards.js      (CardDB 卡牌数据库)
 ┃ ┃ ┣ 📄 items.js      (WeaponDB / RelicDB / 掉落相关字典)
 ┃ ┃ ┣ 📄 enemies.js    (EnemyArchetypes + EncounterDB)
 ┃ ┃ ┣ 📄 events.js     (章节节点、剧情事件与地图数据)
 ┃ ┃ ┗ 📄 poetry.js     (PoetryDB 诗句触发与效果描述)
 ┃ ┗ 📂 systems        (系统业务逻辑层)
 ┃   ┣ 📄 game.js       (全局流程、界面流转、信息面板、图鉴)
 ┃   ┣ 📄 map.js        (MapSys / EventSys，地图渲染与节点进入)
 ┃   ┣ 📄 combat.js     (Combat 战斗引擎，已接入多敌结构)
 ┃   ┣ 📄 settlement.js (战利品结算与领取流程)
 ┃   ┣ 📄 fx.js         (DragSys 拖拽系统、背景粒子等视觉反馈)
 ┃   ┗ 📄 dev.js        (开发辅助面板与调试快捷逻辑)

### 二、 维护红线（极其重要，违背会导致游戏白屏或行为错乱）

1. **绝对禁止使用 ES Modules (`export/import`)**：
   由于 HTML 大量依赖内联事件（如 `onclick="Game.navTo()"` / `onclick="Combat.endTurn()"`），使用 `type="module"` 会导致作用域隔离、全局对象丢失。
   **正确做法**：继续保持全局对象写法（`const Game = {...}` / `window.Game = ...`）。
2. **<script> 标签引入顺序必须严谨**：
   `utils.js` -> `state.js` -> `audio.js` -> `constants.js` -> `classes.js` -> `cards.js` -> `items.js` -> `enemies.js` -> `events.js` -> `poetry.js` -> `game.js` -> `combat.js` -> `settlement.js` -> `map.js` -> `fx.js` -> `dev.js`
3. **保持既有公式与判定不变（除非明确重做设计）**：
   伤害/持守计算、平仄触发、势爆发、功法单战斗封存等机制，必须与当前 `combat.js` 运行逻辑一致。
4. **继续数据驱动化，不回退硬编码**：
   卡牌、敌人、法宝、武器、诗句、事件均优先改 `js/data/*` 字典，不要把可配置内容重新写死到 `systems` 里。

### 三、 当前实现边界（避免误判）

1. 流派字典为 6 个，但可开局流派当前仅开放「剑」。
2. 战斗系统当前为多敌结构：主字段是 `State.combat.enemies`，`State.combat.enemy` 仅兼容首敌别名。
3. 存档槽 UI 已有，但当前版本未接入 `localStorage` 持久化。