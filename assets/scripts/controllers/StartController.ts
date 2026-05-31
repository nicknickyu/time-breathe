import { _decorator, Component, director, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('StartController')
export class StartController extends Component {
    start() {
        const btnNode = this.node.name === 'StartButton'
            ? this.node
            : this.node.getChildByName('StartButton');
        if (btnNode) {
            btnNode.on(Node.EventType.TOUCH_END, this.startGame, this);
        }
    }

    private startGame() {
        director.loadScene('Main');
    }
}
