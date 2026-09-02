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
const PART = 'Participatory / Deliberative';
const LIB = 'Libertarian / Minimal-State';

function set(subtype: string, terr: string, style: string, text: string) {
  put(HUMAN, subtype, terr, style, text);
}

export function loadAutocracyOperating() {
  set('Dictatorship', U, N,
    'One office holds the gun, the budget, and the last word. Other bodies meet to applaud.');
  set('Dictatorship', F, N,
    'The dictator names the governors. “States” are transmission belts; a federal form without a federal argument.');
  set('Dictatorship', I, N,
    'The same office that crushed the capital now appoints satraps. Outer lands learn the dictator’s name before they learn their own code.');
  set('Dictatorship', Y, N,
    'Most of the map is a single will. One province kept a bargain — its own police or a princely leftover — that the palace has not yet eaten.');
  set('Dictatorship', U, POP,
    'The dictator is the people in one body. Crowds are bused; silence is treason against a majority that cannot be counted.');
  set('Dictatorship', U, MIL,
    'The dictator came from the barracks and never left. Civilian titles are costumes on a command chart.');
  set('Dictatorship', U, PAT,
    'The palace feeds. Ration cards and portraits are the same ministry; hunger is a political assignment.');
  set('Dictatorship', U, TRAD,
    'The office is new; the court is old. Protocol, families, and a household that outlasts titles.');
  set('Dictatorship', U, THEO,
    'The dictator is blessed, or claims to be. A pulpit that withholds the blessing is a coup in slow motion.');
  set('Dictatorship', U, TECH,
    'The ruler trusts dashboards. Ministers who bring feelings instead of figures do not bring a second report.');
  set('Dictatorship', U, REV,
    'The dictatorship is still dated from the seizure. Emergency is the only calendar.');
  set('Dictatorship', U, CORP,
    'The palace is a holding company. Contracts follow loyalty; a firm without a cousin in the household is prey.');
  set('Dictatorship', U, BUR,
    'Fear is filed. Permits, internal passports, and circulars do the work soldiers used to do on corners.');
  set('Dictatorship', U, ECO,
    'A dictator can order a dam and still lose to a river bureau they forgot to terrorize. Nature is the only minister that does not attend.');
  set('Dictatorship', U, MER,
    'The inner circle is competent on purpose. Fools are dangerous to the ruler, so they are kept far from the buttons.');
  set('Dictatorship', U, CHA,
    'The office is a person. Institutions are furniture. When the person dies, the furniture fights.');
  set('Dictatorship', U, PRAE,
    'The guard can unmake the dictator. Nights are decided inside the walls, not in the ministries.');
  set('Dictatorship', U, ISO,
    'Foreign wars are how dictators get overthrown. This one treats the border as a locked door.');

  set('Absolute Monarchy', U, N,
    'The crown is the state. Law is what the monarch issues; ministers serve at pleasure and die in disfavor.');
  set('Absolute Monarchy', F, N,
    'A king of kings in slow motion: member crowns or viceroys keep courts, but they swear to one person. Federal in map, personal in oath.');
  set('Absolute Monarchy', I, N,
    'This is an empire. The core is a court; the rest is possession. Subject peoples do not vote, and they do not share the blood.');
  set('Absolute Monarchy', Y, N,
    'The realm is the monarch’s, except the march that kept its own high justice by an old paper the crown has not torn.');
  set('Absolute Monarchy', U, POP,
    'The monarch is beloved, or the court spends fortunes making it so. Popularity is a ritual; unpopularity is a plot.');
  set('Absolute Monarchy', U, MIL,
    'The crown is a warhorse. Marshals sit closer than chancellors; a peace king looks unfinished.');
  set('Absolute Monarchy', U, PAT,
    'The good parent of the realm. Grain, hospitals, and godparentage bind the poor to the household that can also hang them.');
  set('Absolute Monarchy', U, TRAD,
    'Blood, coronation, and the right to be first through a door. Innovation must arrive dressed as restoration.');
  set('Absolute Monarchy', U, THEO,
    'Divine right is not a metaphor. A king who loses the altar loses the army’s prayers, then the army.');
  set('Absolute Monarchy', U, TECH,
    'The monarch collects savants. A court that cannot count will still issue edicts; they will simply be ruinous.');
  set('Absolute Monarchy', U, REV,
    'A new dynasty that still talks like a revolt. The calendar starts at the coronation-as-uprising.');
  set('Absolute Monarchy', U, CORP,
    'Royal monopolies and chartered companies are the treasury. The crown is a shareholder who can hang the board.');
  set('Absolute Monarchy', U, BUR,
    'Chancery is the kingdom. Edicts travel as paper; a monarch who will not sign sits in a pretty prison of clerks.');
  set('Absolute Monarchy', U, ECO,
    'Game, forest, and river are royal. A mill that spoils a chase is a crime against the body of the king.');
  set('Absolute Monarchy', U, MER,
    'The blood gets you in; incompetence gets you a quiet estate. Working offices go to people who can actually run them.');
  set('Absolute Monarchy', U, CHA,
    'This particular monarch is the regime. Heirs are a rumor until the funeral, and maybe after.');
  set('Absolute Monarchy', U, PRAE,
    'The household guard can make a new monarch before dawn. The realm learns the name at breakfast.');
  set('Absolute Monarchy', U, ISO,
    'Foreign courts are traps. This crown marries at home, wars rarely, and calls it dignity.');

  set('Tyranny / Personalist Rule', U, N,
    'Power is a person, not an office. Loyalty beats law, party, and kin. Institutions exist to look busy while the favorite whispers.');
  set('Tyranny / Personalist Rule', F, N,
    'Governors are friends. When friendship ends, the “state” ends with it; the map is a list of first names.');
  set('Tyranny / Personalist Rule', I, N,
    'The favorite of the core is satrap of the rest. Outer lands are gifts to companions, revoked the same way.');
  set('Tyranny / Personalist Rule', Y, N,
    'Most regions are personal property in practice. One corner still has a machine the tyrant has not staffed with cousins.');
  set('Tyranny / Personalist Rule', U, POP,
    'The tyrant is a celebrity. Crowds are a drug; a bad festival is a coup warning.');
  set('Tyranny / Personalist Rule', U, MIL,
    'Companions in uniform. The army is a household, which is why it is dangerous when the household argues.');
  set('Tyranny / Personalist Rule', U, PAT,
    'Gifts, not rights. A clinic opens where the motorcade will see it; it closes when the motorcade is bored.');
  set('Tyranny / Personalist Rule', U, TRAD,
    'The tyrant wears old symbols to look inevitable. Custom is a costume, discarded if it delays a whim.');
  set('Tyranny / Personalist Rule', U, THEO,
    'The ruler is a living omen. Priests who will not say so find new careers in silence.');
  set('Tyranny / Personalist Rule', U, TECH,
    'Whim with dashboards. The tyrant loves a gadget and will ruin a province for a demonstration.');
  set('Tyranny / Personalist Rule', U, REV,
    'The seizure is still the personality. Everyone else is cast as a character in that story.');
  set('Tyranny / Personalist Rule', U, CORP,
    'The national fortune is a private purse. Companies exist until they look like rivals.');
  set('Tyranny / Personalist Rule', U, BUR,
    'Even a whim needs clerks. The terror is that the clerk is also a cousin.');
  set('Tyranny / Personalist Rule', U, ECO,
    'A favorite can be given a forest. Tomorrow a different favorite can be given the mill that eats it.');
  set('Tyranny / Personalist Rule', U, CHA,
    'This is the pure case: the country is a relationship. No relationship, no country.');
  set('Tyranny / Personalist Rule', U, PRAE,
    'The bodyguard is the government. Ministers learn the news from who is still standing in the morning.');
  set('Tyranny / Personalist Rule', U, ISO,
    'Abroad there are other personalities. This one prefers a closed stage.');

  set('Absolute Theocracy', U, N,
    'A single sacred office speaks for God and the state. Dissent is heresy as much as treason, and the two courts are one.');
  set('Absolute Theocracy', F, N,
    'The supreme cleric names the regional shepherds. Federalism is diocesan: lose the blessing, lose the province.');
  set('Absolute Theocracy', I, N,
    'Holy war with a tax office. Outer lands are converted, then assessed.');
  set('Absolute Theocracy', Y, N,
    'The prophet-office rules the realm. One valley kept a tolerated rite too expensive to crush this decade.');
  set('Absolute Theocracy', U, POP,
    'The office rules by revival. Street ecstasy can elevate a successor; scholars who dislike it call it theodicy.');
  set('Absolute Theocracy', U, MIL,
    'The sacred office is a war office. Chaplains outrank accountants until the powder runs out.');
  set('Absolute Theocracy', U, PAT,
    'Alms are obedience. The faithful are fed; the doubtful discover that hunger is a sermon.');
  set('Absolute Theocracy', U, TRAD,
    'Revelation is closed. The living office may speak, but only in the dead office’s vocabulary.');
  set('Absolute Theocracy', U, TECH,
    'Miracles are scheduled. Observatories and hospitals exist to prove the doctrine, then they discover facts, then they are restaffed.');
  set('Absolute Theocracy', U, REV,
    'A purified throne after the last church was burned. The calendar is Year One of the true voice.');
  set('Absolute Theocracy', U, CORP,
    'Temple monopolies fund the office. A market the pulpit did not bless is a black market.');
  set('Absolute Theocracy', U, BUR,
    'Canon is a queue. Dispensations, indexes, and licenses are how salvation is rationed.');
  set('Absolute Theocracy', U, ECO,
    'Creation is the property of the office. A mine in a sacred waste is blasphemy even if it would pay for a cathedral.');
  set('Absolute Theocracy', U, MER,
    'The office is filled by ordeal, exam, or miracle-committee. A merely popular preacher waits outside.');
  set('Absolute Theocracy', U, CHA,
    'This particular voice is the faith. When it stops, the church is a room of men who used to listen.');
  set('Absolute Theocracy', U, PRAE,
    'Temple guards make theology. A night in the crypt can change the creed.');
  set('Absolute Theocracy', U, ISO,
    'The world is unclean. Mission is inward; foreign gods are a quarantine issue.');

  set('Electoral Autocracy', U, N,
    'There are ballots, parties, and a press that knows the line. The incumbent cannot actually lose; the show of choice is the point.');
  set('Electoral Autocracy', F, N,
    'Union and states both hold elections the palace has already counted. Opposition may take a province the center does not need.');
  set('Electoral Autocracy', I, N,
    'The core votes in costume; the marches do not bother. Subject lands are exempted from the comedy.');
  set('Electoral Autocracy', Y, N,
    'Most regions play the game. One territory is excused from even the ritual — too restive, or too loyal to need it.');
  set('Electoral Autocracy', U, POP,
    'The incumbent is a tribune who never leaves the campaign. Rallies replace platforms; the count is a festival.');
  set('Electoral Autocracy', U, MIL,
    'Uniforms at the polling stations are not a scandal. They are how you know it is a serious country.');
  set('Electoral Autocracy', U, PAT,
    'Ballots follow stipends. A district that loses the clinic also loses its taste for the wrong party.');
  set('Electoral Autocracy', U, TRAD,
    'The same names cycle through “opposition.” Dynasty plus ballot box; both are hereditary.');
  set('Electoral Autocracy', U, THEO,
    'The approved slate is the godly slate. A party the pulpit will not bless does not get indoor venues.');
  set('Electoral Autocracy', U, TECH,
    'The count is a software demonstration. Independent tallies are conspiracy theories by definition.');
  set('Electoral Autocracy', U, REV,
    'Every election is a referendum on the founding seizure. Voting against is nostalgia for the enemy.');
  set('Electoral Autocracy', U, CORP,
    'Approved businesses fund approved parties. A fortune that funds the wrong ticket is a confession.');
  set('Electoral Autocracy', U, BUR,
    'Registration, signatures, and hall permits are the real election. The day itself is a queue.');
  set('Electoral Autocracy', U, ECO,
    'Green permits are a patronage tap. Opposition towns wait longer for water rulings.');
  set('Electoral Autocracy', U, MER,
    'The ruling party’s school staffs both “sides.” Competent managers keep the lights on while the labels rotate.');
  set('Electoral Autocracy', U, CHA,
    'The incumbent is the only candidate who exists as a person. The rest are furniture with slogans.');
  set('Electoral Autocracy', U, PRAE,
    'Interior troops can restaff a party overnight. The count is downstream of the barracks.');
  set('Electoral Autocracy', U, ISO,
    'Foreign observers are insult enough. This autocracy holds elections for domestic theatre, not for the world.');
  set('Electoral Autocracy', U, PART,
    'Local councils and “citizen assemblies” exist to exhaust energy that might have gone to a real party. Participation is a sponge.');

  set('Diarchy / Dual Rule', U, N,
    'Two rulers share the top — by office, family, or pact. A decree needs both, or one is a mask the other wears.');
  set('Diarchy / Dual Rule', F, N,
    'Each half of the pair owns a layer: one the union, one the states, or one the army and one the purse. Deadlock is the constitution.');
  set('Diarchy / Dual Rule', I, N,
    'Two names on the imperial seal. Outer lands learn to petition whichever one is not currently angry.');
  set('Diarchy / Dual Rule', Y, N,
    'The pair rules the ordinary map. One special region answers only to one of them — a built-in betrayal kit.');
  set('Diarchy / Dual Rule', U, POP,
    'The street has a favorite of the two. Crowds can unbalance a pact that was supposed to be arithmetic.');
  set('Diarchy / Dual Rule', U, MIL,
    'One of the two is always the army. The other signs what the army will already do.');
  set('Diarchy / Dual Rule', U, PAT,
    'Each ruler runs a welfare clientele. Citizens pick a patron the way they pick a team.');
  set('Diarchy / Dual Rule', U, TRAD,
    'Twin thrones, twin rituals. The pairing is older than the current occupants, which is why it survives them.');
  set('Diarchy / Dual Rule', U, THEO,
    'One sword, one altar — or two altars that must not call each other false. Theology is the coalition agreement.');
  set('Diarchy / Dual Rule', U, TECH,
    'The pair split files: one the human theatre, one the plans. Citizens meet whichever desk their problem is filed under.');
  set('Diarchy / Dual Rule', U, REV,
    'Two tribunes of the same uprising who could not agree who won. The dual office is a ceasefire.');
  set('Diarchy / Dual Rule', U, CORP,
    'Two fortunes, two chairs. The national budget is a shareholders’ deadlock.');
  set('Diarchy / Dual Rule', U, BUR,
    'Every paper needs two stamps. Nothing happens quickly except mutual veto.');
  set('Diarchy / Dual Rule', U, ECO,
    'One of the two “owns” the land file. Green rules last until the other one needs a mine.');
  set('Diarchy / Dual Rule', U, MER,
    'The pair is supposed to be complementary competence. When both are fools, the country has twice the ceremony.');
  set('Diarchy / Dual Rule', U, PRAE,
    'Each ruler has a guard. The capital is two armed households pretending to be a government.');
  set('Diarchy / Dual Rule', U, ISO,
    'Foreign courts will pick a favorite. This diarchy answers by refusing to go abroad at all.');

  // Anocracy
  set('Competitive Authoritarian', U, N,
    'Opposition can run and sometimes take seats. The incumbents keep the refs, the cash, and the guns, so a true rotation is a once-a-generation accident.');
  set('Competitive Authoritarian', F, N,
    'The opposition may take a state. The union tools — courts, treasury, broadcast — stay with the center until that accident happens twice.');
  set('Competitive Authoritarian', I, N,
    'The core plays a rough democracy; the marches do not. Subject lands are the price of keeping the interior competitive enough to look real.');
  set('Competitive Authoritarian', Y, N,
    'Most regions are in the game. One is either a showpiece of fairness or a cage — a special deal that proves the rest is theatre.');
  set('Competitive Authoritarian', U, CS,
    'There is a charter, and it is used. Opposition lawyers win cases that do not matter, and lose the ones that would.');
  set('Competitive Authoritarian', U, POP,
    'Both sides shout for the people. Only one side can bus the people on voting day.');
  set('Competitive Authoritarian', U, MIL,
    'The army is “neutral” in the way a loaded gun on the table is neutral. Parties campaign around it.');
  set('Competitive Authoritarian', U, PAT,
    'Benefits follow loyalty with just enough leakage to keep hope. A clinic can flip a district; it can also be un-flipped.');
  set('Competitive Authoritarian', U, TRAD,
    'The same notable families staff “government” and “opposition.” Rotation is real; replacement is not.');
  set('Competitive Authoritarian', U, THEO,
    'The pulpit is not quite a party, but it is not quite free. A blessing is worth a precinct.');
  set('Competitive Authoritarian', U, TECH,
    'The count is disputed in the language of software. Whoever holds the servers holds the narrative of fraud.');
  set('Competitive Authoritarian', U, REV,
    'The last rupture is still the legitimacy. Opposition is tolerated as long as it does not unfound the state.');
  set('Competitive Authoritarian', U, CORP,
    'Approved capital funds both tickets, then calls in the marker. A truly independent fortune is a threat.');
  set('Competitive Authoritarian', U, BUR,
    'Registration and permits are the campaign. The street is allowed; the hall is not.');
  set('Competitive Authoritarian', U, ECO,
    'Green rulings punish the wrong towns. Ecology is a patronage map with trees on it.');
  set('Competitive Authoritarian', U, MER,
    'The civil service mostly works. That competence is why the unfair elections do not collapse the lights.');
  set('Competitive Authoritarian', U, CHA,
    'The incumbent is a celebrity the opposition cannot clone. When that person goes, the machine looks ordinary and therefore beatable.');
  set('Competitive Authoritarian', U, PRAE,
    'Interior troops can restage a “close” night. Parties know which buildings not to picket.');
  set('Competitive Authoritarian', U, PART,
    'Local councils soak up activists. Participation is encouraged right up to the files that could change the palace.');
  set('Competitive Authoritarian', U, ISO,
    'Foreign endorsement is a kiss of death. This regime wants observers at a distance and money with no lectures.');
  set('Competitive Authoritarian', U, LIB,
    'The economy is loose; the politics are not. You may get rich if you do not get organized.');

  set('Illiberal Democracy', U, N,
    'People vote, then watch rights, press, and courts get bent around the winner. The count can be real; the aftermath is the point.');
  set('Illiberal Democracy', F, N,
    'A national majority uses union tools against unfriendly states. Federalism becomes a hunt; the losers talk secession and are called traitors.');
  set('Illiberal Democracy', I, N,
    'The demos at the core votes to hold others down. Empire with a mandate.');
  set('Illiberal Democracy', Y, N,
    'The majority’s republic, plus a minority region under special law that never quite expires.');
  set('Illiberal Democracy', U, CS,
    'A constitution exists to be interpreted until it agrees. Entrenchment delays the winner; it does not stop them.');
  set('Illiberal Democracy', U, POP,
    'The majority is a mood. Institutions that protect losers are “undemocratic” by definition.');
  set('Illiberal Democracy', U, MIL,
    'Uniforms back the people’s choice. A court that blocks the winner is a security issue.');
  set('Illiberal Democracy', U, PAT,
    'Benefits for “real” citizens. Everyone else can vote and still wait outside the clinic.');
  set('Illiberal Democracy', U, TRAD,
    'The majority is a historic people. Newcomers and dissenters are guests in someone else’s democracy.');
  set('Illiberal Democracy', U, THEO,
    'The winning creed becomes public law. Minority rites survive as folklore.');
  set('Illiberal Democracy', U, TECH,
    'The majority loves a strong hand on the data. Surveillance is sold as service.');
  set('Illiberal Democracy', U, REV,
    'Every election is Year One again. The losing side is the old regime in disguise.');
  set('Illiberal Democracy', U, CORP,
    'National champions get the winner’s protection. Foreign and enemy-owned shops learn new regulations overnight.');
  set('Illiberal Democracy', U, BUR,
    'Paperwork for thee. Allies skip the queue; opponents drown in it.');
  set('Illiberal Democracy', U, ECO,
    'Green rules hit the wrong districts first. The majority’s hinterland gets exceptions.');
  set('Illiberal Democracy', U, MER,
    'Loyal talent is promoted fast. Disloyal talent is “political.” The lights stay on.');
  set('Illiberal Democracy', U, CHA,
    'The leader is the people. When they go, the majority discovers it was a fan club.');
  set('Illiberal Democracy', U, PRAE,
    'Security services are a constituency. They vote in the only way that matters.');
  set('Illiberal Democracy', U, PART,
    'The majority is consulted constantly — rallies, texts, show votes. Minorities are consulted never.');
  set('Illiberal Democracy', U, ISO,
    'Abroad is a lecture. This democracy wants no court above its own majority.');
  set('Illiberal Democracy', U, LIB,
    'The market is free for friends. For everyone else, licensing is the ideology.');

  set('Military-Managed Democracy', U, N,
    'Civilians govern inside a fence the army can move. Elections pick managers, not the fence.');
  set('Military-Managed Democracy', F, N,
    'Commands overlay states. A civilian governor who forgets the garrison is a press release.');
  set('Military-Managed Democracy', I, N,
    'The army that “guards” the core also occupies the marches. Democracy is a metropolitan hobby.');
  set('Military-Managed Democracy', Y, N,
    'Most provinces have a civilian face. One is openly a military district, which is honest of them.');
  set('Military-Managed Democracy', U, CS,
    'The charter names the army as guarantor. Courts can scold civilians; they do not scold the guarantee.');
  set('Military-Managed Democracy', U, POP,
    'The army claims to have given the people the vote. Ungrateful voters meet “guidance.”');
  set('Military-Managed Democracy', U, PAT,
    'Garrisons run the serious welfare: disaster, grain, roads. Civilian ministries do festivals.');
  set('Military-Managed Democracy', U, TRAD,
    'Officer families and old regiments are the deep state with medals. Parties are seasonal.');
  set('Military-Managed Democracy', U, THEO,
    'Chaplains sit on the national security council. A civilian cabinet that looks profane gets a briefing.');
  set('Military-Managed Democracy', U, TECH,
    'Staff colleges outrank think tanks. Planning is a military art applied to milk and rails.');
  set('Military-Managed Democracy', U, REV,
    'The last coup is still the founding. Civilians are on probation until further notice.');
  set('Military-Managed Democracy', U, CORP,
    'Procurement politics. Firms that keep the army modern keep a civilian party as a hobby.');
  set('Military-Managed Democracy', U, BUR,
    'Emergency regulations never expire. Democracy is the part you can photograph.');
  set('Military-Managed Democracy', U, ECO,
    'Ranges and fuel beat parks. A green civilian minister lasts until the next exercise.');
  set('Military-Managed Democracy', U, MER,
    'Staff college plus civilian exam. Incompetents can still win a district; they do not get defence.');
  set('Military-Managed Democracy', U, CHA,
    'A general-president or a civilian front for one. The fence has a face.');
  set('Military-Managed Democracy', U, PRAE,
    'The unit that guards the capital guards the experiment. If they change their mind, the experiment ends.');
  set('Military-Managed Democracy', U, PART,
    'Local councils are encouraged. National security files are not a discussion item.');
  set('Military-Managed Democracy', U, ISO,
    'Foreign adventures are how armies get ideas. This one prefers to manage the interior.');
}

loadAutocracyOperating();
