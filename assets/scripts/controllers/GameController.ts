import { _decorator, Component, Prefab, instantiate, Node, Label, Vec3, director } from 'cc';
import { DialogView } from '../views/DialogView';
import { ConfirmDialogView } from '../views/ConfirmDialogView';
import { HexGridManager } from '../logic/HexGridManager';
import { DrawManager } from '../logic/DrawManager';
import { GameStateManager, GamePhase } from '../logic/GameStateManager';
import { GameEvents } from '../events/GameEvents';
import { TerrainEvolutionManager } from '../logic/TerrainEvolutionManager';
import { ScoreManager } from '../logic/ScoreManager';
import { GridView } from '../views/GridView';
import { DrawPanelView } from '../views/DrawPanelView';
import { HandCardView } from '../views/HandCardView';
import { AnimalSettlementManager } from '../logic/AnimalSettlementManager';
import { AnimalView } from '../views/AnimalView';
import { GAME_INTRO_TEXT } from '../constants/GameTextConfig';
import { SpriteConfig } from '../constants/SpriteConfig';
const { ccclass, property } = _decorator;

/**
 * 游戏主控制器
 * 连接逻辑层与视觉层，驱动游戏流程：
 * 生成目标动物 → 抽取地形 → 放置 → 演化（3 轮）→ 动物入住 → 结算
 */
@ccclass('GameController')
export class GameController extends Component {
    @property(Prefab)
    hexCellPrefab: Prefab | null = null;

    @property(Prefab)
    drawPanelPrefab: Prefab | null = null;

    @property(SpriteConfig)
    spriteConfig: SpriteConfig | null = null;

    @property(Node)
    handCardsContainer: Node | null = null;

    @property(Prefab)
    animalPrefab: Prefab | null = null;

    @property(Prefab)
    dialogPrefab: Prefab | null = null;

    @property(Prefab)
    confirmDialogPrefab: Prefab | null = null;

    @property(Prefab)
    infoCardPrefab: Prefab | null = null;

    @property(Node)
    targetAnimalsContainer: Node | null = null;

    @property(Label)
    phaseLabel: Label | null = null;

    private _gridView: GridView | null = null;
    private _handCardView: HandCardView | null = null;
    private _drawPanelView: DrawPanelView | null = null;
    private _selectedHandIndex: number = -1;
    private _settleAnimalIndex: number = 0;
    private _targetAnimalViews: AnimalView[] = [];
    private _currentRound: number = 1;
    private _maxRounds: number = 3;
    private _tickCount: number = 0;

    start(): void {
        this._initGameSetup();
        this._showStartDialog();
    }

    // ── Initialization ──

    /** 初始化游戏场景（网格、手牌、抽取面板等），但不启动游戏流程 */
    private _initGameSetup(): void {
        // 1) Grid data
        HexGridManager.instance.generateGrid(12, 4);

        // 2) Grid view
        const gridRoot = new Node('GridRoot');
        this.node.addChild(gridRoot);
        this._gridView = gridRoot.addComponent(GridView);
        this._gridView.init(this.hexCellPrefab, this.spriteConfig!);
        this._gridView.buildGrid();
        this._gridView.onCellTap((col, row) => this._onGridCellTapped(col, row));

        // 3) Hand card view
        const handRoot = new Node('HandCardRoot');
        this.node.addChild(handRoot);
        this._handCardView = handRoot.addComponent(HandCardView);
        this._handCardView.init(this.hexCellPrefab, this.spriteConfig!);
        this._handCardView.handCardsContainer = this.handCardsContainer;
        this._handCardView.onCardSelected((index) => this._onHandCardSelected(index));

        // 4) Draw panel (instantiate once, show/hide)
        if (this.drawPanelPrefab) {
            const panelNode = instantiate(this.drawPanelPrefab);
            this.node.addChild(panelNode);
            this._drawPanelView = panelNode.getComponent(DrawPanelView);
        }

        // 5) Listen to game state changes for phase label
        GameStateManager.instance.eventTarget.on(
            GameEvents.STATE_CHANGED,
            (phase: GamePhase) => this._updatePhaseLabel(phase),
        );
        this._updatePhaseLabel(GameStateManager.instance.phase);
    }

    /** 玩家确认后启动游戏流程 */
    private _startGameFlow(): void {
        this._startTargetAnimalPhase();
    }

    /** 显示阶段提示卡片，500ms 后自动隐藏并触发回调 */
    private _showInfoCard(text: string, callback?: () => void): void {
        if (!this.infoCardPrefab) {
            if (callback) callback();
            return;
        }
        const node = instantiate(this.infoCardPrefab);
        this.node.addChild(node);

        const label = node.getChildByName('CardFrame')?.getChildByName('Label')?.getComponent(Label);
        if (label) label.string = text;

        this.scheduleOnce(() => {
            node.destroy();
            if (callback) callback();
        }, 1);
    }

    /** 显示开始确认对话框（游戏说明） */
    private _showStartDialog(): void {
        if (!this.confirmDialogPrefab) return;
        const dialogNode = instantiate(this.confirmDialogPrefab);
        this.node.addChild(dialogNode);

        const dialogView = dialogNode.getComponent(ConfirmDialogView);
        if (dialogView) {
            dialogView.setPanelHeight(640);
            dialogView.setTitle('游戏说明');
            dialogView.setButtonText('开始吧');
            dialogView.show(
                GAME_INTRO_TEXT,
                () => {
                    this._startGameFlow();
                },
            );
        }
    }

    // ── Target animal generation phase ──

    /** 进入目标动物展示阶段 */
    private _startTargetAnimalPhase(): void {
        this._showInfoCard('目标动物阶段', () => {
            AnimalSettlementManager.instance.generateTargetAnimals();
            this._showTargetAnimal(0);
        });
    }

    /** 逐个显示目标动物（每 500ms 一个），显示完后进入抽取阶段 */
    private _showTargetAnimal(index: number): void {
        const animals = AnimalSettlementManager.instance.targetAnimals;
        if (index >= animals.length) {
            this._showInfoCard('抽取地形阶段', () => {
                this._startDrawPhase();
            });
            return;
        }

        const animal = animals[index];
        const spriteFrame = this.spriteConfig!.getAnimalFrame(animal.type);

        if (spriteFrame && this.animalPrefab && this.targetAnimalsContainer) {
            const node = instantiate(this.animalPrefab);
            const spacingX = 160;
            const localX = (index - (animals.length - 1) / 2) * spacingX;
            node.setPosition(new Vec3(localX, 0, 0));
            node.setScale(new Vec3(1.2, 1.2, 1));
            // Add to scene first so AnimalView.onLoad fires
            this.targetAnimalsContainer.addChild(node);

            const view = node.addComponent(AnimalView);
            view.init(spriteFrame, animal.totalCount);
            this._targetAnimalViews.push(view);
        }

        this.scheduleOnce(() => this._showTargetAnimal(index + 1), 0.5);
    }

    // ── Draw phase ──

    /** 进入抽取阶段：生成随机分组并显示抽取面板 */
    private _startDrawPhase(): void {
        DrawManager.instance.generateGroups();
        GameStateManager.instance.setState(GamePhase.DRAW);

        if (this._drawPanelView) {
            this._drawPanelView.show(
                DrawManager.instance.groups,
                this.spriteConfig!,
                () => this._onDrawConfirmed(),
            );
        }
    }

    /** 玩家确认抽取后进入放置阶段 */
    private _onDrawConfirmed(): void {
        if (!this._drawPanelView) return;

        const idx = this._drawPanelView.getSelectedIndex();
        DrawManager.instance.selectGroup(idx);
        this._drawPanelView.hide();

        this._startPlacePhase();
    }

    /** 进入放置阶段：展示手牌等待玩家放置 */
    private _startPlacePhase(): void {
        GameStateManager.instance.setState(GamePhase.PLACE);
        this._selectedHandIndex = -1;

        // 如果 grid 已经没有空格，直接进入演化阶段
        if (this._isGridFull()) {
            this._startEvolutionPhase();
            return;
        }

        const hand = DrawManager.instance.currentHand;
        if (this._handCardView) {
            this._handCardView.showHand(hand);
        }
    }

    // ── Interaction handlers ──

    /** 切换手牌选中状态（再次点击取消选中） */
    private _onHandCardSelected(index: number): void {
        if (this._selectedHandIndex === index) {
            this._selectedHandIndex = -1;
            if (this._handCardView) this._handCardView.setSelected(-1);
        } else {
            this._selectedHandIndex = index;
            if (this._handCardView) this._handCardView.setSelected(index);
        }
    }

    /** 点击格子：放置选中手牌（仅在 PLACE 阶段生效） */
    private _onGridCellTapped(col: number, row: number): void {
        // Only allow placement during PLACE phase (not during evolution)
        if (GameStateManager.instance.phase !== GamePhase.PLACE) return;
        if (this._selectedHandIndex < 0) return;

        const mgr = HexGridManager.instance;
        const cell = mgr.getCell(col, row);
        if (!cell || !cell.isEmpty()) return;

        const terrainType = DrawManager.instance.currentHand[this._selectedHandIndex];
        mgr.setCellTerrain(col, row, terrainType);
        if (this._gridView) {
            this._gridView.updateCellVisual(col, row, terrainType);
        }

        DrawManager.instance.removePlacedTile(this._selectedHandIndex);
        if (this._handCardView) {
            this._handCardView.removeCard(this._selectedHandIndex);
        }
        this._selectedHandIndex = -1;

        // 手牌用完或 grid 已满 → 进入演化阶段
        if (!DrawManager.instance.hasMoreTiles() || this._isGridFull()) {
            this.scheduleOnce(() => this._startEvolutionPhase(), 0.4);
        }
    }

    /** 检测 grid 是否已经没有可放置的空格 */
    private _isGridFull(): boolean {
        return HexGridManager.instance.getAllCells().every(cell => !cell.isEmpty());
    }

    // ── Evolution phase ──

    /** 进入演化阶段：隐藏手牌，开始地形自动演化 */
    private _startEvolutionPhase(): void {
        this._showInfoCard('演化阶段', () => {
            GameStateManager.instance.setState(GamePhase.EVOLVE);

            // Hide hand cards
            if (this._handCardView) this._handCardView.clear();
            this._selectedHandIndex = -1;

            this._tickCount = 0;
            TerrainEvolutionManager.instance.startEvolution(6);
            this.scheduleOnce(() => this._doEvolutionTick(), 0.5);
        });
    }

    /** 执行一次演化 tick 并更新视觉，完成后进入下一轮或结算 */
    private _doEvolutionTick(): void {
        this._tickCount++;
        const changes = TerrainEvolutionManager.instance.tick();

        // Apply visual updates for every change
        for (const change of changes) {
            if (this._gridView) {
                this._gridView.updateCellVisual(change.col, change.row, change.terrainType);
                this._gridView.setCellHeight(change.col, change.row, change.height);
            }
        }

        if (this._tickCount < TerrainEvolutionManager.instance.maxTicks) {
            this.scheduleOnce(() => this._doEvolutionTick(), 0.5);
        } else {
            this._onEvolutionComplete();
        }
    }

    /** 演化完成：计算本轮分数，进入下一轮或入住阶段 */
    private _onEvolutionComplete(): void {
        const roundScore = ScoreManager.instance.calculateRoundScore();
        ScoreManager.instance.addRoundScore(roundScore);

        this._currentRound++;
        if (this._currentRound <= this._maxRounds) {
            this._startDrawPhase();
        } else {
            this._startSettlementPhase();
        }
    }

    // ── Settlement phase ──

    /** 进入动物入住阶段 */
    private _startSettlementPhase(): void {
        this._showInfoCard('结算阶段', () => {
            GameStateManager.instance.setState(GamePhase.SETTLE);
            if (this._handCardView) this._handCardView.clear();
            this._selectedHandIndex = -1;
            this._settleAnimalIndex = 0;
            this._settleNextAnimal();
        });
    }

    /** 逐只入住动物（每 500ms 一只），已满或无法入住的类型自动跳过 */
    private _settleNextAnimal(): void {
        const animals = AnimalSettlementManager.instance.targetAnimals;

        // Skip animal types that are fully settled
        while (this._settleAnimalIndex < animals.length &&
               animals[this._settleAnimalIndex].settledCount >= animals[this._settleAnimalIndex].totalCount) {
            this._settleAnimalIndex++;
        }

        if (this._settleAnimalIndex >= animals.length) {
            this._onAllAnimalsSettled();
            return;
        }

        const animal = animals[this._settleAnimalIndex];
        const validCells = AnimalSettlementManager.instance.getValidCells(animal.type);
        const maxSettle = Math.min(validCells.length, animal.totalCount);

        if (animal.settledCount < maxSettle) {
            const cell = validCells[animal.settledCount];
            const spriteFrame = this.spriteConfig!.getAnimalFrame(animal.type);

            if (this.animalPrefab && spriteFrame) {
                const animalNode = instantiate(this.animalPrefab);
                animalNode.setScale(new Vec3(0.6, 0.6, 1));

                // Adjust Y offset for ROCK cell height (OWL)
                const cellData = HexGridManager.instance.getCell(cell.col, cell.row);
                const stackOffset = cellData ? cellData.height * 22 : 0;
                if (this._gridView) {
                    this._gridView.addAnimalToCell(cell.col, cell.row, animalNode, 40 + stackOffset);
                }

                const view = animalNode.addComponent(AnimalView);
                view.init(spriteFrame, null);
            }

            animal.settledCount++;
            this._updateTargetAnimalCount(this._settleAnimalIndex);
            ScoreManager.instance.addAnimalScore(1);
        }

        // Advance to next type if current type is fully settled or has no valid cells
        if (animal.settledCount >= maxSettle) {
            this._settleAnimalIndex++;
        }

        this.scheduleOnce(() => this._settleNextAnimal(), 0.5);
    }

    /** 全部动物入住完成：弹出 Game Over 对话框，展示总分 */
    private _onAllAnimalsSettled(): void {
        if (!this.dialogPrefab) return;

        const dialogNode = instantiate(this.dialogPrefab);
        this.node.addChild(dialogNode);
        const dialogView = dialogNode.getComponent(DialogView);
        if (dialogView) {
            dialogView.show(
                `游戏结束\n总分: ${ScoreManager.instance.totalScore}`,
                () => {
                    director.loadScene('Main');
                },
            );
        }
    }

    /** 更新某个目标动物的剩余数量显示 */
    private _updateTargetAnimalCount(index: number): void {
        const animal = AnimalSettlementManager.instance.targetAnimals[index];
        const remaining = animal.totalCount - animal.settledCount;
        if (this._targetAnimalViews[index]) {
            if (remaining <= 0) {
                this._targetAnimalViews[index].hideCount();
            } else {
                this._targetAnimalViews[index].setCount(remaining);
            }
        }
    }

    private _updatePhaseLabel(phase: GamePhase): void {
        if (this.phaseLabel) {
            this.phaseLabel.string = phase;
        }
    }

}
