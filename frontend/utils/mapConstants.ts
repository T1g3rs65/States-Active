/** Shared world extent. Portrait so a phone at min-zoom fills the screen. */
export const MAP_COLS = 160;
export const MAP_ROWS = 284; // ~9:16 after chrome
export const CELL_SCALE = 6;
export const MAP_WIDTH = MAP_COLS * CELL_SCALE;
export const MAP_HEIGHT = MAP_ROWS * CELL_SCALE;
/** Same tiles-per-area as the old 200×200 / 40k map. */
export const VORONOI_CELLS = MAP_COLS * MAP_ROWS;
