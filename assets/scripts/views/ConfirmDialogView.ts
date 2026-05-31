import { _decorator, Component, Node, Label, UITransform } from 'cc';
const { ccclass } = _decorator;

/**
 * 确认对话框视图
 * 提供标题、内容、按钮文本的修改功能，并自动根据内容调整面板高度
 */
@ccclass('ConfirmDialogView')
export class ConfirmDialogView extends Component {
    private _panelTransform: UITransform | null = null;
    private _titleLabel: Label | null = null;
    private _contentLabel: Label | null = null;
    private _buttonLabel: Label | null = null;
    private _contentNode: Node | null = null;
    private _titleNode: Node | null = null;
    private _buttonLayoutNode: Node | null = null;
    private _confirmCallback: (() => void) | null = null;

    private static readonly CONTENT_PADDING = 120; // top(5+50+10) + bottom(15+50+40)
    private static readonly MIN_PANEL_HEIGHT = 320;

    onLoad(): void {
        this.node.active = false;
        this._cacheNodes();

        // Enable auto-resize for content label
        if (this._contentLabel) {
            this._contentLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
        }

        this._wireConfirmButton();
    }

    show(content: string, onConfirm?: () => void): void {
        this._confirmCallback = onConfirm ?? null;
        // Activate first so Widgets apply correct widths, then set content
        this.node.active = true;
        if (this._contentLabel) {
            this._contentLabel.string = content;
        }
        this._adjustPanelHeight();
    }

    hide(): void {
        this._confirmCallback = null;
        this.node.active = false;
    }

    setTitle(text: string): void {
        if (this._titleLabel) {
            this._titleLabel.string = text;
        }
    }

    setContent(text: string): void {
        if (this._contentLabel) {
            this._contentLabel.string = text;
            this._adjustPanelHeight();
        }
    }

    setButtonText(text: string): void {
        if (this._buttonLabel) {
            this._buttonLabel.string = text;
        }
    }

    private _cacheNodes(): void {
        const panel = this._findDescendant(this.node, 'Panel');
        if (panel) {
            this._panelTransform = panel.getComponent(UITransform);
        }

        this._titleNode = this._findDescendant(this.node, 'TitleContent');
        if (this._titleNode) {
            this._titleLabel = this._titleNode.getComponentInChildren(Label);
        }

        this._contentNode = this._findDescendant(this.node, 'TextContent');
        if (this._contentNode) {
            this._contentLabel = this._contentNode.getComponentInChildren(Label);
        }

        this._buttonLayoutNode = this._findDescendant(this.node, 'ButtonLayout');
        const btnNode = this._findDescendant(this.node, 'ConfirmButton');
        if (btnNode) {
            this._buttonLabel = btnNode.getComponentInChildren(Label);
        }
    }

    private _wireConfirmButton(): void {
        const btnNode = this._findDescendant(this.node, 'ConfirmButton');
        if (btnNode) {
            btnNode.on(Node.EventType.TOUCH_END, () => {
                if (this._confirmCallback) this._confirmCallback();
                this.hide();
            }, this);
        }
    }

    /** 根据内容文本的实际高度调整 Panel 尺寸和子节点位置 */
    private _adjustPanelHeight(): void {
        if (!this._panelTransform || !this._contentNode) return;

        const contentTransform = this._contentNode.getComponent(UITransform);
        if (!contentTransform) return;

        const contentHeight = contentTransform.height;
        const panelHeight = Math.max(
            ConfirmDialogView.MIN_PANEL_HEIGHT,
            contentHeight + ConfirmDialogView.CONTENT_PADDING
        );

        this._panelTransform.setContentSize(
            this._panelTransform.contentSize.width,
            panelHeight
        );

        // Reposition children to fill the resized panel
        const halfHeight = panelHeight / 2;
        this._titleNode?.setPosition(0, halfHeight - 5);
        this._contentNode.setPosition(0, 20);
        this._buttonLayoutNode?.setPosition(0, -halfHeight + 40);
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
