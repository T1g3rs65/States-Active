/** Display names and one-line blurbs. Enum/DB strings stay as keys. */

export const GOV_TITLE: Record<string, string> = {
  'Left-Wing Utopia': 'Socialist state',
  'Scandinavian Liberal Paradise': 'Nordic welfare state',
  'Liberal Democratic Paradise': 'Liberal democracy',
  'Capitalist Paradise': 'Market republic',
  'Right-Wing Utopia': 'Night-watchman state',
  'Eco-Socialist Haven': 'Eco-socialist state',
  'Welfare Paradise': 'Welfare state',
  'Laissez-Faire Dynamo': 'Laissez-faire',
  'Civil Rights Lovefest': 'Civil libertarian state',
  'Free-Market Paradise': 'Free-market republic',
  'Harmonious Hive': 'Balanced hive',
  'Nurturing Hive': 'Care hive',
  'Symbiotic Swarm': 'Cooperative swarm',
  'Diplomatic Swarm': 'Diplomatic hive',
  'Techno-Swarm': 'Tech hive',
};

export const GOV_BLURB: Record<string, string> = {
  'Left-Wing Utopia': 'Public ownership, tight equality, thin private wealth.',
  'Scandinavian Liberal Paradise': 'High tax, high services, still a market.',
  'Democratic Socialists': 'Elected government, heavy welfare, mixed economy.',
  'Liberal Democratic Paradise': 'Elections, civil liberties, ordinary capitalism.',
  'Capitalist Paradise': 'Light regulation, business first.',
  'Corporate Police State': 'Firms write the rules and enforce them.',
  'Right-Wing Utopia': 'Small state, property and guns, little else.',
  'Authoritarian Democracy': 'Votes happen. The same people stay in charge.',
  'Benevolent Dictatorship': 'One ruler. Competent, not free.',
  'Iron Fist Consumerists': 'Shop freely. Do not talk politics.',
  'Moralistic Democracy': 'The majority voted in a moral code.',
  'Psychotic Dictatorship': 'Terror as policy.',
  'Anarchy': 'No centre. Local deals and local guns.',
  'Father Knows Best State': 'The state parents you “for your own good.”',
  'Eco-Socialist Haven': 'Green rules and public ownership.',
  'Welfare Paradise': 'Cradle-to-grave benefits, funded by the tax take.',
  'Laissez-Faire Dynamo': 'No industrial policy. Markets clear or they don’t.',
  'Tech Oligarchy': 'Engineers and founders run the cabinet.',
  'Trade Empire': 'Customs, ports, and deals with everyone.',
  'Surveillance Panopticon': 'Cameras, IDs, no private life.',
  'Theocratic Enforcers': 'Clergy as law.',
  'Martial Command': 'Generals keep the peace.',
  'Seastead Republic': 'Offshore, lightly taxed, legally fuzzy.',
  'Psychedelic Free State': 'Drugs are legal. Most other vices too.',
  'Pragmatic Meritocracy': 'Exams and résumés beat bloodlines.',
  'Technocratic Syndicate': 'Specialists vote; parties don’t.',
  'Inoffensive Centrist Democracy': 'The middle of every chart.',
  'Civil Rights Lovefest': 'The state exists to get out of the way.',
  'Corporate Bordello': 'If it sells, it’s legal.',
  'Corrupt Dictatorship': 'The palace is a payroll.',
  'Free-Market Paradise': 'Competition is the only plan.',
  'Cyberpunk Megacity': 'High tech, bad streets, corporate towers.',
  'Pirate Haven': 'No extradition, few questions.',
  'Socialist Republic': 'Central plan, some room to speak.',
  "People's Republic": 'The party owns the economy and the press.',
  'Collective Hive': 'Queen as quartermaster. Shares are even.',
  "Worker's Swarm": 'Labour caste runs production under the Queen.',
  'Royal Hive': 'Caste is law. The Queen does not explain.',
  'Imperial Swarm': 'The hive grows by taking ground.',
  'Divine Hive': 'The Queen is worshipped, not merely obeyed.',
  'Militant Hive': 'Warrior caste first.',
  'Ordered Colony': 'Forms, rosters, quotas.',
  'Symbiotic Swarm': 'Room for individuals inside the hive.',
  'Nurturing Hive': 'The Queen spends on brood and sick.',
  'Merchant Hive': 'Trade first, war later.',
  'Techno-Swarm': 'Labs outrank temples.',
  'Harmonious Hive': 'Neither tight nor loose. It works.',
  'Free Colony': 'The Queen lets subjects wander.',
  'Balanced Hive': 'Whatever the hive needs this season.',
  'Diplomatic Swarm': 'Treaties over raids.',
  'Parasitic Hive': 'Tribute in, work out.',
};

export function govTitle(raw?: string | null): string {
  if (!raw) return '';
  return GOV_TITLE[raw] || raw;
}

export function govBlurb(raw?: string | null): string {
  if (!raw) return '';
  return GOV_BLURB[raw] || '';
}
