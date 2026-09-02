import { NONE, UNITARY, HUMAN, put } from './govOperating.store';

const U = UNITARY;
const F = 'federal';
const C = 'confederal';
const Y = 'federacy / asymmetrical federation';
const I = 'imperial / hegemonic';
const N = NONE;
const POP = 'Populist';
const MIL = 'Military-Influenced';
const PAT = 'Paternalist / Welfare-First';
const TRAD = 'Traditional / Hereditary';
const THEO = 'Theocratic Influence';
const TECH = 'Technocratic';
const REV = 'Revolutionary / Provisional';
const CORP = 'Corporate / Business Elite';
const BUR = 'Bureaucratic';
const ECO = 'Ecological / Green-Influenced';
const MER = 'Meritocratic';
const CHA = 'Charismatic Leader Focus';
const PRAE = 'Praetorian / Security-State';
const ISO = 'Isolationist';
const CS = 'Constitutional / Limited';
const LIB = 'Libertarian / Minimal-State';

function set(subtype: string, terr: string, style: string, text: string) {
  put(HUMAN, subtype, terr, style, text);
}

export function loadOligarchyOperating() {
  set('One-Party Elite Rule', U, N,
    'One party is the state. Careers, courts, and news all run through it; a vote, if it happens, is a roll call, not a choice.');
  set('One-Party Elite Rule', F, N,
    'The same party holds the union and the states. Federalism is administrative: local secretaries copy the center, then blame the center.');
  set('One-Party Elite Rule', C, N,
    'Sister parties in each member polity recognize one another. The “confederation” is a liaison office; discipline still comes from the same school.');
  set('One-Party Elite Rule', Y, N,
    'The party is everywhere, except the region that bargained for its own organization — a local league the center has not yet digested.');
  set('One-Party Elite Rule', I, N,
    'The party-state at the core rules provinces and clients as a civilizing mission. Outer lands get governors, not comrades.');
  set('One-Party Elite Rule', U, POP,
    'The party speaks as the masses. Rallies are mandatory joy; anyone who stays home is counted as an enemy of the people who already voted.');
  set('One-Party Elite Rule', U, MIL,
    'The party wears a uniform in the security files. Military commissars sit in the politburo, and a purely civilian line does not survive contact.');
  set('One-Party Elite Rule', U, PAT,
    'The party feeds you. Dossiers and rations are the same office; loyalty is a benefit tier.');
  set('One-Party Elite Rule', U, TRAD,
    'The party has become a lineage. Founding families and revolutionary houses inherit the good posts; ideology is the family business.');
  set('One-Party Elite Rule', U, THEO,
    'Doctrine is sacred and the party is its church. Heresy and faction are the same crime.');
  set('One-Party Elite Rule', U, TECH,
    'The central committee is a planning board. Engineers outrank orators unless the orators learned to speak in tables.');
  set('One-Party Elite Rule', U, REV,
    'The founding congress never ended. Permanent mobilization, enemies lists, and “stage of the struggle” are how ordinary tax is explained.');
  set('One-Party Elite Rule', U, CORP,
    'Party holding companies are the economy. A private fortune is either a franchise of the organization or a confession.');
  set('One-Party Elite Rule', U, BUR,
    'Cadre files beat slogans. Promotion is a stack of evaluations; the revolution happens in triplicate.');
  set('One-Party Elite Rule', U, ECO,
    'Five-year land rules can freeze a city the politburo wanted. Nature is another plan target — and sometimes it wins.');
  set('One-Party Elite Rule', U, MER,
    'The party school and the exam are the only ladder. Birth does not get you in; failing the cadre test gets you out.');
  set('One-Party Elite Rule', U, CHA,
    'The party has a name on the banner larger than its own. When that name dies, the committees discover they were a chorus.');
  set('One-Party Elite Rule', U, PRAE,
    'The interior service can unmake a general secretary. Party cards do not stop midnight cars.');
  set('One-Party Elite Rule', U, ISO,
    'The world is contamination. Foreign parties are tolerated as museums; foreign capital is a plot.');

  set('Military Junta', U, N,
    'Officers rule as a board. Civilian ministries exist to type what the junta already decided in the mess.');
  set('Military Junta', F, N,
    'Regional commands are the states. A “federal” junta is a council of garrison chiefs who can ignore the capital if their depot is full.');
  set('Military Junta', C, N,
    'Each member’s army is sovereign. The confederal junta is a liaison of warlords in uniform who cooperate when the ammo matches.');
  set('Military Junta', Y, N,
    'Most of the map answers to GHQ. One province kept its own command and a side treaty — a junta inside the junta.');
  set('Military Junta', I, N,
    'The officers who seized the core now run an outer empire of clients and marches. Occupied governors report to the same table that runs the capital.');
  set('Military Junta', U, POP,
    'The junta claims to have saved the people from politicians. Parades are the plebiscite; anyone who wants a party is ungrateful.');
  set('Military Junta', U, PAT,
    'Soldiers run the clinics and the grain. Welfare is a logistics problem, which is why it sometimes actually arrives.');
  set('Military Junta', U, TRAD,
    'The officer caste is hereditary in all but statute. Academies take sons of the last junta; coups change names, not families.');
  set('Military Junta', U, THEO,
    'Chaplains sit with the chiefs. A decree that the pulpit will not bless does not leave the compound.');
  set('Military Junta', U, TECH,
    'The junta governs as a staff problem. Civilian life is a logistics annex; experts in uniform outrank experts without.');
  set('Military Junta', U, REV,
    'This is a coup that still calls itself a revolution. Emergency communiqués never sunset.');
  set('Military Junta', U, CORP,
    'Procurement is the constitution. Combines that keep the army paid keep a chair; the rest are patriotic donations.');
  set('Military Junta', U, BUR,
    'Martial law is a filing system. Permits, curfews, and movement orders are the civilian experience of the regime.');
  set('Military Junta', U, ECO,
    'Ranges, watersheds, and fuel decide policy. A green rule that costs a campaign season loses; one that protects a river the engineers need may stand.');
  set('Military Junta', U, MER,
    'Staff college is the only politics. Incompetent cousins still get commands, but they do not keep them after the first exercise.');
  set('Military Junta', U, CHA,
    'The junta has a face — the strongman the others orbit. If that face goes, the table becomes a firing squad or a civil war.');
  set('Military Junta', U, PRAE,
    'The palace regiment can arrest the junta that created it. Nights are decided by who holds the inner barracks.');
  set('Military Junta', U, ISO,
    'Foreign wars are how juntas die. This one stays home, polices the interior, and calls it victory.');

  set('Plutocracy', U, N,
    'Money is the franchise. Offices, parties, and courts answer to whoever can fund them; a poor citizen is a spectator.');
  set('Plutocracy', F, N,
    'Each state’s rich run their state; the union is a cartel of those fortunes. Federal law is what the biggest balance sheets will co-sign.');
  set('Plutocracy', C, N,
    'Member plutocracies keep their own ledgers. The confederal board is a trade association with a flag.');
  set('Plutocracy', Y, N,
    'Ordinary provinces are for sale in the usual way. One territory was bought outright as a company march with its own courts.');
  set('Plutocracy', I, N,
    'The core’s fortunes run outer lands as concessions. Subject peoples meet the state as a company police.');
  set('Plutocracy', U, POP,
    'The rich hire the crowd. Tribunes shout against “elites” on a payroll the elites itemize as marketing.');
  set('Plutocracy', U, MIL,
    'Security firms and officer syndicates are just another asset class. A fortune without guns is a rumor.');
  set('Plutocracy', U, PAT,
    'Company towns and private stipends are the welfare state. Kindness is branded; exile is an unpaid invoice.');
  set('Plutocracy', U, TRAD,
    'Old money outranks new. Titles, clubs, and marriage do what elections pretend to do.');
  set('Plutocracy', U, THEO,
    'The biggest donors own the pulpits. Doctrine follows endowment; heresy is what the treasurer will not tithe.');
  set('Plutocracy', U, TECH,
    'The board trusts models more than voters. If the spreadsheet says close a city, the city closes.');
  set('Plutocracy', U, REV,
    'This fortune rode in with a crash or a seizure. The new rich still talk like insurgents; the old rich are a museum.');
  set('Plutocracy', U, CORP,
    'This is plutocracy without the mask: ministries are desks at headquarters, and the flag is letterhead.');
  set('Plutocracy', U, BUR,
    'You can buy the law and still wait six months for the stamp. Paper is how the rich keep other rich from jumping the queue.');
  set('Plutocracy', U, ECO,
    'Green rules are a market. Carbon, water, and viewsheds are assets; the poor live downstream of the trade.');
  set('Plutocracy', U, MER,
    'Money gets you in the room; incompetence gets you laughed out. Hired talent runs the files the heirs will not read.');
  set('Plutocracy', U, CHA,
    'One fortune has a face the country knows. When that person dies, the conglomerate discovers it was a personality cult with dividends.');
  set('Plutocracy', U, LIB,
    'The state is small because the rich already perform it. Taxes are theft; private courts are efficiency.');
  set('Plutocracy', U, ISO,
    'Foreign entanglement threatens the books. Capital may travel; the flag does not follow it to war.');

  set('Aristocracy', U, N,
    'Rank and blood decide who may hold power. The rest petition; a talented commoner is a servant, not a peer.');
  set('Aristocracy', F, N,
    'Each state’s great houses run that state. The union is a diet of families who can field retainers.');
  set('Aristocracy', C, N,
    'Sovereign houses meet as equals. There is no court above the lineage that can make them kneel.');
  set('Aristocracy', Y, N,
    'Most provinces take the ordinary peerage. One march kept a thicker privilege — its own high justice or exemption from the levy.');
  set('Aristocracy', I, N,
    'The high houses of the core treat outer peoples as estates. Local notables are clients, not cousins.');
  set('Aristocracy', U, POP,
    'Lords speak as protectors of “their” people. Festivals and grain doles keep the banners loyal when the law would not.');
  set('Aristocracy', U, MIL,
    'Nobility is a war caste. A house without a regiment is a story; commands follow pedigree first.');
  set('Aristocracy', U, PAT,
    'Paternal duty is the public face of privilege. Hospitals with crests, and eviction with the same crest.');
  set('Aristocracy', U, TRAD,
    'This is aristocracy unembarrassed: precedence, season, and memory are the constitution.');
  set('Aristocracy', U, THEO,
    'Sacred blood and sacred office intermarry. A house that loses the altar loses the county.');
  set('Aristocracy', U, TECH,
    'Heirs still inherit, then hire savants. A foolish lord who ignores the stewards loses the estate to the stewards’ cousins.');
  set('Aristocracy', U, REV,
    'A new nobility of the uprising. Yesterday’s comrades are today’s titled; they keep the radical calendar and the old manors.');
  set('Aristocracy', U, CORP,
    'Shares and patents have been entailed. The house is a holding company; the coat of arms is a trademark.');
  set('Aristocracy', U, BUR,
    'Heraldry meets chancery. Nothing transfers without enrollment, which is how lesser houses are kept lesser.');
  set('Aristocracy', U, ECO,
    'Game law and forest right are older than industry. A mill that spoils a hunting water loses in a court of peers.');
  set('Aristocracy', U, CHA,
    'One house has a person the country loves or fears more than the peerage. The diet orbits that name.');
  set('Aristocracy', U, PRAE,
    'Household troops around the capital can unseat a council of lords. Precedence ends at the inner gate.');
  set('Aristocracy', U, ISO,
    'Foreign marriages are how houses used to play. This generation treats abroad as contamination of the blood.');

  set('Theocratic Council', U, N,
    'Clerics sit as a college and treat doctrine as statute. The state is a church that collects taxes and hangs people.');
  set('Theocratic Council', F, N,
    'Each region has its synod; the union synod handles creed and war. A local rite that drifts too far is a federal heresy case.');
  set('Theocratic Council', C, N,
    'Autocephalous churches cooperate. Nobody can excommunicate a member polity without starting a schism that is also secession.');
  set('Theocratic Council', Y, N,
    'The college rules most of the map. One holy territory keeps a stricter (or looser) rite the others must tolerate by treaty.');
  set('Theocratic Council', I, N,
    'The core clergy missionize with soldiers. Outer lands are flocks first, provinces second.');
  set('Theocratic Council', U, POP,
    'The council rules by revival. Street piety can elevate a preacher over a scholar; the college pretends it was always the doctrine.');
  set('Theocratic Council', U, MIL,
    'Templar offices sit in the synod. A purely scholarly majority does not survive the next campaign season.');
  set('Theocratic Council', U, PAT,
    'Alms are the state. Tithe, clinic, and sermon are one queue; unbelief is a benefits decision.');
  set('Theocratic Council', U, TRAD,
    'Canon is memory. New revelation is a threat; the oldest commentary wins.');
  set('Theocratic Council', U, TECH,
    'The college funds observatories and forbids the wrong conclusions. Expertise is holy when it confirms, and suspect when it does not.');
  set('Theocratic Council', U, REV,
    'A purified council after a purge of the old church. The calendar starts at the cleansing; yesterday’s canon is a crime.');
  set('Theocratic Council', U, CORP,
    'Temple wealth is the treasury. Endowments vote; a poor monastery has a short argument.');
  set('Theocratic Council', U, BUR,
    'Canon law is paperwork. Dispensations, indices, and licenses are how grace is rationed.');
  set('Theocratic Council', U, ECO,
    'Creation is doctrine. A mine that wounds a sacred water loses even if the tithe would rise.');
  set('Theocratic Council', U, MER,
    'Scholarship and examination make bishops. Charisma without the boards is a street heresy.');
  set('Theocratic Council', U, CHA,
    'The college has a prophet. When that voice is gone, the remaining seats are ordinary men in extraordinary hats.');
  set('Theocratic Council', U, PRAE,
    'The inquisition or temple guard can arrest a councilor. Orthodoxy is whoever holds the cells under the cathedral.');
  set('Theocratic Council', U, ISO,
    'Foreign missions are temptation. This synod keeps the flock at home and calls the world unclean.');

  set('Gerontocracy', U, N,
    'Seniority is the qualification. Elders keep the chairs; the young wait, inherit, or leave.');
  set('Gerontocracy', F, N,
    'Each state’s old sit their own council, then send their oldest to the union. Energy is a local problem; delay is national policy.');
  set('Gerontocracy', C, N,
    'Sovereign councils of elders treat the center as a courtesy. Nothing youthful enough to be urgent is confederal.');
  set('Gerontocracy', Y, N,
    'Most of the country ages into office. One region lets younger magistrates work — a scandal the elders have not yet outlived.');
  set('Gerontocracy', I, N,
    'Old houses of the core appoint stewards over young outer lands. Subject peoples are children in the metaphor and in the law.');
  set('Gerontocracy', U, POP,
    'The elders speak as grandparents of the nation. Youth movements are ungrateful children until they wait their turn.');
  set('Gerontocracy', U, MIL,
    'High command is a retirement home with medals. Campaigns are cautious; the young die on schedules the old remember.');
  set('Gerontocracy', U, PAT,
    'Care for the aged is the state’s first duty, which is convenient for the people who run it. Everyone else is a future elder in arrears.');
  set('Gerontocracy', U, TRAD,
    'This is gerontocracy at ease: precedent, anniversary, and the right to finish a sentence no matter how long it is.');
  set('Gerontocracy', U, THEO,
    'Age is holiness. A young cleric with a new reading waits outside while the commentary from sixty years ago governs.');
  set('Gerontocracy', U, TECH,
    'The old hire the technical young and take credit. Innovation must be explained as restoration.');
  set('Gerontocracy', U, REV,
    'The surviving founders will not leave. The revolution is a gerontocracy of people who won once and mean to die in the chair.');
  set('Gerontocracy', U, CORP,
    'Boards have age floors. Founders stay executive until the body fails; succession is a funeral.');
  set('Gerontocracy', U, BUR,
    'Procedure is how the old keep tempo. A young official who hurries is insubordinate.');
  set('Gerontocracy', U, ECO,
    'The elders remember a greener map and will freeze a forest in that memory. Development waits for funerals.');
  set('Gerontocracy', U, CHA,
    'One ancient name is the regime. When that person dies, the rest of the council is a waiting room.');
  set('Gerontocracy', U, ISO,
    'Abroad is a young person’s temptation. This government does not start wars it cannot outlive.');

  set('Syndicate / Labor Oligarchy', U, N,
    'Unions and workplace federations are the government. Industry boards write the rules the streets live under.');
  set('Syndicate / Labor Oligarchy', F, N,
    'Each state’s syndicates run that state; the union federation handles rails, ports, and war. A strike in one industry is a federal crisis.');
  set('Syndicate / Labor Oligarchy', C, N,
    'Sovereign labor polities trade with each other. The confederal council cannot order a mine in another member to open.');
  set('Syndicate / Labor Oligarchy', Y, N,
    'Most trades sit in the same federation. One region’s syndicate kept a closed shop the others cannot vote open.');
  set('Syndicate / Labor Oligarchy', I, N,
    'The core’s unions extract from outer plantations and shops that are not in the hall. Solidarity stops at the citizenship of the card.');
  set('Syndicate / Labor Oligarchy', U, POP,
    'The hall claims to be the class. Mass meetings can bounce a secretary; they can also be packed by the existing one.');
  set('Syndicate / Labor Oligarchy', U, MIL,
    'Workers’ militias and dock guards are a ministry. A civilian strike that the militia opposes is already over.');
  set('Syndicate / Labor Oligarchy', U, PAT,
    'The union clinic and pension are the state. Lose the card, lose the doctor; politics is membership.');
  set('Syndicate / Labor Oligarchy', U, TRAD,
    'Trades are hereditary books. A family that has always been on the docks stays on the docks, with the votes that come with it.');
  set('Syndicate / Labor Oligarchy', U, THEO,
    'Saints of labor and chapel locals sit in the federation. A contract the pulpit calls usury does not get signed.');
  set('Syndicate / Labor Oligarchy', U, TECH,
    'Shop engineers sit with the secretaries. A romantic strike against a machine the planners need is a short strike.');
  set('Syndicate / Labor Oligarchy', U, REV,
    'The expropriation is still happening in the minutes. Emergency workers’ control has not been repealed because nobody will move to repeal it.');
  set('Syndicate / Labor Oligarchy', U, CORP,
    'The federation incorporated. Locals are subsidiaries; a dissident shop is a branding problem.');
  set('Syndicate / Labor Oligarchy', U, BUR,
    'Every job is a form. The closed shop is a filing cabinet with a picket.');
  set('Syndicate / Labor Oligarchy', U, ECO,
    'Green locals can close a pit the metal locals want. The federation’s worst fights are species versus overtime.');
  set('Syndicate / Labor Oligarchy', U, MER,
    'Journeyman tests are the franchise. A loud incompetent does not get the card, and without the card there is no politics.');
  set('Syndicate / Labor Oligarchy', U, CHA,
    'One organizer is the federation. If that person falls, the trades remember they hated each other.');
  set('Syndicate / Labor Oligarchy', U, ISO,
    'Foreign cheap labor is the enemy. The hall wants no treaties that open the dock.');

  set('Mafiocracy / Criminal Oligarchy', U, N,
    'The syndicate is the state: protection, courts, and taxes are rackets with a flag. Honest offices exist to launder the story.');
  set('Mafiocracy / Criminal Oligarchy', F, N,
    'Families hold states as territories. The “federal” commission is a sit-down; crossing a line without permission is a war.');
  set('Mafiocracy / Criminal Oligarchy', C, N,
    'Sovereign crews recognize borders. The confederation is a truce, broken whenever a port looks unsupervised.');
  set('Mafiocracy / Criminal Oligarchy', Y, N,
    'Most of the map pays the usual tribute. One enclave is a rival family the commission has not absorbed — a hole in the flag.');
  set('Mafiocracy / Criminal Oligarchy', I, N,
    'The core families run outer lands as collection routes. Subject towns meet the empire as extortion with better stationery.');
  set('Mafiocracy / Criminal Oligarchy', U, POP,
    'The don is a folk hero. Street festivals and neighborhood cash keep witnesses quiet and ballots unanimous.');
  set('Mafiocracy / Criminal Oligarchy', U, MIL,
    'Crews are already armed. A “national army” is the family that won last year, wearing ranks.');
  set('Mafiocracy / Criminal Oligarchy', U, PAT,
    'The envelope and the funeral money are welfare. People know who buries them; they also know the price.');
  set('Mafiocracy / Criminal Oligarchy', U, TRAD,
    'Blood and godparentage are the constitution. A talented outsider stays hired help.');
  set('Mafiocracy / Criminal Oligarchy', U, THEO,
    'Saints and omertà share a calendar. A priest who talks to outsiders loses a flock, or worse.');
  set('Mafiocracy / Criminal Oligarchy', U, TECH,
    'The books are digital and the hits are not. Accountants outrank shooters until collection day.');
  set('Mafiocracy / Criminal Oligarchy', U, REV,
    'A new crew took the palace and kept the revolutionary slogans. The old families are a graveyard still being filled.');
  set('Mafiocracy / Criminal Oligarchy', U, CORP,
    'The racket incorporated. Fronts, holdings, and “security services” are how the flag files taxes.');
  set('Mafiocracy / Criminal Oligarchy', U, BUR,
    'Even a racket needs ledgers. Permits to commit the crime are how juniors are controlled.');
  set('Mafiocracy / Criminal Oligarchy', U, ECO,
    'Dumping and poaching are businesses. A crew that poisons its own neighborhood still has to live there, which is the only brake.');
  set('Mafiocracy / Criminal Oligarchy', U, CHA,
    'One name is the country. When that name is buried, the commission becomes a civil war.');
  set('Mafiocracy / Criminal Oligarchy', U, PRAE,
    'The inner crew that guards the don can replace the don. Loyalty is proximity to the bedroom.');
  set('Mafiocracy / Criminal Oligarchy', U, ISO,
    'Foreign partners bring heat. This commission wants local monopolies, not international fame.');
}

loadOligarchyOperating();
