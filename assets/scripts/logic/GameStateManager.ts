import { EventTarget } from 'cc';
import { GameEvents } from '../events/GameEvents';

export enum GamePhase {
    INIT = 'init',
    DRAW = 'draw',
    PLACE = 'place',
    EVOLVE = 'evolve',
    SCORE = 'score',
}

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

    setState(phase: GamePhase): void {
        if (this._phase === phase) return;
        this._phase = phase;
        this.eventTarget.emit(GameEvents.STATE_CHANGED, phase);
    }
}
