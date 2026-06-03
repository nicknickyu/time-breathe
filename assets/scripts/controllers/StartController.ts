import { _decorator, Component, director, Node, tween, Vec3 } from 'cc';
const { ccclass } = _decorator;

@ccclass('StartController')
export class StartController extends Component {
    start() {
        this._initTitleAnimation();
        this._initStartButton();
    }

    /** Title 节点：缓慢上下浮动 5px */
    private _initTitleAnimation() {
        const titleNode = this.node.name === 'Title'
            ? this.node
            : this.node.getChildByName('Title');
        if (!titleNode) return;

        tween(titleNode)
            .by(0.7, { position: new Vec3(0, 15, 0) })
            .by(0.7, { position: new Vec3(0, -15, 0) })
            .union()
            .repeatForever()
            .start();
    }

    /** StartButton 节点：按下缩小至 0.95，松开恢复并跳转场景 */
    private _initStartButton() {
        const btnNode = this.node.name === 'StartButton'
            ? this.node
            : this.node.getChildByName('StartButton');
        if (!btnNode) return;

        btnNode.on(Node.EventType.TOUCH_START, () => {
            btnNode.setScale(new Vec3(0.95, 0.95, 1));
        });
        btnNode.on(Node.EventType.TOUCH_END, () => {
            btnNode.setScale(new Vec3(1, 1, 1));
            this.startGame();
        }, this);
        btnNode.on(Node.EventType.TOUCH_CANCEL, () => {
            btnNode.setScale(new Vec3(1, 1, 1));
        });
    }

    private startGame() {
        director.loadScene('Main');
    }
}
