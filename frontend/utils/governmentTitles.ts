export type TitleSpec = string | [string, string];

import { FEMALE_FIRST as FEMALE_GIVEN } from './humanNames';

const FEMALE_FIRST = new Set([
  ...FEMALE_GIVEN.map((n) => n.toLowerCase()),
  'queen', 'empress', 'lady', 'dame', 'duchess',
]);

export function leaderIsFemale(name?: string): boolean {
  if (!name) return false;
  const first = name.split(' ')[0].toLowerCase();
  if (FEMALE_FIRST.has(first)) return true;
  return first.endsWith('a') || first.endsWith('ie') || first.endsWith('ine') || first.endsWith('ella') || first.endsWith('ette');
}

function pick(title: TitleSpec, female: boolean): string {
  return Array.isArray(title) ? (female ? title[1] : title[0]) : title;
}

type Pack = {
  leader: TitleSpec;
  body: string;
  portrait: string;
  slots: Record<number, string>;
};

const hiveSlots = {
  1: 'First Consort-Minister',
  2: 'Hive Treasurer',
  3: 'Brood Marshal',
  4: 'Brood-Singer',
  5: 'Whisper-Keeper',
  6: 'Hivewright',
  7: 'Swarm-Envoy',
  8: 'Brood-Sage',
};

const privySlots = {
  1: 'Lord Chancellor',
  2: 'Master of Coin',
  3: 'Lord Marshal',
  4: 'Lord Chamberlain',
  5: 'Master of Whispers',
  6: 'Royal Engineer',
  7: 'Ambassador-General',
  8: 'Court Inventor',
};

const circleSlots = {
  1: 'First Delegate',
  2: 'Purse-Keeper',
  3: 'Militia Captain',
  4: 'Story-Keeper',
  5: 'Watch',
  6: 'Commons Builder',
  7: 'Envoy',
  8: 'Tinker',
};

const PACKS: Record<string, Pack> = {
  presidential: {
    leader: 'President',
    body: 'Cabinet',
    portrait: 'president',
    slots: {
      1: 'Chief of Staff',
      2: 'Treasury Secretary',
      3: 'Defense Secretary',
      4: 'Culture Secretary',
      5: 'Intelligence Director',
      6: 'Interior Secretary',
      7: 'Secretary of State',
      8: 'Science Secretary',
    },
  },
  parliamentary: {
    leader: 'Prime Minister',
    body: 'Cabinet',
    portrait: 'prime_minister',
    slots: {
      1: 'Deputy Prime Minister',
      2: 'Chancellor of the Exchequer',
      3: 'Defence Secretary',
      4: 'Culture Secretary',
      5: 'Security Service Director',
      6: 'Works Secretary',
      7: 'Foreign Secretary',
      8: 'Science Secretary',
    },
  },
  assembly: {
    leader: 'Speaker of the Assembly',
    body: 'Assembly',
    portrait: 'president',
    slots: {
      1: 'First Delegate',
      2: 'Purse-Keeper',
      3: 'Militia Captain',
      4: 'Festival Warden',
      5: 'Watch-Keeper',
      6: 'Commons Builder',
      7: 'Envoy',
      8: 'Natural Philosopher',
    },
  },
  coalition: {
    leader: 'President',
    body: 'Grand Coalition Cabinet',
    portrait: 'president',
    slots: {
      1: 'Chief of Staff',
      2: 'Treasury Secretary',
      3: 'Defense Secretary',
      4: 'Culture Secretary',
      5: 'Intelligence Director',
      6: 'Interior Secretary',
      7: 'Secretary of State',
      8: 'Science Secretary',
    },
  },
  politburo: {
    leader: 'General Secretary',
    body: 'Politburo',
    portrait: 'chairman',
    slots: {
      1: 'First Secretary',
      2: "People's Commissar of Finance",
      3: 'Defense Commissar',
      4: 'Agitprop Chief',
      5: 'State Security Chief',
      6: 'Construction Commissar',
      7: 'Foreign Commissar',
      8: 'Academy Director',
    },
  },
  junta: {
    leader: ['Chairman of the Junta', 'Chairwoman of the Junta'],
    body: 'High Command',
    portrait: 'military',
    slots: {
      1: 'Chief of Staff',
      2: 'Quartermaster-General',
      3: 'Chief of the Army',
      4: 'Morale Officer',
      5: 'Military Intelligence',
      6: 'Corps of Engineers',
      7: 'Foreign Attaché',
      8: 'Ordnance Scientist',
    },
  },
  board: {
    leader: ['Chairman of the Board', 'Chairwoman of the Board'],
    body: 'Board of Directors',
    portrait: 'corporate',
    slots: {
      1: 'Chief of Staff',
      2: 'CFO',
      3: 'Chief Security Officer',
      4: 'Brand Director',
      5: 'Compliance Director',
      6: 'COO',
      7: 'External Affairs',
      8: 'R&D Director',
    },
  },
  privy: {
    leader: ['King', 'Queen'],
    body: 'Privy Council',
    portrait: 'monarch',
    slots: privySlots,
  },
  imperial: {
    leader: ['Emperor', 'Empress'],
    body: 'Imperial Court',
    portrait: 'emperor',
    slots: privySlots,
  },
  aristocracy: {
    leader: 'First Peer',
    body: 'Privy Council',
    portrait: 'monarch',
    slots: privySlots,
  },
  synod: {
    leader: ['Patriarch', 'Matriarch'],
    body: 'Holy Synod',
    portrait: 'theocrat',
    slots: {
      1: 'Cardinal-Secretary',
      2: 'Divine Bursar',
      3: 'Templar Grandmaster',
      4: 'High Preacher',
      5: 'Inquisitor General',
      6: 'Divine Architect',
      7: 'Papal Legate',
      8: 'Magister of the Academy',
    },
  },
  elders: {
    leader: 'Elder Speaker',
    body: 'Council of Elders',
    portrait: 'chairman',
    slots: {
      1: 'First Elder',
      2: 'Purse Elder',
      3: 'War Elder',
      4: 'Lorekeeper',
      5: 'Watch Elder',
      6: 'Stone Elder',
      7: 'Envoy Elder',
      8: 'Sage',
    },
  },
  syndicate: {
    leader: 'General Secretary',
    body: 'Executive Committee',
    portrait: 'chairman',
    slots: {
      1: 'First Secretary',
      2: 'Treasurer',
      3: 'Defense Steward',
      4: 'Culture Steward',
      5: 'Integrity Officer',
      6: 'Works Steward',
      7: 'International Secretary',
      8: 'Research Steward',
    },
  },
  commission: {
    leader: ['Don', 'Godmother'],
    body: 'Commission',
    portrait: 'dictator',
    slots: {
      1: 'Consigliere',
      2: 'Bookkeeper',
      3: 'Capo of Arms',
      4: 'Public Face',
      5: 'Consigliere of Silence',
      6: 'Builder',
      7: 'Outside Man',
      8: 'Chemist',
    },
  },
  inner: {
    leader: 'Supreme Leader',
    body: 'Inner Circle',
    portrait: 'dictator',
    slots: {
      1: 'First Minister',
      2: 'Economic Director',
      3: 'Army Commander',
      4: 'Propaganda Minister',
      5: 'Secret Police Chief',
      6: 'Construction Commissar',
      7: "People's Diplomat",
      8: 'Chief Scientist',
    },
  },
  curia: {
    leader: ['High Priest', 'High Priestess'],
    body: 'Curia',
    portrait: 'theocrat',
    slots: {
      1: 'Grand Confessor',
      2: 'Divine Bursar',
      3: 'Templar Grandmaster',
      4: 'High Preacher',
      5: 'Inquisitor General',
      6: 'Divine Architect',
      7: 'Apostolic Legate',
      8: 'Magister',
    },
  },
  consulate: {
    leader: 'Co-Consul',
    body: 'Consulate',
    portrait: 'president',
    slots: {
      1: 'Chancellor',
      2: 'Treasurer',
      3: 'Marshal',
      4: 'Chamberlain',
      5: 'Spymaster',
      6: 'Master of Works',
      7: 'Envoy',
      8: 'Court Scholar',
    },
  },
  nsc: {
    leader: 'President',
    body: 'National Security Council',
    portrait: 'military',
    slots: {
      1: 'Chief of Staff',
      2: 'Finance Minister',
      3: 'Defense Minister',
      4: 'Culture Minister',
      5: 'Intelligence Director',
      6: 'Infrastructure Minister',
      7: 'Foreign Minister',
      8: 'Science Minister',
    },
  },
  circle: {
    leader: 'Spokesperson',
    body: 'Coordinating Circle',
    portrait: 'president',
    slots: circleSlots,
  },
  mutual: {
    leader: 'Facilitator',
    body: 'Circle',
    portrait: 'president',
    slots: { ...circleSlots, 4: 'Story-Keeper' },
  },
  workers: {
    leader: 'Delegate',
    body: "Workers' Council",
    portrait: 'chairman',
    slots: circleSlots,
  },
  ancap: {
    leader: 'Chief Arbiter',
    body: 'Board of Charters',
    portrait: 'corporate',
    slots: {
      1: 'Managing Partner',
      2: 'Comptroller',
      3: 'Security Contractor',
      4: 'Publicist',
      5: 'Risk Officer',
      6: 'Operations',
      7: 'Negotiator',
      8: 'Research Lead',
    },
  },
  tribal: {
    leader: 'Clan Speaker',
    body: 'Elder Circle',
    portrait: 'chairman',
    slots: {
      1: 'First Elder',
      2: 'Purse Elder',
      3: 'War Elder',
      4: 'Lorekeeper',
      5: 'Watch Elder',
      6: 'Stone Elder',
      7: 'Envoy Elder',
      8: 'Sage',
    },
  },
  warlord: {
    leader: 'Warlord',
    body: 'War Council',
    portrait: 'military',
    slots: {
      1: 'Second',
      2: 'Paymaster',
      3: 'Marshal',
      4: 'Herald',
      5: 'Scoutmaster',
      6: 'Sappers',
      7: 'Fixer',
      8: 'Armorer',
    },
  },
  hive: { leader: 'Queen', body: "Queen's Chamber", portrait: 'queen', slots: hiveSlots },
  hive_council: { leader: 'Queen', body: 'Hive Council', portrait: 'queen', slots: hiveSlots },
  hive_caste: { leader: 'Queen', body: 'Caste Council', portrait: 'queen', slots: hiveSlots },
  hive_sacred: { leader: 'Queen', body: 'Sacred Brood', portrait: 'queen', slots: hiveSlots },
  hive_elder: { leader: 'Queen', body: 'Elder Brood', portrait: 'queen', slots: hiveSlots },
  hive_inner: { leader: 'Queen', body: 'Inner Brood', portrait: 'queen', slots: hiveSlots },
  hive_divine: { leader: 'Queen', body: 'Divine Hive', portrait: 'queen', slots: hiveSlots },
  swarm: { leader: 'Queen', body: 'Swarm', portrait: 'queen', slots: hiveSlots },
};

const SUBTYPE_PACK: Record<string, string> = {
  'Representative Democracy': 'presidential',
  'Parliamentary Democracy': 'parliamentary',
  'Presidential Democracy': 'presidential',
  'Democratic Republic': 'presidential',
  'Direct Democracy': 'assembly',
  'Consociational Democracy': 'coalition',
  'Deliberative Democracy': 'assembly',
  'One-Party Elite Rule': 'politburo',
  'Military Junta': 'junta',
  'Plutocracy': 'board',
  'Aristocracy': 'aristocracy',
  'Theocratic Council': 'synod',
  'Gerontocracy': 'elders',
  'Syndicate / Labor Oligarchy': 'syndicate',
  'Mafiocracy / Criminal Oligarchy': 'commission',
  'Dictatorship': 'inner',
  'Absolute Monarchy': 'privy',
  'Tyranny / Personalist Rule': 'inner',
  'Absolute Theocracy': 'curia',
  'Electoral Autocracy': 'presidential',
  'Diarchy / Dual Rule': 'consulate',
  'Competitive Authoritarian': 'presidential',
  'Illiberal Democracy': 'parliamentary',
  'Military-Managed Democracy': 'nsc',
  'Anarcho-Communist Commune': 'circle',
  'Warlord / Failed State': 'warlord',
  'Anarcho-Capitalist / Private-Law': 'ancap',
  'Mutual-Aid Network': 'mutual',
  'Tribal / Clan Anarchy': 'tribal',
  'Worker-Syndicate Free Territory': 'workers',
  'Hive Council / One-Party Elite Rule': 'hive_council',
  'Caste Oligarchy': 'hive_caste',
  'Absolute Monarchy / Queen-Rule': 'hive',
  'Hive Collapse / Swarm Anarchy': 'swarm',
};

const ZYTHERA_OVERRIDE: Record<string, string> = {
  'Theocratic Council': 'hive_sacred',
  'Gerontocracy': 'hive_elder',
  'Tyranny / Personalist Rule': 'hive_inner',
  'Absolute Theocracy': 'hive_divine',
};

const HIVE_IDS = new Set([
  'hive', 'hive_council', 'hive_caste', 'hive_sacred', 'hive_elder', 'hive_inner', 'hive_divine', 'swarm',
]);

function isImperial(territorial?: string) {
  const t = (territorial || '').toLowerCase();
  return t.includes('imperial') || t.includes('hegemon');
}

export function packIdFor(subtype?: string, territorial?: string, race?: string): string {
  const raceL = (race || 'human').toLowerCase();
  const sub = subtype || '';
  if (raceL === 'zythera') {
    if (ZYTHERA_OVERRIDE[sub]) return ZYTHERA_OVERRIDE[sub];
    const mapped = SUBTYPE_PACK[sub];
    if (mapped && HIVE_IDS.has(mapped)) return mapped;
    return 'hive';
  }
  let pid = SUBTYPE_PACK[sub] || 'presidential';
  if (pid === 'privy' && isImperial(territorial)) return 'imperial';
  return pid;
}

function packFor(subtype?: string, territorial?: string, race?: string): Pack {
  return PACKS[packIdFor(subtype, territorial, race)] || PACKS.presidential;
}

export function leaderTitle(opts: {
  subtype?: string;
  territorial?: string;
  race?: string;
  leaderName?: string;
}): string {
  if ((opts.race || '').toLowerCase() === 'zythera') return 'Queen';
  const pack = packFor(opts.subtype, opts.territorial, opts.race);
  return pick(pack.leader, leaderIsFemale(opts.leaderName));
}

export function bodyName(opts: { subtype?: string; territorial?: string; race?: string }): string {
  return packFor(opts.subtype, opts.territorial, opts.race).body;
}

export function portraitKind(opts: { subtype?: string; territorial?: string; race?: string }): string {
  if ((opts.race || '').toLowerCase() === 'zythera') return 'queen';
  return packFor(opts.subtype, opts.territorial, opts.race).portrait;
}

export function advisorTitle(slot: number, opts: { subtype?: string; territorial?: string; race?: string }): string {
  return packFor(opts.subtype, opts.territorial, opts.race).slots[slot] || 'Advisor';
}
