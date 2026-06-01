# 项目基本信息
项目类型：2D 六边形地图竖版手机游戏
开发引擎：Cocos Creator 3.8.8
核心架构原则：数据、逻辑、视觉三层分离

# 一、AI编程规范
在本项目中，你和用户是协作关系，多用主动的询问沟通来解决问题，不要使用低效的检索
对于编辑和命令行指令：
- 允许ts文件的编辑和新建
- 禁止直接新建或者编辑meta文件，需要更新meta文件时提示用户手动调整
- 有关scene和prefab的节点树信息由用户提供和核实，提升效率，不要去分析prefab的结构


# 二、核心开发原则
三层分离架构：
## 2.1数据层 (Data Layer)       
  - 配置文件使用config类实现，放在scripts/constants/里，目前已有的：Debug配置，游戏文本配置，精灵图映射配置                         
  - 数据模型类，放在scripts/data/里                          
  - 不包含任何逻辑和视觉代码             


## 2.2逻辑层 (Logic Layer)             
  - 负责游戏规则、状态机管理等，使用manager类，放在   scripts/logic/里                             
  - 事件系统放在   scripts/event/里                        
  - 逻辑层只处理逻辑，不直接处理具体的视觉实现 


## 2.3视觉层 (View Layer)              
  - Prefab 和 Scene                       
  - 组件脚本只负责改变显示，处理交互和转发事件）                
  - 动画和特效 


# 三、代码规范
## 3.1 命名规范
- 类名：PascalCase，如 HexGridManager
- 接口名：PascalCase，以 I 开头，如 ITerrainRule
- 变量名：camelCase，如 terrainId
- 常量名：UPPER_SNAKE_CASE，如 MAX_TERRAIN_TYPES
- 私有属性：以 _ 开头，如 _cellData
- 方法名：camelCase，动词开头，如 getCellData()
- 事件名：例如：static readonly CELL_TERRAIN_CHANGED = 'cell-terrain-changed'


## 3.2 注释规范
- 类注释：描述类的职责和用途
- 方法注释：描述方法的功能
- 单行注释：解释复杂逻辑

