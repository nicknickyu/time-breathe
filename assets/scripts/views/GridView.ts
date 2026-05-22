import { _decorator, Component, Prefab, Node, SpriteFrame, instantiate, Vec3 } from 'cc';
import { TerrainType } from '../data/TerrainType';
import { HexGridManager } from '../logic/HexGridManager';
import { HexCellView } from './HexCellView';
const { ccclass, property } = _decorator;

@ccclass('GridView')
export class GridView extends Component {
    @property(Prefab)
    hexCellPrefab: Prefab | null = null;

    private _spriteFrames: Map<TerrainType, SpriteFrame> = new Map();
    private _cellNodes: Map<string, Node> = new Map();
    private _onCellTapCb: ((col: number, row: number) => void) | null = null;

    /**
     * Initialize with prefab and preloaded sprite frames, then build the grid.
     */
    init(prefab: Prefab | null, spriteFrames: Map<TerrainType, SpriteFrame>): void {
        this.hexCellPrefab = prefab;
        this._spriteFrames = spriteFrames;
    }

    buildGrid(): void {
        const mgr = HexGridManager.instance;
        if (!this.hexCellPrefab) return;

        const gridCenterY = 250;

        // Odd-r offset: odd cols are shifted down, so within each row
        // even cols (higher y) are behind, odd cols (shifted lower) on top
        for (let r = 0; r < mgr.rows; r++) {
            for (let ce = 0; ce < mgr.cols; ce += 2) {
                this._createCellNode(ce, r, gridCenterY);
            }
            for (let co = 1; co < mgr.cols; co += 2) {
                this._createCellNode(co, r, gridCenterY);
            }
        }
    }

    onCellTap(cb: (col: number, row: number) => void): void {
        this._onCellTapCb = cb;
    }

    updateCellVisual(col: number, row: number, type: TerrainType): void {
        const node = this._cellNodes.get(`${col},${row}`);
        if (!node) return;
        const view = node.getComponent(HexCellView);
        if (view) {
            view.setTerrain(type);
            view.setHighlight(false);
        }
    }

    highlightCell(col: number, row: number, active: boolean): void {
        const node = this._cellNodes.get(`${col},${row}`);
        if (!node) return;
        const view = node.getComponent(HexCellView);
        if (view) view.setHighlight(active);
    }

    getAllCellNodes(): Map<string, Node> {
        return this._cellNodes;
    }

    private _createCellNode(c: number, r: number, gridCenterY: number): void {
        const mgr = HexGridManager.instance;
        const node = instantiate(this.hexCellPrefab);
        const view = node.getComponent(HexCellView);
        if (view) {
            view.setSpriteFrames(this._spriteFrames);
            view.setTerrain(TerrainType.EMPTY);
        }

        const x = (c - (mgr.cols - 1) / 2) * mgr.SPACING_X;
        const y = -(r * mgr.SPACING_Y + (c % 2) * mgr.SPACING_Y / 2) + gridCenterY;
        node.setPosition(new Vec3(x, y, 0));

        this.node.addChild(node);

        const col = c, row = r;
        node.on(Node.EventType.TOUCH_END, () => {
            if (this._onCellTapCb) {
                this._onCellTapCb(col, row);
            }
        });

        this._cellNodes.set(`${c},${r}`, node);
    }
}
