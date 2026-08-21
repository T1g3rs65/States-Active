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

/** Mercator Y in pixels. Poles stretch; equator stays the middle. */
export function mercatorY(row: number, mapRows: number = MAP_ROWS, height: number = MAP_HEIGHT): number {
  const maxDeg = 82;
  const latDeg = (0.5 - row / mapRows) * 2 * maxDeg;
  const lat = (latDeg * Math.PI) / 180;
  const m = Math.log(Math.tan(Math.PI / 4 + lat / 2));
  const latMax = (maxDeg * Math.PI) / 180;
  const mMax = Math.log(Math.tan(Math.PI / 4 + latMax / 2));
  return (0.5 - m / (2 * mMax)) * height;
}

/** 1 at equator, ~0.28 at poles — fewer Voronoi seeds → larger polar cells. */
export function poleScale(row: number, mapRows: number = MAP_ROWS): number {
  const lat = Math.abs(row / mapRows - 0.5) * 2;
  return Math.max(0.28, Math.cos(lat * 1.25));
}
