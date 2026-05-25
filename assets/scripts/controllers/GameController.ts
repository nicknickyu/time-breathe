import { _decorator, Component, Prefab, SpriteFrame, instantiate, Node, Label } from 'cc';
import { TerrainType } from '../data/TerrainType';
import { HexGridManager } from '../logic/HexGridManager';
import { DrawManager } from '../logic/DrawManager';
import { GameStateManager, GamePhase } from '../logic/GameStateManager';
import { TerrainEvolutionManager } from '../logic/TerrainEvolutionManager';
import { ScoreManager } from '../logic/ScoreManager';
import { GridView } from '../views/GridView';
import { DrawPanelView } from '../views/DrawPanelView';
import { HandCardView } from '../views/HandCardView';
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property(Prefab)
    hexCellPrefab: Prefab | null = null;

    @property(Prefab)
    drawPanelPrefab: Prefab | null = null;

    // ── Terrain textures (drag from Assets panel) ──

    @property(SpriteFrame)
    sandSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    grassSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    rockSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    waterSprite: SpriteFrame | null = null;

    // ── Tick progress (drag from Hierarchy) ──

    @property(Label)
    tickLabel: Label | null = null;

    @property(Node)
    handCardsContainer: Node | null = null;

    private _spriteFrames: Map<TerrainType, SpriteFrame> = new Map();
    private _gridView: GridView | null = null;
    private _handCardView: HandCardView | null = null;
    private _drawPanelView: DrawPanelView | null = null;
    private _selectedHandIndex: number = -1;
    private _currentRound: number = 1;
    private _maxRounds: number = 3;
    private _tickCount: number = 0;

    start(): void {
        // Build sprite frame map from editor-assigned references
        this._initSpriteFrames();
        this._initGame();
    }

    private _initSpriteFrames(): void {
        const map = new Map<TerrainType, SpriteFrame>();
        map.set(TerrainType.EMPTY, this.sandSprite!);
        map.set(TerrainType.GRASS, this.grassSprite!);
        map.set(TerrainType.ROCK, this.rockSprite!);
        map.set(TerrainType.WATER, this.waterSprite!);
        this._spriteFrames = map;
    }

    // ── Initialization ──

    private _initGame(): void {
        // 1) Grid data
        HexGridManager.instance.generateGrid(12, 4);

        // 2) Grid view
        const gridRoot = new Node('GridRoot');
        this.node.addChild(gridRoot);
        this._gridView = gridRoot.addComponent(GridView);
        this._gridView.init(this.hexCellPrefab, this._spriteFrames);
        this._gridView.buildGrid();
        this._gridView.onCellTap((col, row) => this._onGridCellTapped(col, row));

        // 3) Hand card view
        const handRoot = new Node('HandCardRoot');
        this.node.addChild(handRoot);
        this._handCardView = handRoot.addComponent(HandCardView);
        this._handCardView.init(this.hexCellPrefab, this._spriteFrames);
        this._handCardView.handCardsContainer = this.handCardsContainer;
        this._handCardView.onCardSelected((index) => this._onHandCardSelected(index));

        // 4) Draw panel (instantiate once, show/hide)
        if (this.drawPanelPrefab) {
            const panelNode = instantiate(this.drawPanelPrefab);
            this.node.addChild(panelNode);
            this._drawPanelView = panelNode.getComponent(DrawPanelView);
        }

        // 5) Find score / round UI
        this._updateRoundLabel();
        this._updateScoreLabel();

        // 6) Start first draw
        this._startDrawPhase();
    }

    // ── Game phase flow ──

    private _startDrawPhase(): void {
        this._clearTickLabel();
        DrawManager.instance.generateGroups();
        GameStateManager.instance.setState(GamePhase.DRAW);

        if (this._drawPanelView) {
            this._drawPanelView.show(
                DrawManager.instance.groups,
                this._spriteFrames,
                () => this._onDrawConfirmed(),
            );
        }
    }

    private _onDrawConfirmed(): void {
        if (!this._drawPanelView) return;

        const idx = this._drawPanelView.getSelectedIndex();
        DrawManager.instance.selectGroup(idx);
        this._drawPanelView.hide();

        this._startPlacePhase();
    }

    private _startPlacePhase(): void {
        GameStateManager.instance.setState(GamePhase.PLACE);
        this._selectedHandIndex = -1;

        const hand = DrawManager.instance.currentHand;
        if (this._handCardView) {
            this._handCardView.showHand(hand);
        }
    }

    // ── Interaction handlers ──

    private _onHandCardSelected(index: number): void {
        if (this._selectedHandIndex === index) {
            this._selectedHandIndex = -1;
            if (this._handCardView) this._handCardView.setSelected(-1);
        } else {
            this._selectedHandIndex = index;
            if (this._handCardView) this._handCardView.setSelected(index);
        }
    }

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

        if (!DrawManager.instance.hasMoreTiles()) {
            this.scheduleOnce(() => this._startEvolutionPhase(), 0.4);
        }
    }

    // ── Evolution phase ──

    private _startEvolutionPhase(): void {
        GameStateManager.instance.setState(GamePhase.EVOLVE);

        // Hide hand cards
        if (this._handCardView) this._handCardView.clear();
        this._selectedHandIndex = -1;

        this._tickCount = 0;
        TerrainEvolutionManager.instance.startEvolution(6);
        this.scheduleOnce(() => this._doEvolutionTick(), 0.5);
    }

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

        // Update tick progress label
        this._updateTickLabel();

        if (this._tickCount < TerrainEvolutionManager.instance.maxTicks) {
            this.scheduleOnce(() => this._doEvolutionTick(), 0.5);
        } else {
            this._onEvolutionComplete();
        }
    }

    private _onEvolutionComplete(): void {
        // Clear tick progress label
        this._clearTickLabel();
        // Calculate and accumulate score
        const roundScore = ScoreManager.instance.calculateRoundScore();
        ScoreManager.instance.addRoundScore(roundScore);
        this._updateScoreLabel();

        // Advance to next round
        this._currentRound++;
        if (this._currentRound <= this._maxRounds) {
            this._updateRoundLabel();
            this._startDrawPhase();
        } else {
            // Game over — show final score
            const roundLabel = this._findDescendant('RoundLabel');
            if (roundLabel) {
                const label = roundLabel.getComponent(Label);
                if (label) label.string = 'Game Over';
            }
            const scoreLabel = this._findDescendant('ScoreLabel');
            if (scoreLabel) {
                const label = scoreLabel.getComponent(Label);
                if (label) label.string = `总分: ${ScoreManager.instance.totalScore}`;
            }
        }
    }

    // ── UI helpers ──

    private _updateRoundLabel(): void {
        const roundLabel = this._findDescendant('RoundLabel');
        if (roundLabel) {
            const label = roundLabel.getComponent(Label);
            if (label) label.string = `Round ${this._currentRound}`;
        }
    }

    private _updateScoreLabel(): void {
        const scoreLabel = this._findDescendant('ScoreLabel');
        if (scoreLabel) {
            const label = scoreLabel.getComponent(Label);
            if (label) label.string = `${ScoreManager.instance.totalScore}`;
        }
    }

    private _updateTickLabel(): void {
        if (this.tickLabel) {
            this.tickLabel.string = `${this._tickCount}/${TerrainEvolutionManager.instance.maxTicks}`;
        }
    }

    private _clearTickLabel(): void {
        if (this.tickLabel) {
            this.tickLabel.string = '';
        }
    }

    private _findDescendant(name: string): Node | null {
        const stack: Node[] = [this.node];
        while (stack.length > 0) {
            const node = stack.pop()!;
            if (node.name === name) return node;
            for (let i = node.children.length - 1; i >= 0; i--) {
                stack.push(node.children[i]);
            }
        }
        return null;
    }
}
