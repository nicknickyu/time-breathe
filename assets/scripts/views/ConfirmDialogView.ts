import { _decorator, Component, Node, Label, UITransform } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 确认对话框视图
 * 提供标题、内容、按钮文本、面板高度的修改功能
 */
@ccclass('ConfirmDialogView')
export class ConfirmDialogView extends Component {
    @property({ type: Label, displayName: '标题' })
    private titleLabel: Label | null = null;

    @property({ type: Label, displayName: '内容' })
    private contentLabel: Label | null = null;

    @property({ type: Node, displayName: '确认按钮' })
    private confirmButton: Node | null = null;

    @property({ type: Node, displayName: '取消/关闭按钮' })
    private cancelButton: Node | null = null;

    @property({ type: Node, displayName: '面板节点' })
    private panelNode: Node | null = null;

    private _confirmCallback: (() => void) | null = null;
    private _cancelCallback: (() => void) | null = null;

    onLoad(): void {
        this.node.active = false;

        if (this.confirmButton) {
            this.confirmButton.on(Node.EventType.TOUCH_END, () => {
                if (this._confirmCallback) this._confirmCallback();
                this.hide();
            }, this);
        }

        if (this.cancelButton) {
            this.cancelButton.on(Node.EventType.TOUCH_END, () => {
                if (this._cancelCallback) this._cancelCallback();
                this.hide();
            }, this);
        }
    }

    /** 设定面板高度 */
    setPanelHeight(height: number): void {
        if (!this.panelNode) return;
        const transform = this.panelNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(transform.contentSize.width, height);
        }
    }

    show(content: string, onConfirm?: () => void, onCancel?: () => void): void {
        this._confirmCallback = onConfirm ?? null;
        this._cancelCallback = onCancel ?? null;
        this.node.active = true;
        if (this.contentLabel) {
            this.contentLabel.string = content;
        }
    }

    hide(): void {
        this._confirmCallback = null;
        this._cancelCallback = null;
        this.node.active = false;
    }

    setTitle(text: string): void {
        if (this.titleLabel) {
            this.titleLabel.string = text;
        }
    }

    setContent(text: string): void {
        if (this.contentLabel) {
            this.contentLabel.string = text;
        }
    }

    setButtonText(text: string): void {
        if (this.confirmButton) {
            const btnLabel = this.confirmButton.getComponentInChildren(Label);
            if (btnLabel) btnLabel.string = text;
        }
    }

    setCancelButtonText(text: string): void {
        if (this.cancelButton) {
            const btnLabel = this.cancelButton.getComponentInChildren(Label);
            if (btnLabel) btnLabel.string = text;
        }
    }
}
