import { calculateCapacityFromPopulation } from './nationSize';
import { wrapDx } from './mapConstants';

export type CitySite = { col: number; row: number };

export function extraCityCount(population: number): number {
  const cap = calculateCapacityFromPopulation(population);
  if (cap < 40) return 0;
  if (cap < 150) return 1;
  if (cap < 500) return 2;
  if (cap < 1200) return 3;
  if (cap < 2500) return 4;
  return 5;
}

type Cell = {
  col: number;
  row: number;
  biome: string;
  resourceId?: string | null;
  nearWater?: boolean;
};

export function pickSecondaryCities(
  owned: Cell[],
  capital: CitySite,
  population: number
): CitySite[] {
  const want = extraCityCount(population);
  if (want <= 0 || !owned.length) return [];

  const scored = owned
    .map((c) => {
      const dCap = Math.hypot(wrapDx(c.col - capital.col), c.row - capital.row);
      if (dCap < 8) return null;
      let s = dCap * 0.15;
      if (c.nearWater) s += 8;
      if (c.resourceId) s += 6;
      if (/forest|grass|savanna|flood/.test(c.biome)) s += 3;
      if (/mountain|glacier|desert|barren/.test(c.biome)) s -= 4;
      return { col: c.col, row: c.row, s };
    })
    .filter((x): x is { col: number; row: number; s: number } => !!x)
    .sort((a, b) => b.s - a.s);

  const picked: CitySite[] = [];
  const minD = 12;
  for (const c of scored) {
    if (picked.length >= want) break;
    if (picked.some((p) => Math.hypot(wrapDx(c.col - p.col), c.row - p.row) < minD)) continue;
    picked.push({ col: c.col, row: c.row });
  }
  return picked;
}
