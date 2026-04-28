@index.html 

你是一个资深的游戏前端架构师。当前这个 `index.html` 是一个成型的单文件卡牌肉鸽游戏，但随着加入了法宝、武器、诗句、卡牌、敌人和事件等海量内容，代码已经非常臃肿。
我需要你帮我将这个单文件进行解耦和模块化拆分。

请严格综合考虑游戏中涉及的【所有维度】（玩家基础属性、流派、卡牌、敌人、法宝、武器、诗句、事件），按照以下【架构设计】和【执行红线】进行彻底拆分：

### 一、 架构设计（文件结构与具体内容指派）

请帮我创建以下目录结构，并将 `index.html` 中的代码精准抽离进去：

📂 根目录
 ┣ 📄 index.html        (仅保留纯净的 HTML DOM 骨架，在 <body> 底部按依赖顺序引入以下 JS)
 ┣ 📂 css
 ┃ ┗ 📄 style.css       (抽出 <style> 标签内的所有样式，包含媒体查询和动画)
 ┣ 📂 js
 ┃ ┣ 📂 core           (核心基石层)
 ┃ ┃ ┣ 📄 utils.js      (抽出通用的工具函数，如 rand, shuffle, $(id))
 ┃ ┃ ┣ 📄 state.js      (抽出 State 对象，包含完整的玩家属性 str/def/hp，以及 weapon/relics/poetry/deck 等状态)
 ┃ ┃ ┗ 📄 audio.js      (抽出 AudioSys 音频控制对象)
 ┃ ┣ 📂 data           (静态数据字典层：必须彻底剥离硬编码，方便未来配表)
 ┃ ┃ ┣ 📄 constants.js  (抽出 K 术语悬停字典)
 ┃ ┃ ┣ 📄 classes.js    (【重点】从 HTML 中提取剑、弓、枪等 6 个流派的名字、描述和初始属性，转为字典供后续调用)
 ┃ ┃ ┣ 📄 cards.js      (抽出完整的 50 张卡牌 CardDB)
 ┃ ┃ ┣ 📄 items.js      (【重点】抽出法宝、武器、诗句的数据库，将目前 Settlement 里硬编码的 '【绣剑】'、'【八卦护心镜】' 改为从这里随机抽取)
 ┃ ┃ ┣ 📄 enemies.js    (【重点】将 Combat 里写死的敌人 e1/e2 的血量、贴图、意图 intent 和 AI 行为逻辑，提取为 EnemyDB)
 ┃ ┃ ┗ 📄 events.js     (抽出 Events 对话和节点数据)
 ┃ ┗ 📂 systems        (系统业务逻辑层)
 ┃   ┣ 📄 game.js       (抽出 Game 对象，负责流派选择、信息面板更新、图鉴渲染及各 UI 模块流转)
 ┃   ┣ 📄 map.js        (抽出 MapSys 和 EventSys，负责 SVG 绘制和节点触发)
 ┃   ┣ 📄 combat.js     (抽出 Combat 战斗引擎，注意对接 EnemyDB 和卡牌 effect)
 ┃   ┣ 📄 settlement.js (抽出 Settlement 战利品结算系统，注意对接 items.js 实现武器/法宝/诗句的掉落逻辑)
 ┃   ┗ 📄 fx.js         (抽出 DragSys 卡牌拖拽系统，以及底层的 bgParticles 水墨粒子渲染)

### 二、 执行红线（极其重要，违背会导致游戏直接白屏！）

1. **绝对禁止使用 ES Modules (`export/import`)**：
   由于目前的 HTML 大量使用了内联事件（如 `onclick="Game.navTo()"` 或 `onclick="Combat.endTurn()"`），如果在拆分时使用了 type="module" 或 import，会导致作用域隔离，HTML 找不到这些对象！
   **正确做法**：直接在对应的 JS 文件中声明 `const Game = {...}` 或 `window.Game = {...}`。
2. **<script> 标签的引入顺序必须严谨**：
   在 `index.html` 底部引入时，请遵循以下顺序，确保被依赖的文件先加载：
   `utils.js` -> `state.js` -> `audio.js` -> `constants.js` -> `classes.js` -> `cards.js` -> `items.js` -> `enemies.js` -> `events.js` -> `game.js` -> `combat.js` -> `settlement.js` -> `map.js` -> `fx.js`
3. **保持原有游戏逻辑与计算公式不变**：
   这是一次代码结构重构（Refactoring），绝对不能破坏原有的力/御伤害计算公式、平仄系统判定以及各类卡牌的特殊效果。
4. **数据驱动化改造**：
   原结算逻辑中写死了 `isElite ? '【绣剑】' : null`，在拆分到 `settlement.js` 时，请把它修改为从 `items.js`（例如 `WeaponDB` 和 `RelicDB`）中进行抽取，哪怕目前数据库里只有这两个物品。同样，图鉴中的“流派选择”也请尽量通过 `classes.js` 的数据来渲染。

请分步骤执行：
第一步：提取 CSS 和 `js/core/` 的基础文件。
第二步：提取 `js/data/` 下的所有字典文件（务必仔细提炼 HTML 和 Combat 中写死的数据）。
第三步：提取 `js/systems/` 下的业务逻辑文件。
第四步：输出清理完毕的 `index.html`。
开始工作吧。