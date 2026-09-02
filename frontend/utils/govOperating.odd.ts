import { NONE, UNITARY, HUMAN, put } from './govOperating.store';

const U = UNITARY;
const C = 'confederal';
const I = 'imperial / hegemonic';
const N = NONE;
const CS = 'Constitutional / Limited';
const LIB = 'Libertarian / Minimal-State';
const PART = 'Participatory / Deliberative';
const CHA = 'Charismatic Leader Focus';
const BUR = 'Bureaucratic';
const PRAE = 'Praetorian / Security-State';
const PAT = 'Paternalist / Welfare-First';
const TRAD = 'Traditional / Hereditary';
const TECH = 'Technocratic';
const MER = 'Meritocratic';
const Y = 'federacy / asymmetrical federation';

function set(subtype: string, terr: string, style: string, text: string) {
  put(HUMAN, subtype, terr, style, text);
}

export function loadOddOperating() {
  // 1A — Constitutional as sham charter
  set('Absolute Monarchy', U, CS,
    'There is a charter, and the crown signs it in public. Then the crown issues the next edict anyway. Courts exist to explain why this exception was always allowed.');
  set('Dictatorship', U, CS,
    'A constitution hangs in every ministry. It lists rights the dictator has “temporarily” suspended since the founding seizure, which has no scheduled end.');
  set('Tyranny / Personalist Rule', U, CS,
    'Paper limits were written for a state of offices. This country is a person. The charter is quoted when it flatters them and lost when it does not.');
  set('Absolute Theocracy', U, CS,
    'Canon includes a bill of earthly limits. The sacred office interprets every clause as already fulfilled by obedience. Heresy is calling that a contradiction.');

  // 2A — Confederal one-person rule = league of local strongmen + figurehead
  set('Dictatorship', C, N,
    'Each member polity has its own strongman. The confederal “dictator” is the one they can all stand to toast — a figurehead with a bigger flag and no troops of their own.');
  set('Tyranny / Personalist Rule', C, N,
    'Local bosses run their patches as private courts. They keep a shared celebrity at the center so nobody has to admit the league is just a truce.');
  set('Absolute Monarchy', C, N,
    'Sovereign princes swear to a high king they will not actually obey. The crown tours, blesses, and arbitrates feuds; the armies stay home with their own dukes.');
  set('Absolute Theocracy', C, N,
    'Autocephalous holy states share a supreme cleric they can ignore between councils. The office is real enough for festivals and not real enough to tax.');

  // 3A — Imperial democracy = metropolitan voters, subject marches
  set('Representative Democracy', I, N,
    'Citizens at the core elect a chamber. Outer marches do not: they send tribute, conscripts, and governors. The house argues about the empire; the empire does not vote.');
  set('Parliamentary Democracy', I, N,
    'A metropolitan parliament makes and unmakes cabinets. Subject lands are run by the colonial office, which does not fall when the house does — unless the house wants a war.');
  set('Presidential Democracy', I, N,
    'The core elects a president on a separate ticket. The marches get a governor-general. Gridlock is a capital hobby; the provinces get decrees.');
  set('Democratic Republic', I, N,
    'The republic is elective at home and proprietary abroad. “No crown” applies to the metropole. Everyone else meets the republic as an occupying committee.');
  set('Direct Democracy', I, N,
    'The demos at the center ballots on everything, including other people’s lives. Subject territories do not get a floor; they get the result.');
  set('Consociational Democracy', I, N,
    'Core communities share power by quota. Outer peoples are not a community in that deal — they are the estate that pays for the bargain.');
  set('Deliberative Democracy', I, N,
    'The metropole talks for months before it acts. The marches live under last year’s conclusion without having been in the room.');

  // 4A — Libertarian / Participatory as window dressing on hard cores
  set('Military Junta', U, LIB,
    'The junta talks about a thin state while running checkpoints. “Freedom” means the officers will not bother you if the curfew is kept.');
  set('Military Junta', U, PART,
    'Town councils are allowed to discuss garbage and festivals. Anything with a rank attached is not a discussion item.');
  set('One-Party Elite Rule', U, LIB,
    'The party boasts that it stays out of the home. Then the block warden visits. Minimal-state is a slogan for people already in the file.');
  set('One-Party Elite Rule', U, PART,
    'Work-unit meetings and “mass line” sessions soak up talk. The politburo is not on the agenda, and putting it there is a career event.');
  set('Absolute Theocracy', U, LIB,
    'The sacred office claims the soul, not the market — then tithes both. Liberty is whatever doctrine has not noticed this week.');
  set('Absolute Theocracy', U, PART,
    'Congregations vote on feast days and local alms. Creed, war, and law are not congregational.');
  set('Mafiocracy / Criminal Oligarchy', U, LIB,
    'No public taxes, they say. You still pay, just to a crew. The thin state is a thick racket.');
  set('Mafiocracy / Criminal Oligarchy', U, PART,
    'Neighborhood sit-downs look like councils. The don already picked the outcome; attendance is how you prove you heard it.');

  // 6A — Diarchy + charismatic: one ate the other
  set('Diarchy / Dual Rule', U, CHA,
    'The constitution names two rulers. The country knows which name is on the banners. The other still signs papers; nobody asks them first. The nation screen marks who actually holds the power.');

  // 5A — Direct / Deliberative + Praetorian: the guards captured the floor
  set('Direct Democracy', U, PRAE,
    'The people still raise hands. The palace regiment decides which votes are counted, which assemblies may meet, and which results leave the yard. The floor is a ceremony the guard allows.');
  set('Deliberative Democracy', U, PRAE,
    'Hearings run until the inner troops get bored. A consensus the guard dislikes is “incomplete process.” The talking cure ends at the barrack gate.');
  set('Direct Democracy', U, TRAD,
    'The assembly sits, but the old families speak first and last. A motion without an elder’s nod is theatre; the vote is how the lineage records what it already chose.');
  set('Deliberative Democracy', U, TRAD,
    'Deliberation follows a speaking order older than the republic. Young citizens may attend. They do not close the session.');

  // 7F — Gerontocracy + Meritocratic: exam can get you a working office, never the chair
  set('Gerontocracy', U, MER,
    'A young passer of the exams can run a bureau, a mill, a campaign season. They will not take the speaking chair. Age keeps the dais; merit keeps the files moving underneath it.');

  // 8B — Anarchy + state-machine styles: write the contradiction
  const anarchies = [
    'Anarcho-Communist Commune',
    'Warlord / Failed State',
    'Anarcho-Capitalist / Private-Law',
    'Mutual-Aid Network',
    'Tribal / Clan Anarchy',
    'Worker-Syndicate Free Territory',
  ];
  const anarchyBits: Record<string, [string, string, string, string, string, string, string, string]> = {
    'Anarcho-Communist Commune': [
      'They posted a constitution on the hall wall and then voted that no one may enforce it. The paper is a sermon against itself.',
      'Committees multiply until the commune looks like a ministry. Every new form is justified as “just this once,” which is how the state they hanged comes back as clipboards.',
      'A militia that was supposed to dissolve now guards the assembly from the assembly. People call it defense of the revolution while standing in a queue to show papers.',
      'The commune talks like a parent. Rations and lectures replace ownership; you are free, and also assigned a clinic hour.',
      'Planners without a state still plan. Five-year tables hang in a hall that claims to have abolished offices.',
      'They grade comrades on usefulness. A commune with exams is a school that forgot it swore off masters.',
      'Some communes got extra deals — their own mills, their own exemption. Equals, except these equals.',
      'They will not say empire. They still take from the next valley “for the common store” and leave a flag.',
    ],
    'Warlord / Failed State': [
      'Someone printed a constitution in the last intact print shop. No crew enforces it except as an excuse to shoot the other crew.',
      'Warlords issue movement orders on stolen letterhead. The bureaucracy is a crate of stamps and a man with a rifle who can read.',
      'Palace guards of a dead state now pick which boss lives. That is the whole government.',
      'A boss who feeds a district calls it care. It is a leash with grain on the end.',
      'One literate lieutenant keeps “plans.” The rest keep ammo. The plans die when the lieutenant does.',
      'They test boys for the elite crew. Merit here is who can hold a checkpoint without getting robbed by their own side.',
      'One patch bargained a special truce. The map calls it a federacy; the road calls it a toll.',
      'A crew with a radio claims the old empire. The claim reaches as far as the next mined bridge.',
    ],
    'Anarcho-Capitalist / Private-Law': [
      'They sold constitutions as a product. Enforcement is whatever insurer you paid this month, which is not a constitution.',
      'Terms of service are a bureaucracy with better kerning. You can exit, if you can afford the exit fee.',
      'The largest security firm is a praetorian company. It can unmake a charter overnight and call it a market correction.',
      'Private welfare is a subscription. Miss a payment and the kindness ends, which they call personal responsibility.',
      'Modelers run the zone. A spreadsheet closed your street; there is no ministry to appeal, only a rival model at a higher tier.',
      'Exams gate the good courts. Equality before the law means equality before the law you purchased.',
      'Some zones bought special legal privileges. Asymmetrical contracts, a flag on the letterhead, same as a federacy.',
      'A charter company talks like a free territory and collects like a vice-royalty. The word empire is in the shareholders’ report, not the brochure.',
    ],
    'Mutual-Aid Network': [
      'They wrote down rights so the next generation would remember. Then they refused a court, so the rights are a song.',
      'Sign-up sheets became offices. The network hates this and keeps adding sheets.',
      'A disaster crew that will not stand down is a guard. They still eat from the common pot and sleep in the hall.',
      'Care work turned into assignment. You are helped, and you are expected, and leaving feels like theft.',
      'A few members love plans more than soup. They are tolerated until a winter makes them look like saviors.',
      'Skill-sharing became a ranking. The best medic is a quiet aristocrat of competence.',
      'One web got more wells and will not pool them. The others call it betrayal; they call it capacity.',
      'Aid raids on the next valley are described as sharing. The valley describes them as an army.',
    ],
    'Tribal / Clan Anarchy': [
      'Someone carved “laws of the people” on a stone. Custom already contradicted half of them; the stone is for guests.',
      'Gatherings keep minutes now. The young think it is civilization; the old think it is a trap.',
      'Household warriors around the speaking ground can end a gathering. That is not new. Calling them a security-state is.',
      'Elders who feed dependents call it duty. It is also how a clan becomes a small kingdom without the name.',
      'A cousin who learned foreign numbers wants a plan for the herds. The herds do not read.',
      'Initiation was always a test. Formal ranks on top of it look like a state the clans swore they were not.',
      'One lineage holds better water by old bargain. Equals in rhetoric, not in thirst.',
      'A clan that takes tribute from the next range will not use the word empire. The next range will.',
    ],
    'Worker-Syndicate Free Territory': [
      'The federation posted a charter of no-state. Then it created a committee to interpret the charter. The joke is not funny on the shop floor.',
      'Every job is a form again. They expropriated the bosses and kept the clipboards.',
      'The militia that was a picket is now a gate. Cards, please — for the free territory.',
      'The union clinic is mandatory solidarity. Opting out is scabbing, even if you are sick of being assigned.',
      'Planning locals talk like a ministry of industry that won. The dock still claims there are no ministers.',
      'Journeyman tests were always there. Treating them as a civil service is how a free territory grows a state in the skill book.',
      'One region’s syndicate kept a closed exemption. The rest federate around a hole.',
      'Goods taken from unorganized valleys fund the hall. They will not say empire; the valleys do not need the word.',
    ],
  };

  const styleKeys = [CS, BUR, PRAE, PAT, TECH, MER];
  const terrKeys = [Y, I];
  for (const sub of anarchies) {
    const bits = anarchyBits[sub];
    styleKeys.forEach((st, i) => set(sub, U, st, bits[i]));
    set(sub, terrKeys[0], N, bits[6]);
    set(sub, terrKeys[1], N, bits[7]);
  }
}

loadOddOperating();
