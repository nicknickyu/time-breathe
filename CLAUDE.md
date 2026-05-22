# 项目基本信息
项目类型：2D 六边形地图竖版手机游戏
开发引擎：Cocos Creator 3.x
核心架构原则：数据、逻辑、视觉三层分离


# 一、核心开发原则
三层分离架构：
## 1.1数据层 (Data Layer)       
  - XML配置文件                         
  - 数据模型类                          
  - 不包含任何逻辑和视觉代码             


## 1.2逻辑层 (Logic Layer)             
  - 游戏规则                              
  - 状态管理                              
  - 事件系统                              
  - 不依赖具体的视觉实现           


## 1.3视觉层 (View Layer)              
  - Prefab 和 Scene                       
  - 组件脚本只负责改变显示，处理交互和转发事件）                
  - 动画和特效                            



# 二、项目文件结构


TimeBreathe/assets/
-   scenes/                              # 场景文件
-   prefabs/                             # 预制体
-   scripts/data/                            # 数据层（纯数据类）
-   scripts/logic/                           # 逻辑层（纯逻辑，无视觉）
-   scripts/views/                           # 视觉层（只负责显示）
-   scripts/controllers/                     # 控制器（连接逻辑和视图）
-   scripts/managers/                        # 全局管理器（单例）
-   scripts/utils/                           # 工具类（纯函数）
-   scripts/events/                          # 事件定义
-   scripts/constants/                       # 常量定义
-   resources/configs/                       # 配置文件（XML）
-   resources/textures/                        # 贴图资源
-   resources/audio/                           # 音频资源
-   resources/fonts/                           # 字体资源
-   resources/tiles/                           # 地形瓦片资源



# 三、数据层规范
3.1 数据模型类规范
- 数据类后缀：Data 或 Config
- 纯数据类，禁止包含逻辑方法
- 使用 @ccclass 装饰器标记（便于序列化）


3.2 配置加载器类规范
- 职责：加载所有XML配置,解析为数据对象,提供统一的查询接口
- 禁止：包含游戏逻辑;修改配置数据




# 四、逻辑层规范
## 3.1 逻辑类命名规范
- 管理器  Manager 管理某个系统  示例：HexGridManager
- 控制器  Controller  处理交互输入  示例：PlacementController
- 服务  Service 提供功能服务  示例：PathfindingService
- 引擎  Engine  执行规则计算  示例：RuleEngine
- 模型  Model 逻辑数据模型  示例：HexCellModel


## 3.2 事件命名规范
- 使用 kebab-case：cell-terrain-changed
- 格式：对象-动作-状态
- 定义事件常量，避免字符串拼写错误，例如：static readonly CELL_TERRAIN_CHANGED = 'cell-terrain-changed'


## 3.3 事件管理
使用 Cocos 的 EventTarget作为全局事件管理器

# 五、视觉层规范
视觉层职责：
- 监听逻辑层事件和交互动作
- 更新视觉表现
- 播放动画和特效


禁止：
- 包含游戏逻辑
- 直接修改数据模型
- 调用其他视觉组件


# 六、代码规范
## 6.1 命名规范
- 类名：PascalCase，如 HexGridManager
- 接口名：PascalCase，以 I 开头，如 ITerrainRule
- 变量名：camelCase，如 terrainId
- 常量名：UPPER_SNAKE_CASE，如 MAX_TERRAIN_TYPES
- 私有属性：以 _ 开头，如 _cellData
- 方法名：camelCase，动词开头，如 getCellData()


## 6.2 注释规范
- 类注释：描述类的职责和用途
- 方法注释：描述方法的功能
- 单行注释：解释复杂逻辑


