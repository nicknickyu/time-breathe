import { _decorator, Component, Node, SpriteFrame, Sprite, Toggle, UITransform, Vec3 } from 'cc';
import { TerrainType } from '../data/TerrainType';
import { DrawGroup } from '../logic/DrawManager';
const { ccclass, property } = _decorator;

@ccclass('DrawPanelView')
export class DrawPanelView extends Component {
    private _groups: DrawGroup[] = [];
    private _spriteFrames: Map<TerrainType, SpriteFrame> = new Map();
    private _confirmCallback: (() => void) | null = null;
    private _confirmNode: Node | null = null;
    private _confirmHandler: (() => void) | null = null;

    onLoad(): void {
        this.node.active = false;
    }

    show(
        groups: DrawGroup[],
        spriteFrames: Map<TerrainType, SpriteFrame>,
        onConfirm: () => void,
    ): void {
        this._groups = groups;
        this._spriteFrames = spriteFrames;
        this._confirmCallback = onConfirm;
        this.node.active = true;

        this._populateSlots();
        this._wireConfirmButton();
    }

    hide(): void {
        // Clean up confirm handler
        if (this._confirmNode && this._confirmHandler) {
            this._confirmNode.off(Node.EventType.TOUCH_END, this._confirmHandler, this);
        }
        this._confirmNode = null;
        this._confirmHandler = null;
        this.node.active = false;
    }

    getSelectedIndex(): number {
        const container = this._findDescendant(this.node, 'DrawContainer');
        if (!container) return 0;

        const toggles = container.getComponentsInChildren(Toggle);
        for (let i = 0; i < toggles.length; i++) {
            if (toggles[i].isChecked) return i;
        }
        return 0;
    }

    private _populateSlots(): void {
        const container = this._findDescendant(this.node, 'DrawContainer');
        if (!container) return;

        const slotNames = ['GroupSlot_0', 'GroupSlot_1', 'GroupSlot_2'];

        for (let g = 0; g < this._groups.length && g < slotNames.length; g++) {
            const slot = this._findDescendant(container, slotNames[g]);
            if (!slot) continue;

            // Remove old icon children except Checkmark
            const toRemove: Node[] = [];
            for (const child of slot.children) {
                if (child.name !== 'Checkmark') toRemove.push(child);
            }
            toRemove.forEach(n => n.destroy());

            // Add 3 terrain icons stacked vertically
            const group = this._groups[g];
            const startY = 35;
            const spacing = 55;

            for (let t = 0; t < group.tiles.length; t++) {
                const icon = new Node('TerrainIcon');
                const sprite = icon.addComponent(Sprite);
                sprite.spriteFrame = this._spriteFrames.get(group.tiles[t]) ?? null;

                const uiTransform = icon.addComponent(UITransform);
                uiTransform.width = 65;
                uiTransform.height = 89;

                icon.setPosition(new Vec3(0, startY - t * spacing, 0));
                icon.setScale(new Vec3(0.42, 0.42, 1));
                slot.addChild(icon);
            }
        }
    }

    private _wireConfirmButton(): void {
        const panel = this._findDescendant(this.node, 'Panel');
        if (!panel) return;
        const confirmNode = this._findDescendant(panel, 'Confirm');
        if (!confirmNode) return;

        this._confirmNode = confirmNode;
        this._confirmHandler = () => {
            if (this._confirmCallback) this._confirmCallback();
        };
        confirmNode.on(Node.EventType.TOUCH_END, this._confirmHandler, this);
    }

    private _findDescendant(parent: Node, name: string): Node | null {
        for (const child of parent.children) {
            if (child.name === name) return child;
            const found = this._findDescendant(child, name);
            if (found) return found;
        }
        return null;
    }
}
