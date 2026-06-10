import { _decorator, Component, Node, Sprite, Color, tween, Tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 闪电特效视图
 * 控制 ThunderVFX 预制体的闪电颜色从纯白 (#ffffff) 渐变为紫色 (#613075)
 *
 * 用法：
 * 1. 将本脚本挂载到 ThunderVFX 预制体根节点
 * 2. 在编辑器中把 type1 子节点拖到 spriteNode 属性上（或自动查找）
 * 3. 生成预制体后调用 play(duration) 播放动画
 */
@ccclass('ThunderVFXView')
export class ThunderVFXView extends Component {
    @property({ type: Node, tooltip: '闪电主体 Sprite 所在的节点（编辑器绑定，留空则自动查找 type1）' })
    spriteNode: Node | null = null;

    @property({ tooltip: '动画结束后是否自动销毁节点', default: true })
    autoDestroy: boolean = true;

    /** 结束颜色 #613075 */
    private static readonly END_COLOR = new Color(97, 48, 117, 255);

    private _sprite: Sprite | null = null;
    private _tween: Tween<{ r: number; g: number; b: number }> | null = null;

    onLoad(): void {
        if (!this.spriteNode) {
            this.spriteNode = this.node.getChildByName('type1');
        }
        if (this.spriteNode) {
            this._sprite = this.spriteNode.getComponent(Sprite);
        }
    }

    /**
     * 播放闪电特效：颜色从 #ffffff 渐变为 #613075
     * @param duration 过渡持续秒数
     */
    play(duration: number): void {
        if (!this._sprite) {
            console.warn('[ThunderVFXView] type1 sprite not found, skipping effect');
            return;
        }

        this._cleanupTween();

        // 起始颜色设为纯白
        this._sprite.color = new Color(255, 255, 255, 255);

        const tweenTarget = { r: 255, g: 255, b: 255 };
        this._tween = tween(tweenTarget)
            .to(duration, { r: 97, g: 48, b: 117 }, {
                onUpdate: (target: { r: number; g: number; b: number }) => {
                    if (this._sprite) {
                        this._sprite.color = new Color(target.r, target.g, target.b, 255);
                    }
                },
            })
            .call(() => {
                this._tween = null;
                if (this.autoDestroy) {
                    this.node.destroy();
                }
            })
            .start();
    }

    /** 取消进行中的动画 */
    private _cleanupTween(): void {
        if (this._tween) {
            this._tween.stop();
            this._tween = null;
        }
    }

    /** 组件销毁时清理动画 */
    protected onDestroy(): void {
        this._cleanupTween();
    }
}
