import { _decorator, Component, Material, Node, Sprite, UITransform, Color, Label, tween, Tween } from 'cc';
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

    /** 转场效果基础材质（在 Editor 中绑定 WipeMat） */
    @property({ type: Material, displayName: 'Wipe Base Material' })
    wipeBaseMaterial: Material | null = null;

    private _spriteConfig: SpriteConfig | null = null;
    private _currentType: TerrainType = TerrainType.ERODED;
    private _debugLabel: Label | null = null;

    private _transitionNode: Node | null = null;
    private _transitionTween: Tween<{ value: number }> | null = null;

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
     * 从当前地形转场到新地形（线性擦除效果）
     * @param type 目标地形类型
     * @param duration 转场持续秒数
     */
    startTerrainTransition(type: TerrainType, duration: number): void {
        // 取消进行中的转场
        this._cleanupTransition();

        const newSf = this._spriteConfig?.getTerrainFrame(type);
        const oldSf = this.topSprite?.spriteFrame;
        if (!newSf || !oldSf || !this.topSprite || !this.wipeBaseMaterial) {
            this.setTerrain(type);
            return;
        }

        this._currentType = type;
        // 主 Sprite 即时切到新贴图
        this.topSprite.spriteFrame = newSf;

        // --- 创建覆盖层，显示旧贴图，叠在主 Sprite 上方 ---
        const overlayNode = new Node('TransitionOverlay');
        const topNode = this.topSprite.node;

        // 在 HexCell 根节点下创建，紧跟在 Top 之后渲染
        const topIndex = this.node.children.indexOf(topNode);
        if (topIndex >= 0) {
            this.node.insertChild(overlayNode, topIndex + 1);
        } else {
            this.node.addChild(overlayNode);
        }

        // 覆盖层位置和大小完全匹配 Top
        overlayNode.setPosition(topNode.position.x, topNode.position.y, topNode.position.z);
        const topTransform = topNode.getComponent(UITransform);
        const overlayTransform = overlayNode.addComponent(UITransform);
        if (topTransform) {
            overlayTransform.width = topTransform.width;
            overlayTransform.height = topTransform.height;
            overlayTransform.anchorPoint.set(topTransform.anchorPoint.x, topTransform.anchorPoint.y);
        }

        // 覆盖层 Sprite 用旧贴图
        const overlaySprite = overlayNode.addComponent(Sprite);
        overlaySprite.spriteFrame = oldSf;
        overlaySprite.sizeMode = Sprite.SizeMode.TRIMMED;

        // 直接使用 wipeBaseMaterial（Editor 已配好宏和 Effect）
        this.wipeBaseMaterial.setProperty('progress', 0.0);
        this.wipeBaseMaterial.setProperty('edgeWidth', 0.06);
        overlaySprite.customMaterial = this.wipeBaseMaterial;

        this._transitionNode = overlayNode;

        // Tween 驱动 progress 0 → 1
        const tweenData = { value: 0 };
        this._transitionTween = tween(tweenData)
            .to(duration, { value: 1.0 }, {
                onUpdate: (target: { value: number }) => {
                    this.wipeBaseMaterial?.setProperty('progress', target.value);
                },
            })
            .call(() => {
                this._cleanupTransition();
            })
            .start();
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
