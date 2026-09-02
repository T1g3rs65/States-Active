/** FX: purchasing power from GDP/capita, then inflation weakens it. */

export function gdpPerCapita(gdpStat: number | null | undefined): number {
  const s = Number.isFinite(Number(gdpStat)) ? Number(gdpStat) : 20;
  if (s < 20) return 500 + (s / 20) * 4500;
  if (s < 40) return 5000 + ((s - 20) / 20) * 10000;
  if (s < 70) return 15000 + ((s - 40) / 30) * 35000;
  return 50000 + ((s - 70) / 30) * 50000;
}

/** Higher income, lower inflation → stronger unit. */
export function currencyStrength(gdpStat: number, inflationPct: number): number {
  const income = Math.max(400, gdpPerCapita(gdpStat));
  const inf = Number.isFinite(Number(inflationPct)) ? Number(inflationPct) : 2;
  return income / Math.max(0.5, 1 + inf / 100);
}

/** How many of `their` units equal 1 of `mine`. */
export function exchangeRate(
  myGdp: number,
  myInflation: number,
  theirGdp: number,
  theirInflation: number,
): number {
  const mine = currencyStrength(myGdp, myInflation);
  const theirs = currencyStrength(theirGdp, theirInflation);
  return mine / Math.max(1, theirs);
}

export function formatFx(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '—';
  if (rate >= 100) return rate.toFixed(0);
  if (rate >= 10) return rate.toFixed(1);
  if (rate >= 1) return rate.toFixed(2);
  return rate.toFixed(3);
}

export function currencyLabel(nationName: string, currency?: string | null): string {
  const cur = (currency || 'Credits').trim() || 'Credits';
  const place = (nationName || '').trim();
  if (!place) return cur;
  return `${place} ${cur}`;
}
