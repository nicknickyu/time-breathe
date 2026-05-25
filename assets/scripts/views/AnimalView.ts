import { _decorator, Component, Node, Sprite, SpriteFrame, Label, UITransform, Vec3, Color } from 'cc';
const { ccclass } = _decorator;

@ccclass('AnimalView')
export class AnimalView extends Component {
    private _topSprite: Sprite | null = null;
    private _cntNode: Node | null = null;
    private _cntLabel: Label | null = null;

    /**
     * Explicit init — set up Top sprite and Cnt label.
     * Called after addComponent; does NOT rely on onLoad lifecycle.
     * @param spriteFrame animal image
     * @param count null = hide Cnt (settled animals), number = show count (target animals)
     */
    init(spriteFrame: SpriteFrame, count: number | null): void {
        // Top sprite
        const top = this.node.getChildByName('Top');
        if (top) {
            this._topSprite = top.getComponent(Sprite);
            if (this._topSprite) {
                this._topSprite.spriteFrame = spriteFrame;
            }
        }

        // Cnt label node
        if (!this._cntNode) {
            this._createCntNode();
        }

        if (count !== null) {
            this._cntLabel!.string = String(count);
            this._cntNode!.active = true;
        } else {
            this._cntNode!.active = false;
        }
    }

    private _createCntNode(): void {
        const node = new Node('Cnt');
        const label = node.addComponent(Label);
        label.string = '';
        label.fontSize = 30;
        label.color = new Color(74, 41, 20, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;

        const transform = node.addComponent(UITransform);
        transform.width = 60;
        transform.height = 40;

        node.setPosition(new Vec3(0, -50, 0));
        this.node.addChild(node);

        this._cntNode = node;
        this._cntLabel = label;
    }

    setCount(count: number): void {
        if (this._cntLabel) {
            this._cntLabel.string = String(count);
        }
        if (this._cntNode) {
            this._cntNode.active = true;
        }
    }

    hideCount(): void {
        if (this._cntNode) {
            this._cntNode.active = false;
        }
    }
}
