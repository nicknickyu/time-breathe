import { HexCellData } from '../data/HexCellData';
import { TerrainType } from '../data/TerrainType';

/**
 * 六边形网格数据管理器（单例）
 * 维护网格数据、提供坐标转换和邻居查询
 */
export class HexGridManager {
    private static _instance: HexGridManager;
    static get instance(): HexGridManager {
        if (!this._instance) {
            this._instance = new HexGridManager();
        }
        return this._instance;
    }

    private _grid: HexCellData[][] = [];
    private _cols: number = 0;
    private _rows: number = 0;

    readonly CELL_WIDTH = 65;
    readonly CELL_HEIGHT = 65;
    readonly SPACING_X = 32;
    readonly SPACING_Y = 97;

    get cols(): number { return this._cols; }
    get rows(): number { return this._rows; }

    /** 生成 cols × rows 的空网格 */
    generateGrid(cols: number, rows: number): void {
        this._cols = cols;
        this._rows = rows;
        this._grid = [];

        for (let c = 0; c < cols; c++) {
            this._grid[c] = [];
            for (let r = 0; r < rows; r++) {
                this._grid[c][r] = new HexCellData(c, r);
            }
        }
    }

    /** 获取指定格子的数据 */
    getCell(col: number, row: number): HexCellData | null {
        if (!this.isInBounds(col, row)) return null;
        return this._grid[col][row];
    }

    /** 设置指定格子的地形类型 */
    setCellTerrain(col: number, row: number, type: TerrainType): void {
        const cell = this.getCell(col, row);
        if (cell) {
            cell.terrainType = type;
        }
    }

    /** 获取所有格子数据的扁平数组 */
    getAllCells(): HexCellData[] {
        const result: HexCellData[] = [];
        for (let c = 0; c < this._cols; c++) {
            for (let r = 0; r < this._rows; r++) {
                result.push(this._grid[c][r]);
            }
        }
        return result;
    }

    /** 检查坐标是否在网格范围内 */
    isInBounds(col: number, row: number): boolean {
        return col >= 0 && col < this._cols && row >= 0 && row < this._rows;
    }

    /**
     * 获取 (col, row) 的六个邻格（odd-r 偏移坐标系）
     * 奇数列的格子向下偏移半格，邻格也相应偏移
     */
    getNeighbors(col: number, row: number): { col: number; row: number }[] {
        let candidates: { col: number; row: number }[];
        if (col % 2 === 1) {
            // 奇数列 — 下方邻格偏移
            candidates = [
                { col: col - 1, row },
                { col: col + 1, row },
                { col, row: row - 1 },
                { col, row: row + 1 },
                { col: col - 1, row: row + 1 },
                { col: col + 1, row: row + 1 },
            ];
        } else {
            // 偶数列 — 上方邻格偏移
            candidates = [
                { col: col - 1, row },
                { col: col + 1, row },
                { col, row: row - 1 },
                { col, row: row + 1 },
                { col: col - 1, row: row - 1 },
                { col: col + 1, row: row - 1 },
            ];
        }
        return candidates.filter(n => this.isInBounds(n.col, n.row));
    }

    /** 计算网格整体的原点坐标（左上角） */
    getGridOrigin(): { x: number; y: number } {
        const totalW = (this._cols - 1) * this.SPACING_X + this.CELL_WIDTH;
        const totalH = (this._rows - 1) * this.SPACING_Y
            + ((this._cols - 1) % 2) * this.SPACING_Y / 2
            + this.CELL_HEIGHT;
        return { x: -totalW / 2, y: totalH / 2 };
    }

    /** 计算格子 (col, row) 的世界坐标 */
    getCellPosition(col: number, row: number): { x: number; y: number } {
        const origin = this.getGridOrigin();
        const x = col * this.SPACING_X + origin.x + this.CELL_WIDTH / 2;
        const y = -(row * this.SPACING_Y + (col % 2) * this.SPACING_Y / 2) + origin.y - this.CELL_HEIGHT / 2;
        return { x, y };
    }
}
