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

/** Y in pixels. Equal-area cylinder — no polar stretch. Cell size is seed density only. */
export function mercatorY(row: number, mapRows: number = MAP_ROWS, height: number = MAP_HEIGHT): number {
  return (row / mapRows) * height;
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
  return timezoneBandColor(timezoneBand(col, cols));
}

export function timezoneBandColor(band: number): string {
  const hue = ((band % 24) + 24) % 24 * 15;
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

/** Longest circular run of occupied hourly bands. Disconnected hours are dropped. */
export function contiguousOccupiedBands(cols: number[]): number[] {
  const set = new Set(cols.map((c) => timezoneBand(c)));
  if (set.size === 0) return [];
  const occ = Array.from({ length: 24 }, (_, i) => set.has(i));
  const ext = occ.concat(occ);
  let bestStart = 0;
  let bestLen = 0;
  let run = 0;
  let runStart = 0;
  for (let i = 0; i < ext.length; i++) {
    if (ext[i]) {
      if (run === 0) runStart = i;
      run += 1;
      if (run > bestLen) {
        bestLen = run;
        bestStart = runStart;
      }
    } else {
      run = 0;
    }
  }
  bestLen = Math.min(bestLen, 24);
  return Array.from({ length: bestLen }, (_, i) => (bestStart + i) % 24);
}

export function officialTimezoneBand(col: number, occupied: number[], count: number): number {
  if (!occupied.length) return timezoneBand(col);
  const n = occupied.length;
  const c = Math.max(1, Math.min(count, n));
  if (c >= n) return timezoneBand(col);
  let idx = occupied.indexOf(timezoneBand(col));
  if (idx < 0) idx = 0;
  const group = Math.min(c - 1, Math.floor((idx * c) / n));
  return occupied[Math.min(n - 1, Math.floor(((group + 0.5) * n) / c))];
}

export function officialTimezoneColor(col: number, occupied: number[], count: number): string {
  if (!occupied.length || count >= occupied.length) return timezoneColor(col);
  return timezoneBandColor(officialTimezoneBand(col, occupied, count));
}

export function officialTimezoneLabel(col: number, occupied: number[], count: number): string {
  const band = officialTimezoneBand(col, occupied, count);
  const h = ((band % 24) + 24) % 24 - 12;
  if (h === 0) return 'UTC±0';
  if (h === -12) return 'UTC±12';
  return h > 0 ? `UTC+${h}` : `UTC${h}`;
}
/** Seed density 1 at equator → 0.5 at poles. Larger polar cells, still isotropic (linear Y). */
export function poleScale(row: number, mapRows: number = MAP_ROWS): number {
  const lat = Math.abs(row / mapRows - 0.5) * 2;
  return 1 - 0.5 * lat;
}
