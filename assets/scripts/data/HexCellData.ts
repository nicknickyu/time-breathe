import { TerrainType } from './TerrainType';

/** 六边形格子数据模型 */
export class HexCellData {
    terrainType: TerrainType = TerrainType.ERODED;
    height: number = 0;
    readonly gridX: number;
    readonly gridY: number;

    constructor(gridX: number, gridY: number) {
        this.gridX = gridX;
        this.gridY = gridY;
    }

    isEmpty(): boolean {
        return this.terrainType === TerrainType.ERODED;
    }
}
