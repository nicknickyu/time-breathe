import { TerrainType } from '../data/TerrainType';

export interface DrawGroup {
    tiles: TerrainType[];
}

export class DrawManager {
    private static _instance: DrawManager;
    static get instance(): DrawManager {
        if (!this._instance) {
            this._instance = new DrawManager();
        }
        return this._instance;
    }

    private _groups: DrawGroup[] = [];
    private _currentHand: TerrainType[] = [];

    get groups(): DrawGroup[] { return this._groups; }
    get currentHand(): TerrainType[] { return this._currentHand; }

    private readonly TERRAIN_POOL: TerrainType[] = [
        TerrainType.GRASS,
        TerrainType.ROCK,
        TerrainType.WATER,
    ];

    /**
     * Generate 3 groups of 3 terrain tiles each.
     */
    generateGroups(): void {
        this._groups = [];
        this._currentHand = [];
        for (let g = 0; g < 3; g++) {
            const tiles: TerrainType[] = [];
            for (let t = 0; t < 3; t++) {
                const idx = Math.floor(Math.random() * this.TERRAIN_POOL.length);
                tiles.push(this.TERRAIN_POOL[idx]);
            }
            this._groups.push({ tiles });
        }
    }

    /**
     * Select one group by index as the current hand.
     */
    selectGroup(index: number): void {
        if (index < 0 || index >= this._groups.length) return;
        this._currentHand = [...this._groups[index].tiles];
    }

    /**
     * Mark one tile in the hand as placed (remove it).
     */
    removePlacedTile(handIndex: number): void {
        if (handIndex < 0 || handIndex >= this._currentHand.length) return;
        this._currentHand.splice(handIndex, 1);
    }

    /**
     * Whether the player still has tiles to place.
     */
    hasMoreTiles(): boolean {
        return this._currentHand.length > 0;
    }
}
