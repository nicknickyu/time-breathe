import { _decorator, Component, Prefab, Node, SpriteFrame, instantiate, Vec3 } from 'cc';
import { TerrainType } from '../data/TerrainType';
import { HexGridManager } from '../logic/HexGridManager';
import { HexCellView } from './HexCellView';
import { HexCellRockView } from './HexCellRockView';
const { ccclass, property } = _decorator;

/**
 * 网格视图
 * 负责创建和更新六边形地形网格的视觉表现
 */
@ccclass('GridView')
export class GridView extends Component {
    @property(Prefab)
    hexCellPrefab: Prefab | null = null;

    private _spriteFrames: Map<TerrainType, SpriteFrame> = new Map();
    private _cellNodes: Map<string, Node> = new Map();
    private _cellBaseY: Map<string, number> = new Map();
    private _onCellTapCb: ((col: number, row: number) => void) | null = null;

    init(prefab: Prefab | null, spriteFrames: Map<TerrainType, SpriteFrame>): void {
        this.hexCellPrefab = prefab;
        this._spriteFrames = spriteFrames;
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

    /** 更新单个格子的地形显示 */
    updateCellVisual(col: number, row: number, type: TerrainType): void {
        const node = this._cellNodes.get(`${col},${row}`);
        if (!node) return;
        const view = node.getComponent(HexCellView);
        if (view) {
            view.setTerrain(type);
            view.setHighlight(false);
        }

        // 动态管理 HexCellRockView：岩石格子动态添加，非岩石清除
        this._syncRockView(node, type);
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
            view.setSpriteFrames(this._spriteFrames);
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
                const rockSf = this._spriteFrames.get(TerrainType.ROCK);
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
}
