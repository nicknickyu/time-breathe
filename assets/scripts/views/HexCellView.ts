import { _decorator, Component, Node, Sprite, UITransform, Color, Label, tween, Tween, gfx } from 'cc';
import { TerrainType } from '../data/TerrainType';
import { DEBUG_LABEL } from '../constants/DebugConfig';
import { SpriteConfig } from '../constants/SpriteConfig';
const { ccclass, property } = _decorator;

/**
 * 六边形格子通用视图
 * 管理单个格子的地形显示和高亮，不包含任何地形专属逻辑
 */
@ccclass('HexCellView')
export class HexCellView extends Component {
    @property(Sprite)
    topSprite: Sprite | null = null;

    private _spriteConfig: SpriteConfig | null = null;
    private _currentType: TerrainType = TerrainType.ERODED;
    private _debugLabel: Label | null = null;

    private _transitionNode: Node | null = null;
    private _transitionTween: Tween<any> | null = null;

    onLoad(): void {
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.width = 65;
            uiTransform.height = 89;
        }
        // 初始化时根据调试开关控制 DebugLabel 显隐
        const debugLabelNode = this.node.getChildByName('DebugLabel');
        if (debugLabelNode) {
            debugLabelNode.active = DEBUG_LABEL;
        }
    }

    setSpriteConfig(config: SpriteConfig): void {
        this._spriteConfig = config;
        this._applyVisual();
    }

    /** 设置地形类型并更新贴图（无转场，直接切换） */
    setTerrain(type: TerrainType): void {
        this._currentType = type;
        this._applyVisual();
    }

    /**
     * 从当前地形转场到新地形（渐变淡入效果）
     * 主 Sprite 保持旧贴图，覆盖层淡入新贴图，完成后切换贴图并清理覆盖层
     * @param type 目标地形类型
     * @param duration 转场持续秒数
     */
    startTerrainTransition(type: TerrainType, duration: number): void {
        this._cleanupTransition();

        const newSf = this._spriteConfig?.getTerrainFrame(type);
        const oldSf = this.topSprite?.spriteFrame;
        if (!newSf || !oldSf || !this.topSprite) {
            this.setTerrain(type);
            return;
        }

        this._currentType = type;

        // --- 覆盖层节点，渲染在主 Sprite 之上 ---
        const overlayNode = new Node('TransitionOverlay');
        const topNode = this.topSprite.node;

        const topIndex = this.node.children.indexOf(topNode);
        if (topIndex >= 0) {
            this.node.insertChild(overlayNode, topIndex + 1);
        } else {
            this.node.addChild(overlayNode);
        }

        overlayNode.setPosition(topNode.position.x, topNode.position.y, topNode.position.z);
        const topTransform = topNode.getComponent(UITransform);
        const overlayTransform = overlayNode.addComponent(UITransform);
        if (topTransform) {
            overlayTransform.width = topTransform.width;
            overlayTransform.height = topTransform.height;
            overlayTransform.anchorPoint.set(topTransform.anchorPoint.x, topTransform.anchorPoint.y);
        }

        const overlaySprite = overlayNode.addComponent(Sprite);
        overlaySprite.spriteFrame = newSf;

        this._transitionNode = overlayNode;

        if (type === TerrainType.ERODED) {
            // ---- eroded：灰色 → 白色，渐变提亮显现 ----
            overlaySprite.color = new Color(80, 80, 80, 255);
            const tweenTarget = { r: 80, g: 80, b: 80 };
            this._transitionTween = tween(tweenTarget)
                .to(duration, { r: 255, g: 255, b: 255 }, {
                    onUpdate: (target: { r: number; g: number; b: number }) => {
                        overlaySprite.color = new Color(target.r, target.g, target.b, 255);
                    },
                })
                .call(() => {
                    this.topSprite!.spriteFrame = newSf;
                    this._cleanupTransition();
                })
                .start();
        } else {
            // ---- 非 eroded：底层直接切到新贴图，覆盖层加亮发光 → 消失 ----
            this.topSprite!.spriteFrame = newSf;

            const matInst = overlaySprite.getMaterialInstance(0);
            if (matInst) {
                matInst.overridePipelineStates({
                    blendState: {
                        targets: [{
                            blend: true,
                            blendSrc: gfx.BlendFactor.SRC_ALPHA,
                            blendDst: gfx.BlendFactor.ONE,
                        }],
                    },
                });
            }
            overlaySprite.color = new Color(255, 255, 255, 255);

            const tweenTarget = { r: 255, g: 255, b: 255 };
            this._transitionTween = tween(tweenTarget)
                .to(duration, { r: 0, g: 0, b: 0 }, {
                    onUpdate: (target: { r: number; g: number; b: number }) => {
                        overlaySprite.color = new Color(target.r, target.g, target.b, 255);
                    },
                })
                .call(() => {
                    this._cleanupTransition();
                })
                .start();
        }
    }

    /** 取消并清理进行中的转场（安全调用，无转场时无副作用） */
    private _cleanupTransition(): void {
        if (this._transitionTween) {
            this._transitionTween.stop();
            this._transitionTween = null;
        }
        if (this._transitionNode) {
            this._transitionNode.destroy();
            this._transitionNode = null;
        }
    }

    /** 切换高亮颜色（选中或放置预览） */
    setHighlight(active: boolean): void {
        if (this.topSprite) {
            this.topSprite.color = active
                ? new Color(230, 255, 230)
                : new Color(255, 255, 255);
        }
    }

    /** 组件销毁时清理进行中的转场 */
    protected onDestroy(): void {
        this._cleanupTransition();
    }

    /** 设置调试坐标显示（显示/隐藏受全局 DEBUG_LABEL 控制） */
    setDebugCoord(col: number, row: number): void {
        if (!this._debugLabel) {
            this._debugLabel = this.node.getChildByName('DebugLabel')?.getComponent(Label) ?? null;
        }
        if (this._debugLabel) {
            this._debugLabel.string = `(${col}, ${row})`;
            this._debugLabel.node.active = DEBUG_LABEL;
        }
    }

    /** 应用当前地形的贴图到 Sprite */
    private _applyVisual(): void {
        if (!this._spriteConfig || !this.topSprite) return;
        const sf = this._spriteConfig.getTerrainFrame(this._currentType);
        if (sf) {
            this.topSprite.spriteFrame = sf;
        }
    }
}
