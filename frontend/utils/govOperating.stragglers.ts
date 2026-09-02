import { HUMAN, put } from './govOperating.store';

const F = 'federal';
const C = 'confederal';
const Y = 'federacy / asymmetrical federation';
const I = 'imperial / hegemonic';
const ISO = 'Isolationist';
const MIL = 'Military-Influenced';
const THEO = 'Theocratic Influence';
const CORP = 'Corporate / Business Elite';
const CS = 'Constitutional / Limited';
const POP = 'Populist';
const PAT = 'Paternalist / Welfare-First';
const TRAD = 'Traditional / Hereditary';
const TECH = 'Technocratic';
const REV = 'Revolutionary / Provisional';
const BUR = 'Bureaucratic';
const ECO = 'Ecological / Green-Influenced';
const MER = 'Meritocratic';
const CHA = 'Charismatic Leader Focus';
const PRAE = 'Praetorian / Security-State';
const LIB = 'Libertarian / Minimal-State';
const PART = 'Participatory / Deliberative';

function s(sub: string, terr: string, style: string, text: string) {
  put(HUMAN, sub, terr, style, text);
}

export function loadStragglerOperating() {
  // 1A — Imperial + Isolationist: core closed; marches already count as abroad
  s('Representative Democracy', I, ISO,
    'The house will not send ships past the last march. Those marches *are* foreign policy: closed to the world, open only as possessions the core pretends are a domestic interior.');
  s('Parliamentary Democracy', I, ISO,
    'Supply dies for any war that is not already occupation. The cabinet’s isolation is real; the empire is the border they refuse to notice.');
  s('Presidential Democracy', I, ISO,
    'The palace campaigns on staying home. Home includes the marches, which do not vote and do not receive visitors. Treaties stop at the metropolitan quay.');
  s('Democratic Republic', I, ISO,
    'No foreign alliances, no incoming flags. The republic’s “abroad” is a set of provinces it will not discuss as foreign and will not let anyone else discuss at all.');
  s('Direct Democracy', I, ISO,
    'The square votes no to the world every season. Subject towns are not the world; they are already inside the no.');
  s('Consociational Democracy', I, ISO,
    'Core blocs veto entanglement unless every community signs, which means nothing signs. The marches live under that closed door without a seat at it.');
  s('Deliberative Democracy', I, ISO,
    'A treaty hearing can last a year and still refuse the sea. The marches wait under last year’s closed conclusion; they were never invited to open it.');
  s('One-Party Elite Rule', I, ISO,
    'The world is contamination. Outer lands are already in the file as interior dirt. No embassy, only governors, and the border beyond them is a hygiene rule.');
  s('Military Junta', I, ISO,
    'The council will not fight a war that is not a garrison they already hold. Isolation is a supply decision; the marches are depots, not diplomacy.');
  s('Plutocracy', I, ISO,
    'The cartel will not fund a flag war. It will fund a closed shop of client provinces. Foreign capital is a rival; provincial capital is inventory.');
  s('Aristocracy', I, ISO,
    'The high houses married the map already. New foreign matches are vulgar. Outer notables are in-laws of a kind that does not get a season in the capital.');
  s('Theocratic Council', I, ISO,
    'True faith is a geography. Missions stop at the last converted nest; beyond that is pollution, and the marches exist to be the last fence.');
  s('Gerontocracy', I, ISO,
    'The elders remember one disastrous embassy and closed the ports. Client provinces are children, not foreigners, and children do not receive guests.');
  s('Syndicate / Labor Oligarchy', I, ISO,
    'The hall will not compete with cheap flags. Outer shops are not in the card system; they are a tariff with people in it. No ships except to collect.');
  s('Mafiocracy / Criminal Oligarchy', I, ISO,
    'The commission does not share streets with foreign crews. Client towns pay inward. Isolation is a monopoly on who is allowed to rob you.');
  s('Dictatorship', I, ISO,
    'The name is taught to the marches and to nobody else. Embassies are a leak. Outer lands are a locked room the dictator calls home.');
  s('Absolute Monarchy', I, ISO,
    'The court does not receive foreign kings. Possessions are household rooms. Isolation is etiquette: the world waits outside a door that is already an empire.');
  s('Tyranny / Personalist Rule', I, ISO,
    'Friends may visit; states may not. Satrapies are gifts, not countries. The closed border is personal, and the marches live inside that friendship.');
  s('Absolute Theocracy', I, ISO,
    'Unbelieving flags are a plague. Converted marches are the flock’s outer pasture. Nothing else comes in, and the pasture does not go out.');
  s('Electoral Autocracy', I, ISO,
    'The show of choice is for the core. No foreign observers, no foreign pacts. The marches do not vote and do not meet anyone who does.');
  s('Diarchy / Dual Rule', I, ISO,
    'Both chairs agree on one file: no foreigners. They disagree on the marches, which is how isolation becomes two occupations that will not admit they are foreign policy.');
  s('Competitive Authoritarian', I, ISO,
    'Opposition may rent a hall in the core. Foreign parties may not. The marches are off the guest list and off the map the opposition is allowed to name.');
  s('Illiberal Democracy', I, ISO,
    'The majority votes to hold the door shut. Subject peoples are not visitors; they are the furniture the door was shut to protect.');
  s('Military-Managed Democracy', I, ISO,
    'The army that guards the experiment also guards the quay. Democracy is a metropolitan hobby with no guests. The marches are a military district that counts as staying home.');

  // 2A — redundant stacks: the thing, louder, twice
  s('Military Junta', F, MIL,
    'Officers run the union and the states, then also sit as “military influence” on the civilian desks they invented. There is no civilian file. There is a second letterhead for the same mess.');
  s('Military Junta', C, MIL,
    'Each member army already rules. “Military-influenced” is how they describe the liaison that cannot even pick a parade without another colonel.');
  s('Military Junta', I, MIL,
    'Occupation is the government. Calling the staff “influential” is manners. The core mess and the provincial mess are the same rank structure with worse weather.');
  s('Military Junta', Y, MIL,
    'Ordinary commands are the state. The leftover command is also the state, and both insist civilians are a costume. Asymmetry is which depot is louder.');
  s('Theocratic Council', F, THEO,
    'The college is the law in the union and the diocese, then keeps a “faith influence” office for people who still think there is a secular file. There is not. Pulpit twice.');
  s('Theocratic Council', C, THEO,
    'Each autocephalous synod is already a church-state. The diet’s theocratic flavor is a hymn they will not share. Doctrine, louder, in several buildings that do not listen to each other.');
  s('Theocratic Council', I, THEO,
    'Canon at home, missions abroad, and a third office called influence so nobody has to say occupation. Outer altars are errors. Inner altars are ministries.');
  s('Theocratic Council', Y, THEO,
    'Ordinary dioceses live under the college. The footnote rite is holier still, by treaty. Sacred law stacked on sacred exception.');
  s('Plutocracy', F, CORP,
    'Money is the franchise at both layers, and the combines also sit where a ministry would be. Two headquarters, two letterheads, one invoice. The flag is a trademark with counties.');
  s('Plutocracy', C, CORP,
    'Each member is a company town that calls itself a polity. Confederal “business elite” is the same boards sending junior lobbyists to a diet that cannot bind them.');
  s('Plutocracy', I, CORP,
    'Core fortunes own the house. Client provinces are concessions. Corporate flavor is not a modifier; it is how the empire invoices.');
  s('Plutocracy', Y, CORP,
    'Ordinary states are for sale. The exception is already sold, cheaper, with a side letter. Business twice: market and reservation.');
  s('Absolute Theocracy', F, THEO,
    'The sacred office is the state in both palaces, then keeps an influence chapel for the fiction of a civil code. Dissent is heresy federally and locally. Louder is the only change.');
  s('Absolute Theocracy', C, THEO,
    'Local prophet-offices already speak for God. Confederal theocracy is a courtesy title on a cleric they ignore between festivals. Faith, twice, with no tax.');
  s('Absolute Theocracy', I, THEO,
    'The flock at home, the converted abroad, and a mission office so occupation can be preached. Influence is the hymn that travels with the levy.');
  s('Absolute Theocracy', Y, THEO,
    'The prophet-office runs the ordinary map. A tolerated rite in the footnote is still holy law, just a different verse. Two pulpits, one gun.');
  s('Aristocracy', F, TRAD,
    'Blood is the constitution in the union diet and the county, then “tradition” is listed as a style so newcomers think there is another path. There is not. Precedence twice.');
  s('Aristocracy', I, TRAD,
    'High houses of the core, outer notables as estates, and hereditary custom as the only law that moves. The empire is a family tree with worse cousins.');
  s('Gerontocracy', F, TRAD,
    'Age is the qualification in both chambers, and custom is how they explain why the young still wait. Precedent stacked on seniority. Delay is the whole machine, twice.');
  s('One-Party Elite Rule', F, MIL,
    'The party is the army’s civilian hat in the union and the states. Military flavor is the same cadre in a different tunic. Two uniforms, one file.');

  loadConfederalAutocracyStyles();
}

function loadConfederalAutocracyStyles() {
  // 3A — style attaches to the local strongmen, not the figurehead
  const D = 'Dictatorship';
  const AM = 'Absolute Monarchy';
  const TY = 'Tyranny / Personalist Rule';
  const AT = 'Absolute Theocracy';
  const EA = 'Electoral Autocracy';
  const DI = 'Diarchy / Dual Rule';

  s(D, C, CS,
    'Each member strongman hangs a charter in his own capital. The confederal “dictator” signs a prettier one nobody enforces. Limits, if they exist, are local habits.');
  s(D, C, POP,
    'Crowds belong to the local boss. The figurehead tours as “the people”; the street already has a name and a depot.');
  s(D, C, MIL,
    'Armies stay with the members. Officers who matter sleep in provincial messes. The center’s staff is a toast.');
  s(D, C, PAT,
    'Grain and clinics are the local boss’s gifts. A confederal stipend is a rumor that dies at the first roadblock.');
  s(D, C, TRAD,
    'Each patch keeps its old titles. The figurehead wears a bigger one and still cannot sit their chairs.');
  s(D, C, THEO,
    'Local pulpits bless the nearer tyrant. The center’s rite is a festival they attend if the road is safe.');
  s(D, C, TECH,
    'Each strongman hires his own counters. Shared tables are optional; most are not opened.');
  s(D, C, REV,
    'Some members are still seizing. The figurehead’s Year One is a calendar they do not use.');
  s(D, C, CORP,
    'Combines incorporate under the local gun. The center does not get a board seat.');
  s(D, C, BUR,
    'Permits are the nearer stamp. Confederal circulars are souvenirs.');
  s(D, C, ECO,
    'A local boss can keep a river the diet mapped as fuel. The map is not a garrison.');
  s(D, C, MER,
    'Competence is whoever the local depot promotes. The figurehead cannot flunk them.');
  s(D, C, CHA,
    'The magnetic name is provincial. A confederal celebrity without troops is applause between roadblocks.');
  s(D, C, PRAE,
    'Household crews belong to the members. The diet ends when those crews are called home.');
  s(D, C, LIB,
    'Thinness is a local boast: no ministries except the boss. The center is not allowed to grow one either.');
  s(D, C, PART,
    'Town sittings happen if the local strongman wants noise. The figurehead’s “consultation” is a dinner.');
  s(D, C, ISO,
    'Each boss already treats the next patch as abroad. True foreign flags are quieter still; the figurehead cannot open a port.');

  s(AM, C, CS,
    'Sovereign princes keep their own charters, signed and ignored at home. The high king’s parchment is for festivals.');
  s(AM, C, POP,
    'Each court feeds its own square. The touring crown is a guest of crowds it does not own.');
  s(AM, C, MIL,
    'Levies stay with the dukes. The high king blesses wars he cannot start.');
  s(AM, C, PAT,
    'Paternal grain is a local household. The crown cuts ribbons on barns it does not fill.');
  s(AM, C, TRAD,
    'This is already the machine: blood locally, courtesy at the diet. Custom does not travel upward.');
  s(AM, C, THEO,
    'Chapels belong to princes. Anointing the high king does not move a tithe.');
  s(AM, C, TECH,
    'Stewards count estates. The crown’s savants publish plans the princes file as foreign paper.');
  s(AM, C, REV,
    'A new prince may have just seized. The high king’s ancient year is not theirs.');
  s(AM, C, CORP,
    'Chartered companies are princely. The crown hangs a board that cannot collect.');
  s(AM, C, BUR,
    'Chanceries are local. A royal circular waits at customs.');
  s(AM, C, ECO,
    'Game law is a prince’s. The crown’s forest is a toast.');
  s(AM, C, MER,
    'A capable steward serves a duke. The diet offers no career worth leaving home.');
  s(AM, C, CHA,
    'The magnetic house is a member court. The high king who tries to be the only name learns about retainers.');
  s(AM, C, PRAE,
    'Household troops sleep in provincial palaces. Dawn can end a diet without touching a throne.');
  s(AM, C, LIB,
    'Princes boast thin royal government — meaning the high king. Their own households stay thick.');
  s(AM, C, PART,
    'Estates may hear petitions at home. The crown’s hearing is a pageant.');
  s(AM, C, ISO,
    'Each prince already treats the next as a foreign court. The high king cannot open the league to the sea.');

  s(TY, C, CS,
    'Local bosses keep paper they quote when it flatters them. The shared celebrity’s charter is a poster.');
  s(TY, C, POP,
    'First names on provincial streets. The center’s name is a rumor with better cloth.');
  s(TY, C, MIL,
    'Guns are personal and local. The figurehead has a guard of honor and no column.');
  s(TY, C, PAT,
    'Kindness is a friend with grain in a patch. Confederal care is a photograph.');
  s(TY, C, TRAD,
    'Kin around each boss. The league’s genealogy is a seating chart for a truce.');
  s(TY, C, THEO,
    'Each boss keeps a priest. The center’s blessing is optional weather.');
  s(TY, C, TECH,
    'A literate lieutenant locally. Shared plans die when that lieutenant does, in that patch.');
  s(TY, C, REV,
    'Every crew still claims a restoration. The figurehead’s founding is spare magazines with nicer type.');
  s(TY, C, CORP,
    'Rackets are local firms. The celebrity does not invoice.');
  s(TY, C, BUR,
    'Stolen stamps in each capital. The center’s letterhead is for people who cannot read the nearer one.');
  s(TY, C, ECO,
    'Whoever holds the local dam holds the valley. The diet’s river is a story.');
  s(TY, C, MER,
    'Talent is whoever the local name trusts. There is no confederal exam.');
  s(TY, C, CHA,
    'The magnetic person is a provincial boss. Sharing a celebrity at the center is how they avoid admitting the truce.');
  s(TY, C, PRAE,
    'Bodyguards are local households. Ministers in the diet learn the news when a crew comes to fetch them.');
  s(TY, C, LIB,
    'No ministries except the boss, in each patch. The center is forbidden to become one.');
  s(TY, C, PART,
    'Sit-downs if the local name wants witnesses. The figurehead’s forum is a banquet.');
  s(TY, C, ISO,
    'Patches already treat each other as abroad. A foreign flag is a third problem the celebrity cannot schedule.');

  s(AT, C, CS,
    'Each holy state keeps canon it already fulfills by obedience. The supreme cleric’s earthly limits are a festival reading.');
  s(AT, C, POP,
    'Revivals are local flocks. The shared office tours as a relic.');
  s(AT, C, MIL,
    'Templars stay with autocephalous houses. The center’s sacred war is a hymn without a column.');
  s(AT, C, PAT,
    'Alms queues are diocesan. Confederal charity is a collection plate that does not travel.');
  s(AT, C, TRAD,
    'Rite is local memory. The supreme calendar is courtesy.');
  s(AT, C, THEO,
    'Doctrine is already the local state. The diet’s extra holiness is a title on a cleric they can skip.');
  s(AT, C, TECH,
    'Sacred sciences stay in member houses. Shared tables look like heresy or homework.');
  s(AT, C, REV,
    'Some houses are still purging. The center’s peace is not their eschatology.');
  s(AT, C, CORP,
    'Temple holdings are local. The supreme office does not audit.');
  s(AT, C, BUR,
    'Dispensations in member chanceries. A confederal indulgence is a souvenir.');
  s(AT, C, ECO,
    'Sacred groves are local bans. The diet cannot unban a tree.');
  s(AT, C, MER,
    'Examinations for clergy are house business. The center cannot flunk a prince-bishop.');
  s(AT, C, CHA,
    'The magnetic saint is provincial. A shared supreme name is for festivals.');
  s(AT, C, PRAE,
    'Temple guards are member guards. A sitting ends if a house calls them home.');
  s(AT, C, LIB,
    'Local offices claim the soul, not a thick confederal state — then tithe at home anyway.');
  s(AT, C, PART,
    'Congregations vote feast days at home. Creed is not confederal.');
  s(AT, C, ISO,
    'Unbelieving flags are a local plague law. The supreme cleric cannot open a port the houses have shut.');

  s(EA, C, CS,
    'Each member runs a show election under rules the incumbent already won. The confederal ballot, if any, is theatre on theatre.');
  s(EA, C, POP,
    'Rallies are local incumbents’ crowds. A league tribune without a home count is a guest speaker.');
  s(EA, C, MIL,
    'Refs, cash, and guns stay with member palaces. The center cannot restage a night.');
  s(EA, C, PAT,
    'Clinics follow local loyalty. Confederal stipends do not exist to un-flip a district.');
  s(EA, C, TRAD,
    'Local ruling houses play at ballots. The diet copies the oldest ritual and still cannot count.');
  s(EA, C, THEO,
    'Holy incumbents will not implement a secular league result. There is no marshal.');
  s(EA, C, TECH,
    'Member institutes run the count. Shared observers are a press release.');
  s(EA, C, REV,
    'Some members still date from a rupture. The league calendar is not on their ballot.');
  s(EA, C, CORP,
    'Combines own member majorities. The diet is where they send junior fixers.');
  s(EA, C, BUR,
    'Registration is the local campaign. Confederal rolls are a tray.');
  s(EA, C, ECO,
    'A member can save a forest the league mapped. Maps are not precincts.');
  s(EA, C, MER,
    'Competent managers stay with the incumbent who pays. The diet offers no career.');
  s(EA, C, CHA,
    'The magnetic incumbent is provincial. A confederal face cannot lose because it cannot really run.');
  s(EA, C, PRAE,
    'Interior troops are member troops. A league sitting ends when they are needed at home.');
  s(EA, C, LIB,
    'Members boast a thin league. Their own palaces stay thick enough to not lose.');
  s(EA, C, PART,
    'Local councils soak talk. The league floor is not a file that matters.');
  s(EA, C, ISO,
    'No member has to join a pact. Isolation is the default of a chair with no ships and no count.');

  s(DI, C, CS,
    'Each member may keep a pair of rulers under a local charter. The confederal pair is two ambassadors whose paper can be recalled tonight.');
  s(DI, C, POP,
    'Local crowds pick a favorite of their two. The league’s two names are guests of four streets.');
  s(DI, C, MIL,
    'Member forces split between local chairs. The diet cannot command either half.');
  s(DI, C, PAT,
    'Clienteles are local. Confederal gifts are photographs of other people’s grain.');
  s(DI, C, TRAD,
    'Dual offices are old locally. The league copies the ritual and still cannot tax.');
  s(DI, C, THEO,
    'A godly member pair will not grant a profane league act. There is no other act.');
  s(DI, C, TECH,
    'Two local counters who already deadlock. Adding a diet table does not help.');
  s(DI, C, REV,
    'Some pairs are still founding. The league’s “enough” is a fighting word in those palaces.');
  s(DI, C, CORP,
    'Firms pick a local chair to own. The diet’s two seals are decorative.');
  s(DI, C, BUR,
    'Two local stamps, then a third nobody honors. Nothing happens except pause.');
  s(DI, C, ECO,
    'A member pair can fence a river the diet named. Names are not dams.');
  s(DI, C, MER,
    'Serious secretaries stay with a local chair. The diet gets whoever could travel.');
  s(DI, C, CHA,
    'One local name eats the other at home. The league banners cannot decide which provincial magnet to print.');
  s(DI, C, PRAE,
    'Four households if you count both chairs in each member. The diet borrows a room.');
  s(DI, C, LIB,
    'Members use dual veto to keep the league toothless. That is the membership oath.');
  s(DI, C, PART,
    'Local assemblies instruct one chair or both. Confederal participation is sending someone who can be recalled.');
  s(DI, C, ISO,
    'The pair at the center cannot sign a war. Members who want quiet simply do not send ships, and both local chairs agree on that if on nothing else.');
}

loadStragglerOperating();
