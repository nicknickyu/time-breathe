# Design PRD — TimeBreathe

> 2D 六边形地图竖版手机游戏 · Cocos Creator 3.x · TypeScript · 放置解谜

---

## 1. 游戏概述

玩家通过抽取地形块、放置到六边形网格上，观察地形自动演化，在 3 轮内构建最佳地形布局。最终吸引野生动物入住栖息地，获取最高分数。

### 核心循环

```
生成目标动物 → 抽取地形 → 放置 → 演化（×3 轮）→ 动物入住 → 结算
```

---

## 2. 游戏流程详述

### 2.0 阶段枚举

| 阶段 | 说明 |
|------|------|
| INIT | 初始化阶段 |
| DRAW | 抽取地形块 |
| PLACE | 玩家放置地形块 |
| EVOLVE | 地形自动演化 |
| SETTLE | 动物入住 |
| SCORE | 结算评分 |

### 2.1 初始化

- 创建 **12 列 × 4 行** 六边形网格，odd-r 偏移坐标系
- 所有格子初始化为 EMPTY 地形
- 初始化视觉组件：GridView、HandCardView、DrawPanelView
- 启动目标动物生成流程

### 2.2 目标动物生成

- 随机生成 3 种目标动物：**BISON（野牛）**、**OWL（猫头鹰）**、**HIPPO（河马）**
- 每种动物需求数量 2~4 随机
- 目标动物逐个显示在屏幕上方（间隔 500ms），带剩余数量标签
- 显示完毕自动进入抽取阶段

### 2.3 抽取阶段（DRAW）

- 游戏从 GRASS / ROCK / WATER 三种地形中随机生成 **3 组**，每组 **3 块**
- 每组内地形的每种随机独立
- 玩家通过 UI Toggle 选择一组，点击"确认"按钮
- 选中组的地形块成为当前**手牌**，进入放置阶段
- 手牌在屏幕底部横向排列显示

### 2.4 放置阶段（PLACE）

- **先选手牌，再点格子**：点击手牌中的地形块选中，再次点击取消选中
- 选中手牌后点击网格空位 → 地形块放置到该格，手牌移除该卡
- 若网格已满，自动跳过放置直接进入演化
- 手牌全部用完或网格已满 → 进入演化阶段

### 2.5 演化阶段（EVOLVE）

- 每轮固定 **6 tick**，每个 tick 间隔 **500ms**
- 演化基于**快照机制**：tick 开始时固定所有格子的当前状态，根据规则计算变化，防止同 tick 内的连锁反应

#### 地形演化规则

| 地形 | 演化行为 |
|------|----------|
| **ROCK** | 每 3 tick 当前高度 +1，并向邻接的 EMPTY 格子随机扩散 1 格 |
| **GRASS** | 每 tick 检测 3 步范围内是否有 WATER；有则 90% 概率向邻接 EMPTY 格子扩散 1 格 |
| **WATER** | 每 tick 50% 概率触发扩散，覆盖最多 3 个邻接 EMPTY 格子 |
| **EMPTY** | 每 tick 70% 概率侵蚀 1 格邻接的 WATER，70% 概率侵蚀 1 格邻接的 GRASS |

### 2.6 轮次循环

- 游戏共 **3 轮**
- 每轮流程：抽取 → 放置 → 演化
- 每轮演化完成后计算**本轮地形分**（每个非空格 = 1 分）累加至总分
- 3 轮结束后进入动物入住阶段

### 2.7 动物入住阶段（SETTLE）

- 逐一检查每种目标动物，尝试入住符合条件的网格（间隔 500ms）
- 已满或无法入住的动物类型自动跳过

#### 入住条件

| 动物 | 条件 |
|------|------|
| **BISON（野牛）** | 格子为 GRASS，且所有邻格都是 GRASS |
| **OWL（猫头鹰）** | 格子为 ROCK，且 height > 3 |
| **HIPPO（河马）** | 格子为 WATER，且所有邻格都是 WATER 或 EMPTY |

- 每入住一只动物 +5 分
- 已入住的格子上方显示动物精灵图，剩余数量实时更新

### 2.8 结算

- 弹出对话框，显示最终总分
- 总分公式：`∑(每轮非空格数) + 入住动物数 × 5`

---

## 3. 架构：三层分离

```
┌──────────────────────────────────────────────────────────┐
│  Data Layer（scripts/data/）                             │
│  HexCellData · TerrainType · AnimalData                  │
├──────────────────────────────────────────────────────────┤
│  Logic Layer（scripts/logic/）                           │
│  HexGridManager · DrawManager · TerrainEvolutionManager  │
│  GameStateManager · ScoreManager · AnimalSettlementMgr   │
├──────────────────────────────────────────────────────────┤
│  View Layer（scripts/views/）                            │
│  GridView · HexCellView · HandCardView                   │
│  DrawPanelView · AnimalView · DialogView                 │
├──────────────────────────────────────────────────────────┤
│  Controller Layer（scripts/controllers/）                │
│  GameController — 串联逻辑与视觉，驱动游戏流程           │
└──────────────────────────────────────────────────────────┘
```

### 3.1 数据层

| 文件 | 内容 |
|------|------|
| `data/TerrainType.ts` | 地形枚举：EMPTY、GRASS、ROCK、WATER |
| `data/HexCellData.ts` | 格子数据模型（坐标、地形类型、堆叠高度） |
| `data/AnimalData.ts` | 动物类型枚举 + 目标动物接口 |

### 3.2 逻辑层

所有管理器为**单例**。

| 管理器 | 文件 | 职责 |
|--------|------|------|
| GameStateManager | `logic/GameStateManager.ts` | 游戏阶段状态机，变更时触发 state-changed 事件 |
| HexGridManager | `logic/HexGridManager.ts` | 六边形网格增删查、坐标转换、邻居查询 |
| DrawManager | `logic/DrawManager.ts` | 生成 3 组随机地形、管理手牌 |
| TerrainEvolutionManager | `logic/TerrainEvolutionManager.ts` | 地形自动演化规则引擎 |
| ScoreManager | `logic/ScoreManager.ts` | 总分管理：地形分 + 动物分 |
| AnimalSettlementManager | `logic/AnimalSettlementManager.ts` | 目标动物生成、栖息地合法性判定 |

### 3.3 视觉层

| 视图 | 文件 | 职责 |
|------|------|------|
| GridView | `views/GridView.ts` | 构建网格节点、更新地形显示、格子点击回调、添加动物节点 |
| HexCellView | `views/HexCellView.ts` | 单个格子的地形贴图、ROCK 堆叠效果、选中高亮 |
| HandCardView | `views/HandCardView.ts` | 手牌展示、选中/移除 |
| DrawPanelView | `views/DrawPanelView.ts` | 抽取面板、三组预览、确认交互 |
| AnimalView | `views/AnimalView.ts` | 动物精灵 + 剩余数量标签 |
| DialogView | `views/DialogView.ts` | 通用对话框（文本 + 确认/取消按钮） |

### 3.4 控制器

| 文件 | 职责 |
|------|------|
| `controllers/GameController.ts` | 完全串联全流程，连接逻辑层与视觉层 |

### 3.5 事件系统

| 事件 | 触发时机 |
|------|----------|
| `state-changed` | 游戏阶段切换 |
| `draw-phase-start` | 进入抽取阶段 |
| `draw-confirmed` | 玩家确认抽取 |
| `grid-cell-tapped` | 玩家点击格子 |
| `hand-card-selected` | 玩家选中手牌 |
| `all-placed` | 所有手牌放置完毕 |
| `evolution-tick` | 每次演化 tick |
| `evolution-complete` | 演化完成 |
| `score-updated` | 分数更新 |
| `animal-generated` | 目标动物生成 |
| `animal-settled` | 动物入住 |
| `settlement-complete` | 全部动物入住完成 |

---

## 4. 六边形网格系统

### 4.1 坐标系

- **odd-r 偏移坐标系**
- 奇数列（col % 2 === 1）向下偏移半格
- 12 列 × 4 行

### 4.2 邻格计算

每个格子最多 6 个邻格：
- 偶数列邻格：左、右、左上、右上、左下、右下
- 奇数列邻格：左、右、左上、右上、左下、右下（row 偏移方向相反）

### 4.3 格子属性

| 属性 | 类型 | 说明 |
|------|------|------|
| terrainType | TerrainType | EMPTY / GRASS / ROCK / WATER |
| height | number | 堆叠高度（仅 ROCK 使用，演化时每 3 tick +1） |
| gridX / gridY | number | 网格坐标 |

### 4.4 堆叠视觉效果

- ROCK 每层高度在格子上方 22px 处叠加一个岩石贴图
- 其他地形无堆叠效果

### 4.5 网格排版

- SPACING_X = 32，SPACING_Y = 102
- CELL_WIDTH = 65，CELL_HEIGHT = 65

---

## 5. 资源与美术

### 5.1 地块贴图

| 地形 | 路径 | 尺寸 |
|------|------|------|
| GRASS（草地） | `resources/tiles/tileGrass.png` | 65×89 |
| ROCK（山地） | `resources/tiles/tileRock_full.png` | 65×89 |
| WATER（水源） | `resources/tiles/tileWater.png` | 65×89 |
| EMPTY（空地） | `resources/tiles/tileSand_full.png` | 65×89 |

贴图为尖顶六边形（等距视角），65×89 包含顶面和两侧平行四边形高度区域。

### 5.2 动物贴图

| 动物 | 路径 |
|------|------|
| BISON（野牛） | `resources/animals/bison.png` |
| OWL（猫头鹰） | `resources/animals/owl.png` |
| HIPPO（河马） | `resources/animals/hippo.png` |

### 5.3 UI 配色

| 用途 | 色值 |
|------|------|
| 游戏背景 | #AFE8EE |
| Panel 底色 | #6E4529 |
| 深色背景 | #462914，边框 #754F32 |
| 浅色背景 | #E8DFC3，边框 #D2C2A1 |
| 深色字体 | #745C43 |
| 浅色字体 | #E6DDC3 |
| 深色 Icon | #AD8159 |
| 浅色 Icon | #E6DCBE |

---

## 6. 计分规则

| 来源 | 分值 |
|------|------|
| 每轮非空格子 | 每个 1 分，每轮演化完成后结算 |
| 入住动物 | 每只 5 分 |

---

## 7. 调试功能

- `constants/DebugConfig.ts` — `DEBUG_LABEL` 开关格子坐标标签显示
- 演化 tick 输出统计日志：GRASS 总数 / 检测到 WATER 数 / 实际扩散数

---

## 8. 当前版本限制

- 无音频系统
- 无动画系统（除演化 tick 间隔延时外）
- 无存储/存档系统
- 无新关卡设计（固定 12×4 网格 + 3 轮）
- 抽取面板使用 UI Toggle 组件，非自定义手势交互
- 放置操作为"先选手牌再点格子"，无拖拽放置
