import { HUMAN, put } from './govOperating.store';

const F = 'federal';
const C = 'confederal';
const Y = 'federacy / asymmetrical federation';
const I = 'imperial / hegemonic';
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
const PART = 'Participatory / Deliberative';

function s(sub: string, t: string, st: string, text: string) {
  put(HUMAN, sub, t, st, text);
}

const STYLES: [string, string][] = [
  [POP, 'crowd'], [MIL, 'officers'], [PAT, 'dole'], [TRAD, 'old names'], [THEO, 'pulpit'],
  [TECH, 'tables'], [REV, 'rupture'], [CORP, 'combines'], [BUR, 'circulars'], [ECO, 'land'],
  [MER, 'exams'], [CHA, 'a face'], [PRAE, 'inner troops'], [ISO, 'the closed border'],
];

export function loadRestStacks() {
  // Hand-written stacks for remaining families — federal / confederal / federacy / imperial × style
  const rows: [string, string, string, string][] = [];

  const add = (sub: string, terr: string, style: string, text: string) => {
    if (!text || text === 'Skip') return;
    s(sub, terr, style, text);
  };

  // One-Party
  const OP = 'One-Party Elite Rule';
  add(OP, F, POP, 'The same party holds union and states, then buses both crowds. Federalism is two rallies with one hymn.');
  add(OP, F, MIL, 'Commissars sit in both layers. A purely civilian state secretary is a rumor the garrison already filed.');
  add(OP, F, PAT, 'Rations are union and local, same dossier. Loyalty is a benefit tier that follows you across the internal border.');
  add(OP, F, TRAD, 'Founding houses hold union posts and state posts. Federalism is a family tree with two letterheads.');
  add(OP, F, THEO, 'Doctrine is the federal file. State secretaries who drift are heretics, not federalists.');
  add(OP, F, TECH, 'Union tables, state tables, one school. The five-year plan has counties.');
  add(OP, F, REV, 'Both layers still date from the seizure. Emergency is the federal constitution and the state one.');
  add(OP, F, CORP, 'Party holdings exist at both layers. A private fortune is a franchise of whichever committee is nearer.');
  add(OP, F, BUR, 'Cadre files in two stacks. Promotion requires both stamps.');
  add(OP, F, ECO, 'Land targets are union; implementation is state. A frozen forest is a plan dispute, not a park.');
  add(OP, F, MER, 'Party school, then the state exam, or the reverse. There is no other ladder in either layer.');
  add(OP, F, CHA, 'The banner name sits in the capital. State secretaries orbit it and discover, when it dies, that they were a chorus.');
  add(OP, F, PRAE, 'Interior cars exist federally and locally. A state card does not stop a union night.');
  add(OP, F, ISO, 'The world is contamination at both layers. Border states are just more interior.');
  add(OP, F, CS, 'A federal charter lists rights the party has suspended in the states as well. Paper is identical; so is the exception.');
  add(OP, F, LIB, 'The party boasts thinness in the provinces. Block wardens still visit. Minimal is a slogan with two addresses.');
  add(OP, F, PART, 'Work-unit meetings at both layers. The politburo is on neither agenda.');
  add(OP, C, POP, 'Sister parties bus their own crowds. The liaison office cannot even schedule the hymns.');
  add(OP, C, MIL, 'Each member’s commissars stay home. Confederal defence is a toast.');
  add(OP, C, PAT, 'Rations are member business. The liaison does not feed.');
  add(OP, C, TRAD, 'Each member’s founding house rules that member. The diet is a family reunion with minutes.');
  add(OP, C, THEO, 'Doctrine is local enough to schism. The diet cannot excommunicate a member party.');
  add(OP, C, TECH, 'Each party-state plans at home. Shared gauges are optional.');
  add(OP, C, REV, 'Some members are still seizing. The diet’s Year One is not theirs.');
  add(OP, C, CORP, 'Holdings stay in the member. Confederal combines are a rumor.');
  add(OP, C, BUR, 'Cadre files do not travel. The diet has no drawer.');
  add(OP, C, ECO, 'A member can freeze a forest the diet mapped. The map is not a committee.');
  add(OP, C, MER, 'Schools are member schools. The diet offers no career.');
  add(OP, C, CHA, 'A confederal face without a member party behind it is applause.');
  add(OP, C, PRAE, 'Cars belong to member interiors. The diet sleeps where it is allowed.');
  add(OP, C, ISO, 'Members already treat each other as abroad. True foreign is quieter still.');
  add(OP, I, POP, 'The core crowd is the people. Outer lands get the hymn without the vote, which they did not have anyway.');
  add(OP, I, MIL, 'Party-army at home; governors in uniform in the marches. Same school, colder climate.');
  add(OP, I, PAT, 'Core dossiers include clinics. Subject dossiers include grain and a curfew.');
  add(OP, I, TRAD, 'Founding houses of the core staff the civilizing mission. Outer notables are pupils.');
  add(OP, I, THEO, 'Doctrine is exported as civilization. Outer rites are errors.');
  add(OP, I, TECH, 'Core tables plan other people’s rivers.');
  add(OP, I, REV, 'The seizure liberated the core. The marches were next on the list.');
  add(OP, I, CORP, 'Party holdings extract from clients. Solidarity is a metropolitan word.');
  add(OP, I, BUR, 'Civic files at home; pass laws abroad.');
  add(OP, I, ECO, 'Core parks; provincial pits. The plan has a center.');
  add(OP, I, MER, 'Cadre exams for the core. Translators for the rest.');
  add(OP, I, CHA, 'The banner name is printed on offices that never sat the congress.');
  add(OP, I, PRAE, 'Interior at home; occupation at the edge.');
  add(OP, I, ISO, 'Skip'); // straggler imperial isolationist
  add(OP, Y, POP, 'Ordinary states bus for the party. The special region’s league already won and does not need the bus.');
  add(OP, Y, MIL, 'Union commissars, except the region that kept its own organization. A memo there is a foreign act.');
  add(OP, Y, PAT, 'Dossiers skip, or only exist in, the footnote.');
  add(OP, Y, TRAD, 'The exception is a founding house that never merged.');
  add(OP, Y, THEO, 'A heresy with a side letter. The center has not digested it.');
  add(OP, Y, TECH, 'The five-year table has a blank province on purpose.');
  add(OP, Y, REV, 'Emergency in the ordinary map. The footnote files it under not-our-seizure.');
  add(OP, Y, CORP, 'The island of privilege is a party holding that answers to a different committee.');
  add(OP, Y, BUR, 'Ordinary circulars and exemption circulars. Both say party.');
  add(OP, Y, ECO, 'The footnote can freeze a forest the plan already counted.');
  add(OP, Y, MER, 'Party school, except the exception’s cadre is named.');
  add(OP, Y, CHA, 'The banner stops at a league that never hung it.');
  add(OP, Y, PRAE, 'Union cars knock. The footnote’s cars open, or do not.');
  add(OP, Y, ISO, 'The party-state stays closed — except the footnote’s cousins, already in the letter.');

  // Junta
  const J = 'Military Junta';
  add(J, F, POP, 'Regional commands bus their own crowds. The council of chiefs calls it the people in several dialects.');
  add(J, F, PAT, 'Garrisons run clinics by depot. Federal welfare is logistics with extra letterhead.');
  add(J, F, TRAD, 'Officer families hold union chairs and state commands. Coups change the table, not the blood.');
  add(J, F, THEO, 'Chaplains sit with chiefs at both layers. A godless decree dies in the nearer mess.');
  add(J, F, TECH, 'Staff problems in two headquarters. Civilian life is a logistics annex twice.');
  add(J, F, REV, 'Emergency communiqués from GHQ and from the region. Neither sunsets.');
  add(J, F, CORP, 'Procurement at both layers. A combine that feeds a regional command does not need the capital.');
  add(J, F, BUR, 'Martial law as two filing systems. Permits depend on which depot you are nearer.');
  add(J, F, ECO, 'Ranges and fuel beat parks in both layers. A green minister lasts until the nearer exercise.');
  add(J, F, MER, 'Staff college, then a regional command that may still prefer a cousin. The exercise sorts them.');
  add(J, F, CHA, 'A strongman in the capital. Regional chiefs keep powder. When the face goes, the map is already a junta of juntas.');
  add(J, F, PRAE, 'Capital regiment and regional household troops. Nights are decided by who holds the nearer inner barracks.');
  add(J, F, ISO, 'Foreign wars kill juntas. This council stays home; border commands call that victory and keep the roadblocks.');
  add(J, F, LIB, 'Thin talk, checkpoints in every state. Freedom is the curfew you already knew.');
  add(J, F, PART, 'Town councils discuss garbage. Ranked files are not on the state agenda either.');
  add(J, C, POP, 'Each army buses its own. The liaison of chiefs cannot even agree on a parade.');
  add(J, C, PAT, 'Each depot feeds its patch. Confederal grain is a rumor.');
  add(J, C, TRAD, 'Each officer caste is a member. The diet is a mess-night.');
  add(J, C, THEO, 'Chaplains stay with their army. A confederal blessing is a toast.');
  add(J, C, TECH, 'Staffs do not share tables. Gauges match when someone captured a warehouse.');
  add(J, C, REV, 'Some armies are still seizing. The diet’s emergency is optional.');
  add(J, C, CORP, 'Procurement is member business. The diet does not get a cut unless it has a port.');
  add(J, C, BUR, 'Movement orders are local. Confederal stamps are souvenirs.');
  add(J, C, ECO, 'A member command can keep a river the diet mapped as fuel.');
  add(J, C, MER, 'Staff colleges are member colleges. The diet has no exam.');
  add(J, C, CHA, 'A confederal strongman without a depot is a speech.');
  add(J, C, PRAE, 'Guards belong to member chiefs. The diet ends when they are called home.');
  add(J, C, ISO, 'Members already treat each other as the foreigner. True abroad is quieter.');
  add(J, I, POP, 'Core parades. Subject towns get the occupation hymn.');
  add(J, I, PAT, 'Depots feed the core. Marches get what logistics can spare.');
  add(J, I, TRAD, 'The officer caste of the core staffs the empire. Outer notables are locally recruited ranks.');
  add(J, I, THEO, 'Chaplains bless the mission. Outer altars are security.');
  add(J, I, TECH, 'GHQ plans other people’s roads.');
  add(J, I, REV, 'The coup liberated the core. The marches were the next objective.');
  add(J, I, CORP, 'Procurement extracts from clients. The combines of the core invoice the map.');
  add(J, I, BUR, 'Martial circulars at home; occupation circulars abroad.');
  add(J, I, ECO, 'Core ranges; provincial pits.');
  add(J, I, MER, 'Staff college for the core. Translators for the rest.');
  add(J, I, CHA, 'The strongman’s face is printed on provincial commands that did not sit at the table.');
  add(J, I, PRAE, 'Capital regiment and occupation corps. Different jobs, same loyalty test.');
  add(J, I, ISO, 'Skip');
  add(J, Y, POP, 'Ordinary commands bus crowds. The leftover command does not need to.');
  add(J, Y, PAT, 'Depots skip the footnote, or only exist there.');
  add(J, Y, TRAD, 'The exception is an officer house that never merged.');
  add(J, Y, THEO, 'A chaplaincy with a side letter.');
  add(J, Y, TECH, 'GHQ’s table has a blank command.');
  add(J, Y, REV, 'Emergency communiqués do not enter the leftover command unless invited.');
  add(J, Y, CORP, 'The island of privilege is a procurement reservation.');
  add(J, Y, BUR, 'Ordinary martial paper and exemption paper.');
  add(J, Y, ECO, 'The leftover command can keep a river GHQ counted as fuel.');
  add(J, Y, MER, 'Staff college, except the exception’s chairs are named.');
  add(J, Y, CHA, 'The strongman stops at a command that never hung the portrait.');
  add(J, Y, PRAE, 'Capital troops knock. The footnote’s household opens, or does not.');
  add(J, Y, ISO, 'The junta stays home — except the footnote’s already-foreign cousins.');

  loadRestStacks2();
}

function loadRestStacks2() {
  const add = (sub: string, terr: string, style: string, text: string) => {
    if (text === 'Skip') return;
    put(HUMAN, sub, terr, style, text);
  };
  const F = 'federal';
  const C = 'confederal';
  const Y = 'federacy / asymmetrical federation';
  const I = 'imperial / hegemonic';
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
  const LIB = 'Libertarian / Minimal-State';
  const PART = 'Participatory / Deliberative';
  const CS = 'Constitutional / Limited';

  // Plutocracy, Aristocracy, Theocratic Council, Gerontocracy, Syndicate, Mafiocracy — stacked
  const packs: Array<[string, string, Record<string, string>]> = [
    ['Plutocracy', F, {
      [POP]: 'State fortunes bus their own crowds. The union cartel calls it one people when the invoice is due.',
      [MIL]: 'Security firms are licensed per state. A union army is just the biggest contract.',
      [PAT]: 'Company towns at both layers. Kindness is branded twice.',
      [TRAD]: 'Old money holds union boards and state boards. New money buys the cheaper layer first.',
      [THEO]: 'Endowments own pulpits locally; the union pulpit is the biggest donor’s.',
      [TECH]: 'Models at both layers. If the union spreadsheet closes a city, a state spreadsheet may keep it open for a quarter.',
      [REV]: 'New fortunes in the capital; old fortunes in the states, or the reverse. The crash is federal in name only.',
      [CORP]: 'Ministries are desks at two headquarters. The flag is letterhead in two fonts.',
      [BUR]: 'You can buy the union law and still wait on a state stamp.',
      [ECO]: 'Carbon and water are assets in both markets. The poor live downstream of two trades.',
      [MER]: 'Hired talent runs union files and state files. Heirs collect both dividends.',
      [CHA]: 'A fortune’s face in the capital. State machines are quieter and often richer.',
      [PRAE]: 'Private crews at both layers. A night in the capital does not open a state vault.',
      [ISO]: 'The cartel would rather not go to war. Border fortunes may already be married out.',
      [LIB]: 'Thin public state, thick private government, twice. Exit is a contract in two jurisdictions.',
    }],
    ['Aristocracy', F, {
      [POP]: 'Lords feed “their” counties and send cousins to the union diet. Two paternalisms, one blood.',
      [MIL]: 'Retainers locally; a union levy of the same houses. Commands follow pedigree at both layers.',
      [PAT]: 'Crested hospitals in the states; a grander one in the capital. Eviction uses the same ink.',
      [TRAD]: 'Precedence in two chambers. The season is federal; the county still dines first.',
      [THEO]: 'Altars local, marriages union. A house that loses either loses the county.',
      [TECH]: 'Stewards run estates; union savants run the diet. Foolish lords lose to cousins who can count, twice.',
      [REV]: 'New titles in the capital; old ones in the provinces, still armed.',
      [CORP]: 'Entailed shares at both layers. The coat of arms is a trademark with counties.',
      [BUR]: 'Enrollment in the county and the chancery. Lesser houses are kept lesser twice.',
      [ECO]: 'Game law locally; union forests as royal leftovers. A mill fights two courts of peers.',
      [CHA]: 'A magnetic house in the capital. Counties keep their own names.',
      [PRAE]: 'Household troops around the capital and around each great house. Nights are local.',
      [ISO]: 'Foreign marriages used to be the game. Border houses may still play; the diet pretends not to.',
    }],
  ];

  for (const [sub, terr, map] of packs) {
    for (const [st, text] of Object.entries(map)) add(sub, terr, st, text);
  }

  // Remaining oligarchy/autocracy stacks — compact unique lines
  const more: [string, string, string, string][] = [
    ['Aristocracy', C, POP, 'Each sovereign house feeds its own. A confederal tribune is a guest at someone else’s table.'],
    ['Aristocracy', C, MIL, 'Retainers stay home. The diet cannot levy.'],
    ['Aristocracy', C, TRAD, 'This is the thing: a league of blood. Minutes are courtesy.'],
    ['Aristocracy', C, ISO, 'Each house already treats the next as abroad.'],
    ['Aristocracy', C, CHA, 'A diet face without retainers is a toast.'],
    ['Aristocracy', I, POP, 'Core houses tour as protectors. Outer peoples learn the crest as a tax.'],
    ['Aristocracy', I, MIL, 'Core retainers occupy. Outer levies are clients.'],
    ['Aristocracy', I, TRAD, 'High houses of the core; outer notables as estates.'],
    ['Aristocracy', I, PAT, 'Paternal duty at home; extraction abroad, still called duty.'],
    ['Aristocracy', Y, TRAD, 'Ordinary peerage, plus a march with thicker high justice.'],
    ['Aristocracy', Y, CHA, 'The magnetic house stops at a leftover crown.'],
    ['Theocratic Council', F, POP, 'Revivals are local; the union synod pretends they were always doctrine.'],
    ['Theocratic Council', F, MIL, 'Templars at both layers. A scholarly majority does not survive two campaign seasons.'],
    ['Theocratic Council', F, PAT, 'Alms queues in diocese and union. Unbelief is a benefits decision twice.'],
    ['Theocratic Council', F, TRAD, 'Canon local and federal. The oldest commentary still wins.'],
    ['Theocratic Council', F, BUR, 'Dispensations in two chanceries. Grace is rationed twice.'],
    ['Theocratic Council', F, CHA, 'A prophet in the union college. Regional synods keep their own saints.'],
    ['Theocratic Council', F, PRAE, 'Inquisition cars exist federally and in the diocese. A state card is not a blessing.'],
    ['Theocratic Council', C, TRAD, 'Autocephalous. The diet cannot name a heresy that sticks.'],
    ['Theocratic Council', C, POP, 'Each church buses its own revival. Confederal piety is a hymnbook nobody shares.'],
    ['Theocratic Council', I, POP, 'Core revivals; outer conversions. The hymn is exported.'],
    ['Theocratic Council', I, MIL, 'Templars at home; missions with soldiers in the marches.'],
    ['Theocratic Council', I, THEO, 'Skip'],
    ['Theocratic Council', Y, TRAD, 'Ordinary college, plus a stricter rite fenced by treaty.'],
    ['Gerontocracy', F, POP, 'Elders in the union and the states speak as grandparents of two maps.'],
    ['Gerontocracy', F, PAT, 'Care for the aged is the first duty in both budgets, which is convenient.'],
    ['Gerontocracy', F, TRAD, 'Precedent stacked. Delay is national and local policy.'],
    ['Gerontocracy', F, MER, 'A young passer runs a state bureau. They will not take the union dais, or the state one.'],
    ['Gerontocracy', F, CHA, 'One ancient name in the capital. State elders keep sitting when it dies.'],
    ['Gerontocracy', C, TRAD, 'Sovereign councils of elders. Nothing urgent is confederal.'],
    ['Gerontocracy', I, PAT, 'The core’s old are cared for. Outer young are children in the law.'],
    ['Gerontocracy', Y, MER, 'Exams in the ordinary map. The footnote’s chairs are aged and named.'],
    ['Syndicate / Labor Oligarchy', F, POP, 'Mass meetings bounce secretaries locally and instruct the union slate the same week.'],
    ['Syndicate / Labor Oligarchy', F, MIL, 'Militias are locals; the union federation wants one dock guard. Strikes become federal.'],
    ['Syndicate / Labor Oligarchy', F, PAT, 'Union clinic and state clinic, same card. Lose it, lose both doctors.'],
    ['Syndicate / Labor Oligarchy', F, CORP, 'The federation incorporated at both layers. Locals are subsidiaries twice.'],
    ['Syndicate / Labor Oligarchy', F, CHA, 'One organizer in the capital. Trades in the states remember they hated each other.'],
    ['Syndicate / Labor Oligarchy', C, POP, 'Each territory’s hall is sovereign. Confederal talk is a sympathy strike that may not happen.'],
    ['Syndicate / Labor Oligarchy', I, PAT, 'Core cards include clinics. Outer shops are not in the hall.'],
    ['Syndicate / Labor Oligarchy', Y, CORP, 'One region’s closed shop is a subsidiary the others cannot vote open.'],
    ['Mafiocracy / Criminal Oligarchy', F, POP, 'Families hold states; the commission sits in the capital. Folk heroes are local; tribute is federal.'],
    ['Mafiocracy / Criminal Oligarchy', F, PAT, 'Funeral money locally; a bigger envelope to the commission. Kindness is a map of crews.'],
    ['Mafiocracy / Criminal Oligarchy', F, TRAD, 'Blood locally; godparentage upward. A talented outsider stays hired help in both.'],
    ['Mafiocracy / Criminal Oligarchy', F, CHA, 'A don in the capital. State families keep shooting when that name is buried.'],
    ['Mafiocracy / Criminal Oligarchy', F, PRAE, 'Inner crews in the capital and in each territory. Nights are local.'],
    ['Mafiocracy / Criminal Oligarchy', F, LIB, 'No public taxes, they say, in either layer. You still pay two crews.'],
    ['Mafiocracy / Criminal Oligarchy', F, PART, 'Sit-downs locally; the commission already picked the federal outcome.'],
    ['Mafiocracy / Criminal Oligarchy', C, TRAD, 'Sovereign crews. The diet is a truce.'],
    ['Mafiocracy / Criminal Oligarchy', I, POP, 'Core streets love a don. Subject towns meet extortion with better stationery.'],
    ['Mafiocracy / Criminal Oligarchy', Y, TRAD, 'Ordinary tribute, plus a rival family fenced by a hole in the flag.'],

    // Autocracy stacks
    ['Dictatorship', F, POP, 'Governors bus crowds for the palace. Federalism is two rallies, one name.'],
    ['Dictatorship', F, PAT, 'Rations from the palace and the governor, same portrait.'],
    ['Dictatorship', F, BUR, 'Fear filed federally and locally. Two internal passports.'],
    ['Dictatorship', F, CHA, 'The office is a person. Governors are friends. When friendship ends, the state ends.'],
    ['Dictatorship', F, PRAE, 'Palace guard and governors’ crews. Nights are decided in two buildings.'],
    ['Dictatorship', F, CS, 'A charter hangs in both ministries. Both have suspended it since the seizure.'],
    ['Dictatorship', I, POP, 'Core crowds; subject silence. The name is taught before the code.'],
    ['Dictatorship', I, PAT, 'Clinics for the core; grain and curfew for the marches.'],
    ['Dictatorship', I, CHA, 'Satraps are companions. Outer lands are gifts, revoked the same way.'],
    ['Dictatorship', I, PRAE, 'Palace nights and occupation nights. Same loyalty test, colder.'],
    ['Dictatorship', Y, CHA, 'Most of the map is a will. The footnote still has a machine the palace has not staffed with cousins.'],
    ['Dictatorship', Y, CS, 'The charter’s hole is a province. Exception as well as suspension.'],

    ['Absolute Monarchy', F, PAT, 'Household kindness in the capital; viceroys copy it. Two parents, one blood.'],
    ['Absolute Monarchy', F, TRAD, 'Oaths to one person, courts in each realm. Federal in map, personal in kneeling.'],
    ['Absolute Monarchy', F, THEO, 'Altars in the realms; one anointing. A viceroy who loses the pulpit loses the levy.'],
    ['Absolute Monarchy', F, BUR, 'Chancery and provincial chanceries. Edicts travel as paper until a viceroy sits on them.'],
    ['Absolute Monarchy', F, CHA, 'This monarch is the regime. Viceroys are furniture until the funeral.'],
    ['Absolute Monarchy', F, PRAE, 'Household guard in the capital; viceroys’ troops at home. Dawn can change a realm without changing the crown.'],
    ['Absolute Monarchy', F, CS, 'Charters in the realms, signed by a crown that then edicts. Courts explain the exception twice.'],
    ['Absolute Monarchy', I, TRAD, 'The court is the core. The rest is possession. No shared blood, no shared vote.'],
    ['Absolute Monarchy', I, PAT, 'Grain at home; tribute abroad, still called paternal.'],
    ['Absolute Monarchy', I, THEO, 'Divine right exported as mission.'],
    ['Absolute Monarchy', I, CORP, 'Royal companies collect the marches. The crown hangs boards that look like cabinets.'],
    ['Absolute Monarchy', I, CHA, 'One person is the empire. Satraps are names on a whim.'],
    ['Absolute Monarchy', Y, TRAD, 'The realm is the monarch’s, except a march with old high justice.'],
    ['Absolute Monarchy', Y, CS, 'A charter the crown signs, plus a footnote the crown has not torn. Two kinds of exception.'],

    ['Tyranny / Personalist Rule', F, POP, 'Friends as governors, crowds as proof. First names on two maps.'],
    ['Tyranny / Personalist Rule', F, CHA, 'The country is a relationship at both layers. No relationship, no province.'],
    ['Tyranny / Personalist Rule', F, PRAE, 'Bodyguards in the capital and in each friend’s house. Ministers learn the news twice.'],
    ['Tyranny / Personalist Rule', I, CHA, 'Companions as satraps. Outer lands are gifts.'],
    ['Tyranny / Personalist Rule', I, PAT, 'Clinics where the motorcade will see; nothing where it will not, including abroad.'],
    ['Tyranny / Personalist Rule', Y, CHA, 'Most regions are property. One corner still has a machine.'],
    ['Tyranny / Personalist Rule', F, CS, 'Paper limits for offices. This is first names. The charter is quoted in both capitals when it flatters.'],

    ['Absolute Theocracy', F, POP, 'Revivals in the dioceses; the supreme office pretends they were always the creed.'],
    ['Absolute Theocracy', F, PAT, 'Alms in two queues. Hunger is a sermon federally and locally.'],
    ['Absolute Theocracy', F, BUR, 'Canon in two chanceries. Dispensations twice.'],
    ['Absolute Theocracy', F, CHA, 'This voice is the faith. Regional shepherds are listeners. When it stops, they are men in hats in two buildings.'],
    ['Absolute Theocracy', F, PRAE, 'Temple guards federally and in the diocese. A night in either crypt can change the creed.'],
    ['Absolute Theocracy', F, CS, 'Earthly limits on the wall in both palaces. Both interpret them as already fulfilled.'],
    ['Absolute Theocracy', I, POP, 'Core ecstasy; outer conversion. The hymn is exported.'],
    ['Absolute Theocracy', I, MIL, 'Sacred war office at home; assessment after the hymn abroad.'],
    ['Absolute Theocracy', I, PAT, 'Alms for the flock; tithes from the converted.'],
    ['Absolute Theocracy', Y, TRAD, 'The prophet-office, plus a tolerated rite too expensive to crush.'],
    ['Absolute Theocracy', Y, CS, 'Limits on the wall, plus a footnote rite the wall does not mention.'],

    ['Electoral Autocracy', F, POP, 'Union rallies and state rallies, one count. Opposition may take a province the palace does not need.'],
    ['Electoral Autocracy', F, PAT, 'Clinics follow loyalty at both layers. Un-flipping a district is a governor’s art.'],
    ['Electoral Autocracy', F, BUR, 'Registration is the campaign federally and locally.'],
    ['Electoral Autocracy', F, CHA, 'The incumbent exists as a person. State labels rotate around that person.'],
    ['Electoral Autocracy', F, PRAE, 'Interior troops restage union nights and state nights.'],
    ['Electoral Autocracy', F, CS, 'Charters used for cases that do not matter, in two courts.'],
    ['Electoral Autocracy', F, PART, 'Local councils soak energy in the states. Union files stay closed.'],
    ['Electoral Autocracy', I, POP, 'Core theatre; no ballots in the marches. The show is for voters, not subjects.'],
    ['Electoral Autocracy', I, PAT, 'Stipends for the counted. Rations for the rest.'],
    ['Electoral Autocracy', Y, POP, 'Ordinary regions play the game. The footnote is too restive, or too loyal, to bother.'],

    ['Diarchy / Dual Rule', F, POP, 'Each ruler owns a layer’s crowd. Deadlock is two streets.'],
    ['Diarchy / Dual Rule', F, MIL, 'One owns the union army, one the state militias — or they pretend to. Deadlock is armed.'],
    ['Diarchy / Dual Rule', F, BUR, 'Every paper needs two stamps at two layers. Nothing happens except veto.'],
    ['Diarchy / Dual Rule', F, PRAE, 'Each ruler’s guard in the capital and a proxy in the states. The map is four households.'],
    ['Diarchy / Dual Rule', F, CHA, 'The constitution names two, the banners name one. Statehouses learn which name actually calls.'],
    ['Diarchy / Dual Rule', I, CHA, 'Two names on the imperial seal; the marches petition whichever is not currently angry, then learn which one can actually answer.'],
    ['Diarchy / Dual Rule', Y, CHA, 'The pair rules the ordinary map. The footnote answers only one of them — a built-in betrayal, and the banners already picked which.'],
    ['Diarchy / Dual Rule', I, PAT, 'Each ruler’s clientele, plus subject towns that pick a patron the way they pick weather.'],
    ['Diarchy / Dual Rule', C, BUR, 'Two stamps, and the members may not honor either. Confederal diarchy is a pause.'],

    ['Competitive Authoritarian', F, POP, 'Opposition may take a state. Union refs, cash, and guns stay. Two crowds, one ceiling.'],
    ['Competitive Authoritarian', F, PAT, 'Benefits leak enough to keep hope in the states. Union clinics un-flip what governors flip.'],
    ['Competitive Authoritarian', F, CS, 'Lawyers win state cases that do not matter. Union cases that would, they lose.'],
    ['Competitive Authoritarian', F, PRAE, 'Interior at the center; state police for show. Buildings you do not picket exist in both capitals.'],
    ['Competitive Authoritarian', I, POP, 'Rough democracy in the core; none in the marches. The interior stays competitive enough to look real.'],
    ['Competitive Authoritarian', Y, CS, 'A showpiece of fairness, or a cage. The footnote proves the rest is theatre.'],

    ['Illiberal Democracy', F, POP, 'A national majority hunts unfriendly states. Federalism becomes a feud; secession talk is treason.'],
    ['Illiberal Democracy', F, PAT, 'Benefits for real citizens of the winning states. Losing states wait outside the union clinic.'],
    ['Illiberal Democracy', F, CS, 'The charter is interpreted until the states agree with the winner. Entrenchment delays; it does not stop.'],
    ['Illiberal Democracy', F, PRAE, 'Security services are a national constituency. State police learn the new majority overnight.'],
    ['Illiberal Democracy', I, POP, 'The demos at the core votes to hold others down. Empire with a mandate, and a majority.'],
    ['Illiberal Democracy', Y, TRAD, 'The majority’s republic plus a minority region under special law that never expires.'],

    ['Military-Managed Democracy', F, POP, 'The army gave the people the vote, in every state. Ungrateful governors meet guidance.'],
    ['Military-Managed Democracy', F, PAT, 'Garrisons run disaster in the states. Civilian ministries do festivals federally.'],
    ['Military-Managed Democracy', F, CS, 'The charter names the army as guarantor of the union and the states. Courts scold civilians in both.'],
    ['Military-Managed Democracy', F, PRAE, 'The capital unit guards the experiment; state garrisons guard the rest. If either changes its mind, that layer’s experiment ends.'],
    ['Military-Managed Democracy', I, POP, 'Democracy is a metropolitan hobby. The army that guards the core occupies the marches.'],
    ['Military-Managed Democracy', Y, CS, 'Most provinces have a civilian face. One is a military district, which the charter calls special.'],
  ];

  for (const [sub, terr, st, text] of more) add(sub, terr, st, text);

  // Anarchy stacks: federal/confederal × allowed styles (unique, not stitch)
  const an: [string, string, string, string][] = [
    ['Anarcho-Communist Commune', F, POP, 'Halls federate, crowds stay local. A federal clerk who looks like a tribune gets recalled by the sending floor.'],
    ['Anarcho-Communist Commune', F, REV, 'Expropriation minutes are open in the communes and in the federation. “Just this once” now has two addresses.'],
    ['Anarcho-Communist Commune', F, ECO, 'Local commons and a federal river. A mill the hall wants still loses if it poisons water more than one commune drinks.'],
    ['Anarcho-Communist Commune', F, PART, 'Attendance at home and in the federation. People who hate meetings leave both, which is a quiet exile with extra walking.'],
    ['Anarcho-Communist Commune', F, LIB, 'Binding mandates are suspect locally and more suspect federally. Exit is legal in two directions.'],
    ['Anarcho-Communist Commune', F, ISO, 'The world is states. Sister communes are barely tolerated; true abroad is a bad road on purpose.'],
    ['Anarcho-Communist Commune', C, POP, 'Each hall is a crowd. Confederal talk is a guest who cannot bind.'],
    ['Anarcho-Communist Commune', C, REV, 'Some halls are still seizing. The congress’s victory is not theirs.'],
    ['Anarcho-Communist Commune', C, ECO, 'A commune can save a well the congress named. Names are not commons.'],
    ['Anarcho-Communist Commune', C, LIB, 'Nobody can bind a hall. The congress is a swap meet of refusals.'],
    ['Warlord / Failed State', F, POP, 'Bosses who feed a district are heroes of a league that is a ceasefire with letterhead.'],
    ['Warlord / Failed State', F, CHA, 'A name still on the radio. When it dies, federalism is the next roadblock.'],
    ['Warlord / Failed State', F, MIL, 'Every ministry is a brigade. Federalism is whose depot is full.'],
    ['Warlord / Failed State', F, TRAD, 'Clans re-armed in every patch. The league is a feud with stationery.'],
    ['Warlord / Failed State', C, CHA, 'Each patch is a name. Confederal talk is how they divide ammo.'],
    ['Warlord / Failed State', C, MIL, 'Sovereign brigades. The diet is a sit-down.'],
    ['Anarcho-Capitalist / Private-Law', F, LIB, 'Charter zones federate by contract. Secession is a clause in two jurisdictions; under-insured clauses still become wars.'],
    ['Anarcho-Capitalist / Private-Law', F, CORP, 'The largest insurers are the union. Smaller zones live under two terms of service.'],
    ['Anarcho-Capitalist / Private-Law', F, ISO, 'Foreign states are liability. Zones want trade, not flags, and shoot customs as trespass in both layers.'],
    ['Anarcho-Capitalist / Private-Law', C, LIB, 'Each zone’s law is a product. Confederal government is a standards body nobody has to buy.'],
    ['Mutual-Aid Network', F, PART, 'Local webs and a disaster switchboard. Federal officers cannot levy; they can only call.'],
    ['Mutual-Aid Network', F, ECO, 'Care includes land more than one web eats from. A poisoned well drops you from both.'],
    ['Mutual-Aid Network', C, POP, 'The popular person brings soup at home. Confederal fame is a rumor mill.'],
    ['Tribal / Clan Anarchy', F, TRAD, 'Clans federate for war and grazing. A federal speaker is a host; guest-right is the term limit.'],
    ['Tribal / Clan Anarchy', F, THEO, 'Ancestors sit in local gatherings and in the rare federal one. A deal the dead would hate does not hold on either ground.'],
    ['Tribal / Clan Anarchy', C, TRAD, 'Already a confederacy of blood. A diet just calendars the feuds.'],
    ['Tribal / Clan Anarchy', C, ISO, 'The next valley is abroad. A diet does not make it less so.'],
    ['Worker-Syndicate Free Territory', F, POP, 'Meetings bounce local secretaries and instruct the territorial slate. A clerk without a trade is a suspect in both halls.'],
    ['Worker-Syndicate Free Territory', F, REV, 'Expropriation minutes open locally and federally. Bosses who grew inside the federation are on both agendas.'],
    ['Worker-Syndicate Free Territory', F, LIB, 'Shops may secede from the local and from the territorial. A center that looks like a ministry gets two exits.'],
    ['Worker-Syndicate Free Territory', C, POP, 'Each territory’s syndicates are sovereign. A sympathy strike is a maybe.'],
    ['Worker-Syndicate Free Territory', C, ECO, 'Green shops can close a pit across a border that is also a picket. Maybe.'],
  ];
  for (const row of an) add(...row);
}

loadRestStacks();
