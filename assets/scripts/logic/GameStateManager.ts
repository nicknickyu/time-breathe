import { EventTarget } from 'cc';
import { GameEvents } from '../events/GameEvents';

/** 游戏阶段枚举 */
export enum GamePhase {
    INIT = 'init',
    DRAW = 'draw',
    PLACE = 'place',
    EVOLVE = 'evolve',
    SETTLE = 'settle',
    SCORE = 'score',
}

/**
 * 游戏阶段状态管理器（单例）
 * 维护当前阶段并通过事件通知变更
 */
export class GameStateManager {
    private static _instance: GameStateManager;
    static get instance(): GameStateManager {
        if (!this._instance) {
            this._instance = new GameStateManager();
        }
        return this._instance;
    }

    readonly eventTarget: EventTarget = new EventTarget();

    private _phase: GamePhase = GamePhase.INIT;
    get phase(): GamePhase { return this._phase; }

    /** 切换到新阶段并触发 STATE_CHANGED 事件 */
    setState(phase: GamePhase): void {
        if (this._phase === phase) return;
        this._phase = phase;
        this.eventTarget.emit(GameEvents.STATE_CHANGED, phase);
    }
}
