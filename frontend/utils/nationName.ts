/** Short nation name: place-name only. Wheels already supply Republic / Kingdom / etc. */

const PHRASES = [
  'united states',
  'united kingdom',
  "people's republic",
  'peoples republic',
  'democratic republic',
  'federal republic',
  'islamic republic',
  'soviet union',
  'states of',
  'republic of',
  'kingdom of',
  'empire of',
  'federation of',
  'confederation of',
  'confederacy of',
  'commonwealth of',
  'union of',
  'dominion of',
  'nation of',
  'state of',
];

const WORDS = [
  'republic',
  'kingdom',
  'empire',
  'federation',
  'confederacy',
  'confederation',
  'commonwealth',
  'dominion',
  'principality',
  'duchy',
  'sultanate',
  'emirate',
  'caliphate',
  'theocracy',
  'democracy',
  'autocracy',
  'oligarchy',
  'dictatorship',
  'junta',
  'union',
  'states',
  'united',
  'federal',
  'federacy',
  'imperial',
];

export function shortNameError(raw: string): string | null {
  const name = (raw || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2) return 'Give your nation a short name (at least 2 letters).';
  if (name.length > 32) return 'Keep the short name under 32 characters.';
  const lower = name.toLowerCase();
  if (/^the\s/.test(lower)) return 'Drop the leading “The”. Wheels already add the full title.';
  for (const p of PHRASES) {
    if (lower.includes(p)) {
      return 'Don’t put a government title in the short name. Use a place name like Sigracia, not “Republic of…”.';
    }
  }
  const tokens = lower.split(/[^a-z0-9']+/).filter(Boolean);
  for (const w of WORDS) {
    if (tokens.includes(w)) {
      return `Don’t include “${w}” — that’s a government title. The wheels add it.`;
    }
  }
  return null;
}
