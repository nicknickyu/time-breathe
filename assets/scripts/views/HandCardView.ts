import { _decorator, Component, Node, SpriteFrame, Prefab, instantiate, Sprite, Vec3, UITransform } from 'cc';
import { TerrainType } from '../data/TerrainType';
import { HexCellView } from './HexCellView';
const { ccclass, property } = _decorator;

@ccclass('HandCardView')
export class HandCardView extends Component {
    @property(Prefab)
    hexCellPrefab: Prefab | null = null;

    @property(Node)
    handCardsContainer: Node | null = null;

    private _spriteFrames: Map<TerrainType, SpriteFrame> = new Map();
    private _cardNodes: Node[] = [];
    private _currentTiles: TerrainType[] = [];
    private _selectedIndex: number = -1;
    private _onCardSelectedCb: ((index: number) => void) | null = null;

    init(prefab: Prefab | null, spriteFrames: Map<TerrainType, SpriteFrame>): void {
        this.hexCellPrefab = prefab;
        this._spriteFrames = spriteFrames;
    }

    showHand(tiles: TerrainType[]): void {
        this.clear();
        this._currentTiles = [...tiles];
        this._selectedIndex = -1;

        const spacingX = 140;

        for (let i = 0; i < tiles.length; i++) {
            let node: Node;
            if (this.hexCellPrefab) {
                node = instantiate(this.hexCellPrefab);
                const view = node.getComponent(HexCellView);
                if (view) {
                    view.setSpriteFrames(this._spriteFrames);
                    view.setTerrain(tiles[i]);
                }
            } else {
                node = new Node('HandCard');
                const sprite = node.addComponent(Sprite);
                sprite.spriteFrame = this._spriteFrames.get(tiles[i]) ?? null;
                const uiTransform = node.addComponent(UITransform);
                uiTransform.width = 65;
                uiTransform.height = 89;
            }

            // Position centered within the container
            const container = this.handCardsContainer;
            const localX = (i - (tiles.length - 1) / 2) * spacingX;
            node.setPosition(new Vec3(localX, 0, 0));
            node.setScale(new Vec3(0.9, 0.9, 1));

            node.on(Node.EventType.TOUCH_END, () => {
                if (this._onCardSelectedCb) {
                    const idx = this._cardNodes.indexOf(node);
                    if (idx >= 0) this._onCardSelectedCb(idx);
                }
            });

            if (container) {
                container.addChild(node);
            } else {
                this.node.addChild(node);
            }
            this._cardNodes.push(node);
        }
    }

    onCardSelected(cb: (index: number) => void): void {
        this._onCardSelectedCb = cb;
    }

    setSelected(index: number): void {
        this._selectedIndex = index;
        for (let i = 0; i < this._cardNodes.length; i++) {
            const view = this._cardNodes[i].getComponent(HexCellView);
            if (view) {
                view.setHighlight(i === index);
            }
        }
    }

    removeCard(handIndex: number): void {
        if (handIndex < 0 || handIndex >= this._cardNodes.length) return;

        this._cardNodes[handIndex].destroy();
        this._cardNodes.splice(handIndex, 1);
        this._selectedIndex = -1;
    }

    clear(): void {
        for (const node of this._cardNodes) {
            node.destroy();
        }
        this._cardNodes = [];
        this._currentTiles = [];
        this._selectedIndex = -1;
    }
}
