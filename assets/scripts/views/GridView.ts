import { _decorator, Component, Prefab, Node, instantiate, Vec3, Sprite, UITransform, tween } from 'cc';
import { TerrainType } from '../data/TerrainType';
import { HexGridManager } from '../logic/HexGridManager';
import { HexCellView } from './HexCellView';
import { HexCellRockView } from './HexCellRockView';
import { ErosionSourceView } from './ErosionSourceView';
import { ThunderVFXView } from './ThunderVFXView';
import { SpriteConfig } from '../constants/SpriteConfig';
const { ccclass, property } = _decorator;

/**
 * 网格视图
 * 负责创建和更新六边形地形网格的视觉表现
 */
@ccclass('GridView')
export class GridView extends Component {
    @property(Prefab)
    hexCellPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: '闪电特效预制体（ThunderVFX）' })
    thunderVFXPrefab: Prefab | null = null;

    private _spriteConfig: SpriteConfig | null = null;
    private _cellNodes: Map<string, Node> = new Map();
    private _cellBaseY: Map<string, number> = new Map();
    private _onCellTapCb: ((col: number, row: number) => void) | null = null;

    init(prefab: Prefab | null, spriteConfig: SpriteConfig): void {
        this.hexCellPrefab = prefab;
        this._spriteConfig = spriteConfig;
    }

    /** 根据 HexGridManager 数据构建网格节点 */
    buildGrid(): void {
        const mgr = HexGridManager.instance;
        if (!this.hexCellPrefab) return;

        const gridCenterY = 120;

        // Odd-r offset: even cols (higher y) behind, odd cols (shifted lower) on top
        for (let r = 0; r < mgr.rows; r++) {
            for (let ce = 0; ce < mgr.cols; ce += 2) {
                this._createCellNode(ce, r, gridCenterY);
            }
            for (let co = 1; co < mgr.cols; co += 2) {
                this._createCellNode(co, r, gridCenterY);
            }
        }
    }

    /** 注册格子点击回调 */
    onCellTap(cb: (col: number, row: number) => void): void {
        this._onCellTapCb = cb;
    }

    /**
     * 更新单个格子的地形显示
     * @param transitionDuration 传入时长则使用转场效果，否则直接切换
     */
    updateCellVisual(col: number, row: number, type: TerrainType, transitionDuration?: number): void {
        const node = this._cellNodes.get(`${col},${row}`);
        if (!node) return;
        const view = node.getComponent(HexCellView);
        if (view) {
            if (transitionDuration !== undefined) {
                view.startTerrainTransition(type, transitionDuration);
            } else {
                view.setTerrain(type);
            }
            view.setHighlight(false);
        }

        // 动态管理 HexCellRockView：岩石格子动态添加，非岩石清除
        this._syncRockView(node, type);

        // 动态管理 ErosionSourceView：侵蚀源格子添加标记，非侵蚀源清除
        this._syncErosionSourceView(node, type);
    }

    /** 切换格子高亮状态 */
    highlightCell(col: number, row: number, active: boolean): void {
        const node = this._cellNodes.get(`${col},${row}`);
        if (!node) return;
        const view = node.getComponent(HexCellView);
        if (view) view.setHighlight(active);
    }

    /** 获取所有格子节点的映射 */
    getAllCellNodes(): Map<string, Node> {
        return this._cellNodes;
    }

    /**
     * 更新格子堆叠高度（仅 ROCK 地形生效，由 HexCellRockView 处理）
     */
    setCellHeight(col: number, row: number, height: number): void {
        const node = this._cellNodes.get(`${col},${row}`);
        if (!node) return;
        const rockView = node.getComponent(HexCellRockView);
        if (rockView) {
            rockView.setHeight(height);
        }
    }

    /**
     * 从最近的侵蚀源飞出一个侵蚀标记到目标格子位置
     * 创建临时 Sprite 节点，沿抛物线弧飞向目标并自旋，到达后销毁
     */
    playErosionFlyEffect(col: number, row: number, duration: number): void {
        const mgr = HexGridManager.instance;

        // 1. 查找最近的侵蚀源坐标
        let sourceCol = -1;
        let sourceRow = -1;
        let nearestDist = Infinity;

        for (const cell of mgr.getAllCells()) {
            if (cell.terrainType === TerrainType.EROSION_SOURCE) {
                const dist = Math.abs(cell.gridX - col) + Math.abs(cell.gridY - row);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    sourceCol = cell.gridX;
                    sourceRow = cell.gridY;
                }
            }
        }

        if (sourceCol < 0) return; // 没有侵蚀源

        // 2. 获取起止位置（相对于 GridView 节点坐标系）
        const startNode = this._cellNodes.get(`${sourceCol},${sourceRow}`);
        const endNode = this._cellNodes.get(`${col},${row}`);
        if (!startNode || !endNode) return;

        const startPos = startNode.getPosition();
        const endPos = endNode.getPosition();

        // 3. 获取标记贴图（没有则跳过）
        const markerSf = this._spriteConfig!.erosionSourceMarkerSprite;
        if (!markerSf) return;

        const flyNode = new Node('ErosionFlyEffect');
        const sprite = flyNode.addComponent(Sprite);
        sprite.spriteFrame = markerSf;
        const uiTransform = flyNode.addComponent(UITransform);
        uiTransform.width = 24;
        uiTransform.height = 24;

        this.node.addChild(flyNode);
        flyNode.setPosition(startPos);

        // 4. 抛物线弧飞行
        const arcHeight = 60;
        const animData = { t: 0 };

        tween(animData)
            .to(duration, { t: 1 }, {
                onUpdate: () => {
                    const t = animData.t;
                    const x = startPos.x + (endPos.x - startPos.x) * t;
                    const y = startPos.y + (endPos.y - startPos.y) * t
                             + arcHeight * Math.sin(Math.PI * t);
                    flyNode.setPosition(x, y);
                },
            })
            .call(() => {
                flyNode.destroy();
            })
            .start();

        // 自旋一周
        tween(flyNode)
            .to(duration, { angle: 360 })
            .start();
    }

    /** 闪电贴图原始高度（用于计算缩放） */
    private static readonly LIGHTNING_TEX_HEIGHT = 512;

    /**
     * 从最近的侵蚀源向目标格子释放闪电特效
     * 在侵蚀源与目标格子中点生成 ThunderVFX 预制体，旋转角度对准方向，
     * 缩放纵向尺寸匹配距离，同时触发颜色渐变动画
     * @param col 目标格子列
     * @param row 目标格子行
     * @param duration 闪电颜色过渡持续秒数
     */
    playThunderVFXEffect(col: number, row: number, duration: number): void {
        const mgr = HexGridManager.instance;

        // 1. 查找最近的侵蚀源坐标
        let sourceCol = -1;
        let sourceRow = -1;
        let nearestDist = Infinity;

        for (const cell of mgr.getAllCells()) {
            if (cell.terrainType === TerrainType.EROSION_SOURCE) {
                const dist = Math.abs(cell.gridX - col) + Math.abs(cell.gridY - row);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    sourceCol = cell.gridX;
                    sourceRow = cell.gridY;
                }
            }
        }

        if (sourceCol < 0) return; // 没有侵蚀源

        // 2. 获取起止位置（相对于 GridView 节点坐标系）
        const startNode = this._cellNodes.get(`${sourceCol},${sourceRow}`);
        const endNode = this._cellNodes.get(`${col},${row}`);
        if (!startNode || !endNode) return;

        const startPos = startNode.getPosition();
        const endPos = endNode.getPosition();

        // 3. 计算中点、方向和距离
        const midX = (startPos.x + endPos.x) / 2;
        const midY = (startPos.y + endPos.y) / 2;
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 纵向缩放：使 512px 高的闪电贴图覆盖两格之间的实际距离
        const scaleY = distance / GridView.LIGHTNING_TEX_HEIGHT;

        // 角度：闪电纹理纵向（angle=0 时贴图朝上），计算旋转使其指向目标方向
        const angle =  - Math.atan2(dx, dy) * 180 / Math.PI;

        // 4. 生成闪电预制体并定位
        if (!this.thunderVFXPrefab) return;
        const vfxNode = instantiate(this.thunderVFXPrefab);
        this.node.addChild(vfxNode);

        vfxNode.setPosition(new Vec3(midX, midY, 0));
        vfxNode.setScale(0.3, scaleY, 1);
        vfxNode.angle = angle;

        // 5. 触发颜色渐变动画（#ffffff → #613075），完成后自动销毁
        const vfxView = vfxNode.getComponent(ThunderVFXView);
        if (vfxView) {
            vfxView.play(duration);
        }
    }

    /** 在指定格子上添加动物节点 */
    addAnimalToCell(col: number, row: number, animalNode: Node, offsetY: number = 40): void {
        const cellNode = this._cellNodes.get(`${col},${row}`);
        if (!cellNode) return;
        animalNode.setPosition(new Vec3(0, offsetY, 0));
        cellNode.addChild(animalNode);
    }

    /** 创建单个格子节点并设置位置、交互 */
    private _createCellNode(c: number, r: number, gridCenterY: number): void {
        const mgr = HexGridManager.instance;
        const node = instantiate(this.hexCellPrefab);
        const view = node.getComponent(HexCellView);
        if (view) {
            view.setSpriteConfig(this._spriteConfig!);
            view.setTerrain(TerrainType.ERODED);
            view.setDebugCoord(c, r);
        }

        const x = (c - (mgr.cols - 1) / 2) * mgr.SPACING_X;
        const y = -(r * mgr.SPACING_Y + (c % 2) * mgr.SPACING_Y / 2) + gridCenterY;
        node.setPosition(new Vec3(x, y, 0));

        this._cellBaseY.set(`${c},${r}`, y);

        this.node.addChild(node);

        const col = c, row = r;
        node.on(Node.EventType.TOUCH_END, () => {
            if (this._onCellTapCb) {
                this._onCellTapCb(col, row);
            }
        });

        this._cellNodes.set(`${c},${r}`, node);
    }

    /**
     * 动态添加或移除 HexCellRockView 组件
     * 岩石格子拥有堆叠能力，其他地形不需要
     */
    private _syncRockView(node: Node, type: TerrainType): void {
        const existing = node.getComponent(HexCellRockView);
        if (type === TerrainType.ROCK) {
            if (!existing) {
                const rockView = node.addComponent(HexCellRockView);
                const rockSf = this._spriteConfig!.getTerrainFrame(TerrainType.ROCK);
                if (rockSf) {
                    rockView.rockSprite = rockSf;
                }
            }
        } else {
            if (existing) {
                existing.clearStacks();
                existing.destroy();
            }
        }
    }

    /**
     * 动态添加或移除 ErosionSourceView 组件
     * 侵蚀源格子拥有标记附着物，其他地形不需要
     */
    private _syncErosionSourceView(node: Node, type: TerrainType): void {
        const existing = node.getComponent(ErosionSourceView);
        if (type === TerrainType.EROSION_SOURCE) {
            if (!existing) {
                const erosionView = node.addComponent(ErosionSourceView);
                const markerSf = this._spriteConfig!.erosionSourceMarkerSprite;
                if (markerSf) {
                    erosionView.setMarkerSprite(markerSf);
                }
            }
        } else {
            if (existing) {
                existing.clearMarker();
                existing.destroy();
            }
        }
    }
}
