export class GameEvents {

    // 游戏状态变化
    static readonly STATE_CHANGED = 'state-changed';

    // 抽取阶段
    static readonly DRAW_PHASE_START = 'draw-phase-start';

    // 玩家确认抽取
    static readonly DRAW_CONFIRMED = 'draw-confirmed';

    // 玩家点击了网格上的某个格子
    static readonly GRID_CELL_TAPPED = 'grid-cell-tapped';

    // 玩家选中了一张手牌
    static readonly HAND_CARD_SELECTED = 'hand-card-selected';

    // 所有手牌已放置完毕
    static readonly ALL_PLACED = 'all-placed';

    // 演化阶段
    static readonly EVOLUTION_TICK = 'evolution-tick';
    static readonly EVOLUTION_COMPLETE = 'evolution-complete';

    // 评分更新
    static readonly SCORE_UPDATED = 'score-updated';
}
