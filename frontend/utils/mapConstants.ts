/** 16:9 cylinder world. Height matches the previous portrait map (284). */
export const MAP_ROWS = 284;
export const MAP_COLS = Math.round((MAP_ROWS * 16) / 9); // 505
export const CELL_SCALE = 6;
export const MAP_WIDTH = MAP_COLS * CELL_SCALE;
export const MAP_HEIGHT = MAP_ROWS * CELL_SCALE;
/** Same tiles-per-area as the sparse portrait map. */
export const VORONOI_CELLS = Math.round(MAP_COLS * MAP_ROWS * 0.48);

export function wrapCol(col: number, cols: number = MAP_COLS): number {
  return ((col % cols) + cols) % cols;
}

export function wrapDx(dx: number, cols: number = MAP_COLS): number {
  const w = cols;
  let d = ((dx % w) + w) % w;
  if (d > w / 2) d -= w;
  return d;
}
