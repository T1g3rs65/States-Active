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
  const maxDeg = 72;
  const latDeg = (0.5 - row / mapRows) * 2 * maxDeg;
  const lat = (latDeg * Math.PI) / 180;
  const m = Math.log(Math.tan(Math.PI / 4 + lat / 2));
  const latMax = (maxDeg * Math.PI) / 180;
  const mMax = Math.log(Math.tan(Math.PI / 4 + latMax / 2));
  return (0.5 - m / (2 * mMax)) * height;
}

/** 24 hourly bands. Date line sits on the cylinder seam (col 0). */
export function timezoneBand(col: number, cols: number = MAP_COLS): number {
  const c = wrapCol(col, cols);
  return Math.min(23, Math.floor((c / cols) * 24));
}

/** UTC offset hours: seam is UTC−12 / +12, center of the map is UTC±0. */
export function timezoneOffsetHours(col: number, cols: number = MAP_COLS): number {
  return timezoneBand(col, cols) - 12;
}

export function timezoneLabel(col: number, cols: number = MAP_COLS): string {
  const h = timezoneOffsetHours(col, cols);
  if (h === 0) return 'UTC±0';
  if (h === -12) return 'UTC±12';
  return h > 0 ? `UTC+${h}` : `UTC${h}`;
}

export function timezoneColor(col: number, cols: number = MAP_COLS): string {
  const band = timezoneBand(col, cols);
  const hue = band * 15;
  const sat = band % 2 === 0 ? 0.52 : 0.40;
  const l = band % 2 === 0 ? 0.48 : 0.36;
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const x = l - sat * Math.min(l, 1 - l) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * x);
  };
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}
export function poleScale(row: number, mapRows: number = MAP_ROWS): number {
  const lat = Math.abs(row / mapRows - 0.5) * 2;
  return Math.max(0.42, Math.cos(lat * 1.15));
}
