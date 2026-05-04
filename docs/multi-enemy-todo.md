# 多敌人系统待办（Multi-Enemy TODO）

> 当前战斗系统为**单敌**实现：`State.combat.enemy` 是单对象，所有"对所有敌人 / 血量最高敌人 / 随机其他敌人"
> 等描述实际只作用在唯一敌人上，但**不影响游戏闭环**。地图节点暂未引入多敌战斗。
> 
> 当多敌系统接入时，需要按本文清单逐项校验/补全。

## 数据结构改造

- `State.combat.enemy: object` → `State.combat.enemies: Array<EnemyInstance>`
- `State.combat.enemy` 兼容字段保留为 `enemies[0]` 或弃用（要全局回查所有引用）
- 渲染：`#enemy` DOM 改为多容器，每个敌人独立 sprite / hp / intent / status-bar
- 选目标：玩家拖拽攻击牌时高亮所有敌人，松开时落到具体目标上；非目标性效果默认所有敌人/随机敌人
- 敌人 AI：每个敌人独立 `intent / act`，`enemyTurn` 串行结算

## 卡面与现状偏差（按 ID 列出，多敌系统接入后**必须**重新实现）

| 卡 ID | 名称 | 现状（单敌） | 多敌应实现 |
|---|---|---|---|
| **c12** | 刺击 | `dealDmg(-1)` 仅打当前唯一敌 | 对所有敌人各造 1 次 -1 伤 |
| **c22** | 歃血为盟 | `enemy.weak += 3; enemy.vuln += 3` | 给所有敌人各 +3 虚弱 +3 易伤 |
| **c26** | 万夫莫开 | `enemy.weak += 1` | 给所有敌人 +1 虚弱 |
| **c28** | 白虹贯日 | `dealDmg(5)` | 对所有敌人 5 伤；血量最高的额外 ×2 |
| **c33** | 流星落月 | 仅 `Game.showToast` | 功法：每次造成伤害若有溢出，溢出量随机分配给一名其它敌人 |
| **c42** | 城焚烬余 | 当前 `dealDmg(-3)` X 次，作用于唯一敌 | 每次伤害都对所有敌人各造一次 |
| **c44** | 唇枪舌剑 | 已实现：每打仄牌 → `dealDmg(-5)`（单敌） | 改为：每打仄牌 → 随机选 1 名敌人 `dealDmg(-5)` |

## 战斗逻辑钩子（多敌系统需补的判定）

1. **`Combat.dealDmg`** 需支持目标参数：`dealDmg(base, isFixed, targetIdx?)`，未提供时默认 `0` 或玩家最近选择的目标。
2. **`Combat.dealDmgAll(base, isFixed)`** 新工具：对所有存活敌人各结算一次。
3. **存活判定**：每次扣血后检查该敌是否阵亡（`hp <= 0`），并从 `enemies` 移除（或保留 hp:0 的 dead 标志）。所有敌人均阵亡时触发胜利结算。
4. **AI 顺序**：`enemyTurn` 遍历所有 `enemies` 串行 act；中途若敌人因 buff 被击杀，仍保留意图但跳过执行。
5. **状态条**：`updateStatusBar` 改为遍历每个敌人渲染独立栏。
6. **DragSys**：拖到任一敌人头顶判 hit。

## Poetry / Settlement 关联

- `wuGouShuangXueMing.trigger`：当前 `Combat.dealDmg(30, true)`，多敌系统下应改为 `Combat.dealDmgAll(30, true)`，
  与"对敌方所有敌人造成 30 点伤害"的卡面描述对齐。
- 多敌战斗的结算奖励应按击杀总数 / 是否含精英进行调整（当前结算只看 `enemyId === 'e2'`）。

## UI / 视觉

- `#enemy` 容器→ `#enemy-list`，根据 `enemies.length` 等距分布。
- 击杀动画：sprite fade-out + `enemies.splice`。
- 多敌时拖卡视觉：所有可受击目标高亮，鼠标悬停时唯一目标加描金。

---

接入多敌系统时建议按"数据结构改造 → 战斗钩子工具 → 渲染层 → 卡牌 effect 校核 → Poetry"的顺序推进，
每一项都对照本文逐条点掉。
