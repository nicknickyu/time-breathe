import { _decorator, Component, Node, Label } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 通用对话框视图
 * 展示文本信息和确认/取消按钮，通过回调返回用户选择
 */
@ccclass('DialogView')
export class DialogView extends Component {
    private _confirmCallback: (() => void) | null = null;
    private _cancelCallback: (() => void) | null = null;

    onLoad(): void {
        this.node.active = false;
    }

    /** 显示对话框，设置文本和按钮回调 */
    show(text: string, onConfirm?: () => void, onCancel?: () => void): void {
        this._confirmCallback = onConfirm ?? null;
        this._cancelCallback = onCancel ?? null;

        const labelNode = this._findDescendant(this.node, 'TextContent');
        if (labelNode) {
            labelNode.getComponent(Label)!.string = text;
        }

        this._wireButtons();
        this.node.active = true;
    }

    /** 隐藏对话框并清理按钮监听 */
    hide(): void {
        this._confirmCallback = null;
        this._cancelCallback = null;
        this.node.active = false;
    }

    private _wireButtons(): void {
        const panelNode = this._findDescendant(this.node, 'Panel');
        if (!panelNode) return;

        const confirmNode = this._findDescendant(panelNode, 'ConfirmButton');
        if (confirmNode) {
            confirmNode.once(Node.EventType.TOUCH_END, () => {
                if (this._confirmCallback) this._confirmCallback();
            }, this);
        }

        const cancelNode = this._findDescendant(panelNode, 'CancelButton');
        if (cancelNode) {
            cancelNode.once(Node.EventType.TOUCH_END, () => {
                if (this._cancelCallback) this._cancelCallback();
            }, this);
        }
    }

    /** DFS 查找指定名称的后代节点 */
    private _findDescendant(parent: Node, name: string): Node | null {
        for (const child of parent.children) {
            if (child.name === name) return child;
            const found = this._findDescendant(child, name);
            if (found) return found;
        }
        return null;
    }
}
