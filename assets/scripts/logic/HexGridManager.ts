import { HexCellData } from '../data/HexCellData';
import { TerrainType } from '../data/TerrainType';

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

    getCell(col: number, row: number): HexCellData | null {
        if (!this.isInBounds(col, row)) return null;
        return this._grid[col][row];
    }

    setCellTerrain(col: number, row: number, type: TerrainType): void {
        const cell = this.getCell(col, row);
        if (cell) {
            cell.terrainType = type;
        }
    }

    getAllCells(): HexCellData[] {
        const result: HexCellData[] = [];
        for (let c = 0; c < this._cols; c++) {
            for (let r = 0; r < this._rows; r++) {
                result.push(this._grid[c][r]);
            }
        }
        return result;
    }

    isInBounds(col: number, row: number): boolean {
        return col >= 0 && col < this._cols && row >= 0 && row < this._rows;
    }

    /**
     * Get 6 neighbors in odd-r offset coordinate system.
     * Odd columns are shifted down by half a cell height.
     */
    getNeighbors(col: number, row: number): { col: number; row: number }[] {
        let candidates: { col: number; row: number }[];
        if (col % 2 === 1) {
            // odd column — neighbors below are offset
            candidates = [
                { col: col - 1, row },           // left
                { col: col + 1, row },           // right
                { col, row: row - 1 },            // top
                { col, row: row + 1 },            // bottom
                { col: col - 1, row: row + 1 },   // lower-left
                { col: col + 1, row: row + 1 },   // lower-right
            ];
        } else {
            // even column — neighbors above are offset
            candidates = [
                { col: col - 1, row },           // left
                { col: col + 1, row },           // right
                { col, row: row - 1 },            // top
                { col, row: row + 1 },            // bottom
                { col: col - 1, row: row - 1 },   // upper-left
                { col: col + 1, row: row - 1 },   // upper-right
            ];
        }
        return candidates.filter(n => this.isInBounds(n.col, n.row));
    }

    /**
     * Calculate world position for a grid cell (centered on the grid).
     */
    getGridOrigin(): { x: number; y: number } {
        const totalW = (this._cols - 1) * this.SPACING_X + this.CELL_WIDTH;
        const totalH = (this._rows - 1) * this.SPACING_Y
            + ((this._cols - 1) % 2) * this.SPACING_Y / 2
            + this.CELL_HEIGHT;
        return { x: -totalW / 2, y: totalH / 2 };
    }

    getCellPosition(col: number, row: number): { x: number; y: number } {
        const origin = this.getGridOrigin();
        const x = col * this.SPACING_X + origin.x + this.CELL_WIDTH / 2;
        const y = -(row * this.SPACING_Y + (col % 2) * this.SPACING_Y / 2) + origin.y - this.CELL_HEIGHT / 2;
        return { x, y };
    }
}
