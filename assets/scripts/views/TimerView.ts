import { _decorator, Component, Label, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 演化回合计时器视图
 * 显示当前的演化 tick 次数，并在数字变化时播放缩放弹跳动画
 */
@ccclass('TimerView')
export class TimerView extends Component {
    @property(Label)
    tickNumLabel: Label | null = null;

    private _currentNumber: number = 0;

    /** 获取当前显示的数字 */
    get currentNumber(): number {
        return this._currentNumber;
    }

    /**
     * 设置显示的 tick 数字，并触发缩放弹跳动画
     * @param value 要显示的数字（大于 0 时显示，0 或负数隐藏）
     */
    setNumber(value: number): void {
        this._currentNumber = value;

        // 更新标签
        if (this.tickNumLabel) {
            this.tickNumLabel.string = value > 0 ? value.toString() : '';
        }

        // 缩放弹跳动画
        this._playBounceAnimation();
    }

    /**
     * 播放小幅缩放弹跳动画
     * 从当前大小 → 放大 1.2 倍 → 回弹到 1.0 倍
     */
    private _playBounceAnimation(): void {
        // 停止已有动画，防止叠加
        tween(this.node).stop();

        tween(this.node)
            .to(0.08, { scale: new Vec3(1.01, 1.01, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }
}
