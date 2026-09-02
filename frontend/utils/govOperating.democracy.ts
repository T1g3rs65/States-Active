import { NONE, UNITARY, HUMAN, put } from './govOperating.store';

const U = UNITARY;
const F = 'federal';
const C = 'confederal';
const Y = 'federacy / asymmetrical federation';
const N = NONE;

const CS = 'Constitutional / Limited';
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
const LIB = 'Libertarian / Minimal-State';
const PART = 'Participatory / Deliberative';
const ISO = 'Isolationist';

function set(subtype: string, terr: string, style: string, text: string) {
  put(HUMAN, subtype, terr, style, text);
}

export function loadDemocracyOperating() {
  // —— Representative Democracy ——
  set('Representative Democracy', U, N,
    'Citizens elect a chamber to make the law. Those members, not street votes on every bill, hire and fire the executive and write the statutes the rest of the country lives under.');
  set('Representative Democracy', F, N,
    'Voters send people to a union legislature and to their own statehouses. The capital can tax and treaty where the charter allows; everything else is a state fight, and a party can rule the center while losing half the states.');
  set('Representative Democracy', C, N,
    'Each member polity elects its own government and only lends a few powers upward. The confederal assembly cannot conscript, tax, or rewrite local law unless the members agree again this year.');
  set('Representative Democracy', Y, N,
    'Most regions elect into the same union, but a few hold special charters — their own courts, languages, or tax deals — that the ordinary states do not. Representation is real; equality among regions is not.');
  set('Representative Democracy', U, CS,
    'Elections fill the legislature, but a written charter tells it what it may not touch. Courts can strike statutes; term and office rules sit above tonight’s majority.');
  set('Representative Democracy', U, POP,
    'The chamber is elected, then spends its term claiming to be the street. Rallies and referenda talk set the agenda; the actual votes still happen in the house, often against the quieter districts.');
  set('Representative Democracy', U, MIL,
    'Civilians still hold the ministries, but the general staff has a veto on budgets, borders, and “stability.” Deputies who pick that fight tend not to finish their term.');
  set('Representative Democracy', U, PAT,
    'The house runs a thick welfare state as the price of staying in office. Benefits are a right in rhetoric and a leash in practice: lose the dole and you notice who actually governs.');
  set('Representative Democracy', U, TRAD,
    'The electoral machine sits on older bones — landed families, guilds, or customary seats that always seem to win. New parties can enter; they rarely rearrange the furniture.');
  set('Representative Democracy', U, THEO,
    'The legislature is elected, then legislates inside a sacred fence. Clergy do not always hold seats, but bills on family, school, and speech die if the pulpit will not bless them.');
  set('Representative Democracy', U, TECH,
    'Deputies still face voters, then hand the hard files to planners and institutes. Campaigns are moral; the five-year tables are what actually move money.');
  set('Representative Democracy', U, REV,
    'The chamber calls itself a founding assembly that has not adjourned. Emergency statutes pile up; everyone swears the next election will be the first “normal” one.');
  set('Representative Democracy', U, CORP,
    'Seats are filled at the ballot, then caucus with the firms that paid for the campaign. Lobbying is not a scandal here — it is how a bill is drafted.');
  set('Representative Democracy', U, BUR,
    'Elected ministers arrive to find the folders already written. The house can rage; implementation still waits on circulars, licenses, and the people who stamp them.');
  set('Representative Democracy', U, ECO,
    'Green rules sit beside the constitution in political weight. A majority can want mills and mines; the land courts and quotas can still say no.');
  set('Representative Democracy', U, MER,
    'Anyone may run, but the serious offices are gated by exam, credential, or a party school. Voters pick among people who already passed the filter.');
  set('Representative Democracy', U, CHA,
    'The constitution describes a chamber. In practice the chamber orbits one campaigner. When that person stumbles, the parties discover they have no second idea.');
  set('Representative Democracy', U, LIB,
    'The house is allowed to do very little on purpose. Tax, police, and licensing stay thin; most fights are about keeping them that way.');
  set('Representative Democracy', U, PART,
    'Between elections the public is pulled into juries, town votes, and open hearings that can bind the deputies. Representatives who ignore the floor get primaried or recalled.');
  set('Representative Democracy', U, ISO,
    'The electoral state treats foreign entanglements as a way to lose the next vote. Embassies exist; expeditions and binding alliances usually do not.');

  // —— Parliamentary Democracy ——
  set('Parliamentary Democracy', U, N,
    'Whoever can keep a majority in the house names the cabinet. Lose that majority and the government falls without waiting for a presidential calendar.');
  set('Parliamentary Democracy', F, N,
    'A federal parliament makes and unmakes the union cabinet, while each state keeps its own house and premier. National collapse does not automatically dissolve the states; state revolts can starve the cabinet anyway.');
  set('Parliamentary Democracy', C, N,
    'Member parliaments are the real governments. The confederal diet only sits when they send it work, and any cabinet it names is a committee of ambassadors.');
  set('Parliamentary Democracy', Y, N,
    'The union parliament works like a normal one, except some regions sit under different rules — extra seats, money bills they can veto, or a right to walk. The cabinet bargains with those regions as if they were foreign.');
  set('Parliamentary Democracy', U, CS,
    'The cabinet lives and dies on confidence, but a charter and a court sit above the house. A majority can topple ministers; it cannot simply vote away the limits.');
  set('Parliamentary Democracy', U, POP,
    'Governments fall when the crowd turns, not only when the whip count does. Premiers campaign continuously; backbenchers who look disconnected get replaced mid-sitting.');
  set('Parliamentary Democracy', U, MIL,
    'Confidence still topples cabinets, unless the barracks prefers this one. Defence estimates and emergency powers are negotiated with officers who do not stand for election.');
  set('Parliamentary Democracy', U, PAT,
    'The first business of every cabinet is the stipend, the clinic, and the pension. A premier who trims them loses the house; one who expands them owns it.');
  set('Parliamentary Democracy', U, TRAD,
    'The house is ancient in manner: openings, estates, and families that always hold certain benches. Modern parties work around those customs instead of deleting them.');
  set('Parliamentary Democracy', U, THEO,
    'A government needs the house and the blessing. Faith benches or an upper clerical chamber can deny supply to an ungodly cabinet.');
  set('Parliamentary Democracy', U, TECH,
    'Ministers are MPs, but the program comes from planning boards. Question time is theatre; the civil service tables are the real confidence vote.');
  set('Parliamentary Democracy', U, REV,
    'This parliament still behaves like a committee of the uprising. Enabling acts stay in force; the premier talks like a tribune, not a clerk of the house.');
  set('Parliamentary Democracy', U, CORP,
    'Majorities are assembled from districts the big firms can move. A cabinet that surprises the exchanges finds its own backbench suddenly “concerned.”');
  set('Parliamentary Democracy', U, BUR,
    'Cabinets rotate; the directorates do not. A new premier inherits last year’s circulars and spends the term trying to initial them.');
  set('Parliamentary Democracy', U, ECO,
    'Confidence includes the rivers. A cabinet that guts land law may keep the whip for a week and still drown in no-confidence from its own green benches.');
  set('Parliamentary Democracy', U, MER,
    'Frontbench jobs go to people with the file, not just the safe seat. Amateur ministers do not survive the first estimates hearing.');
  set('Parliamentary Democracy', U, CHA,
    'The majority is a personal following. If the premier leaves politics, the coalition is a seating chart with no names.');
  set('Parliamentary Democracy', U, LIB,
    'The house can fall a government for doing too much. Ministries are few; a cabinet that invents new ones is asking for a snap election.');
  set('Parliamentary Democracy', U, PART,
    'MPs are treated as delegates. Binding caucuses, local assemblies, and recall mean a cabinet can lose the country without losing the arithmetic — and then the arithmetic follows.');
  set('Parliamentary Democracy', U, ISO,
    'Foreign adventures are how you lose supply. Treaties that look like entanglement die in committee; the premier’s overseas trips are kept short and empty.');

  // —— Presidential Democracy ——
  set('Presidential Democracy', U, N,
    'The president is elected on a separate ticket from the legislature and does not fall when the house is angry. Gridlock is a feature: two mandates can point different ways for years.');
  set('Presidential Democracy', F, N,
    'A union president faces a union congress, and governors face their own. The palace cannot fire a statehouse; a statehouse cannot fire the palace. Crises become lawsuits and stand-offs, not a single confidence vote.');
  set('Presidential Democracy', C, N,
    'There may be a confederal president, but they are a chair of chairs. Member presidents (or premiers) keep the armies and the tax men; the center’s “executive” schedules the meeting.');
  set('Presidential Democracy', Y, N,
    'The president is elected nationwide, yet some regions bargained out of that story — their own police, language, or a veto on the palace. The inauguration looks unitary; the map does not.');
  set('Presidential Democracy', U, CS,
    'Two elected branches share power under a charter neither may rewrite by mood. Impeachment exists; so do courts that can empty a decree before breakfast.');
  set('Presidential Democracy', U, POP,
    'The president campaigns as the nation in one body and treats the legislature as an obstacle. Mass rallies substitute for coalition math until a midterm house teaches otherwise.');
  set('Presidential Democracy', U, MIL,
    'The commander-in-chief title is not ceremonial. Officers expect a seat in the security council, and a president who will not take their call finds the garrison slow to move.');
  set('Presidential Democracy', U, PAT,
    'The palace is a dispensary. Presidential legitimacy is measured in clinics, grain, and disaster money, which is why the budget fight is always personal.');
  set('Presidential Democracy', U, TRAD,
    'The presidency sits in a ritual older than the constitution — oaths, families, and a court culture that outlasts parties. Reformers win the office and then wear the costume.');
  set('Presidential Democracy', U, THEO,
    'The president swears on scripture as much as statute. Religious courts or a clerical council can freeze decrees that look profane.');
  set('Presidential Democracy', U, TECH,
    'The president is a chairman of experts. Cabinet posts go to institutes; the legislature rubber-stamps plans it cannot read in time.');
  set('Presidential Democracy', U, REV,
    'The palace still dates itself from the rupture. Emergency clauses stay signed; the president governs as founder, not as a term-limited clerk.');
  set('Presidential Democracy', U, CORP,
    'Boardrooms pick the cabinet in all but name. A president who crosses the exchanges discovers their own party can impeach for “instability.”');
  set('Presidential Democracy', U, BUR,
    'Decrees pile up behind permits. The president can order; the directorates decide when the order becomes a fact on the ground.');
  set('Presidential Democracy', U, ECO,
    'Land and climate agencies can halt a presidential project in its own country. The green veto is slower than a court and harder to fire.');
  set('Presidential Democracy', U, MER,
    'The ticket still needs votes, but ministries are staffed from corps and exams. Patronage presidents look amateur next to their own secretaries.');
  set('Presidential Democracy', U, CHA,
    'The constitution lists two branches. Everyone knows which name is on the banners. When that name leaves, the vice office is an empty chair.');
  set('Presidential Democracy', U, LIB,
    'The president is elected to keep the state small. New agencies are a scandal; vetoes are how the palace proves it is working.');
  set('Presidential Democracy', U, PART,
    'Town assemblies and citizen initiatives can force the president’s hand between elections. A popular palace that ignores them starts losing the street it claimed.');
  set('Presidential Democracy', U, ISO,
    'Foreign policy is sold as staying home. Bases, pacts, and crusades are how you lose the interior; the president’s patriotism is a closed harbor.');
  set('Presidential Democracy', U, PRAE,
    'The palace guard and interior troops are a third electorate. Presidents who keep them paid sleep; presidents who reform them do not finish the reform.');

  // —— Democratic Republic ——
  set('Democratic Republic', U, N,
    'There is no crown. Public power comes from offices the public can fill and empty, and the law is supposed to outrank the people holding those offices.');
  set('Democratic Republic', F, N,
    'A republic of republics: the union is elective, and so are the members. Neither layer may claim to be the only “the people.”');
  set('Democratic Republic', C, N,
    'Sovereign republics pool a few files. Citizenship is local first; the confederal republic is a contract they can reopen.');
  set('Democratic Republic', Y, N,
    'The flag is republican and elective, but some territories joined with side letters — extra autonomy, a princely leftover, or a capital district that is not a peer.');
  set('Democratic Republic', U, CS,
    'Republican offices exist only inside the charter. A majority that tries to become a crown runs into courts, entrenchment, and the next election.');
  set('Democratic Republic', U, POP,
    'The republic performs the people constantly: oaths, rallies, and “national” newspapers. Institutions that look too elite get named as enemies of the vote.');
  set('Democratic Republic', U, MIL,
    'The republic keeps a civilian president or council, and a general staff that considers itself the spare republic. Coups are talked down as “guardianship.”');
  set('Democratic Republic', U, PAT,
    'Civic equality is sold as a package of services. The republic that feeds you also files you; opting out of the clinic is treated as opting out of citizenship.');
  set('Democratic Republic', U, TRAD,
    'The titles are republican; the habits are older. Founding families, academies, and commemorations decide who looks “fit for office.”');
  set('Democratic Republic', U, THEO,
    'The state has no monarch and will not admit a church, except the church that wrote the civic creed. Blasphemy against the republic and against God overlap.');
  set('Democratic Republic', U, TECH,
    'Elected councils set aims; technical colleges staff the ministries. A republic of amateurs is treated as a failed exam.');
  set('Democratic Republic', U, REV,
    'The republic is still dated from the overthrow. Founding myths outrank ordinary statute; opposition is accused of wanting the old palace back.');
  set('Democratic Republic', U, CORP,
    'The emblem is civic; the budget is a shareholder meeting. Republican virtue is taught in schools the combines endow.');
  set('Democratic Republic', U, BUR,
    'Citizens meet the republic as paperwork. Rights exist, then wait in a queue that is itself a form of government.');
  set('Democratic Republic', U, ECO,
    'The commons are a constitutional good. A republican majority cannot auction the last forest without a second, greener house saying so.');
  set('Democratic Republic', U, MER,
    'Anyone may be a citizen; not anyone may be a magistrate. Competitive exams and service records are the cursus honorum.');
  set('Democratic Republic', U, CHA,
    'The republic has offices. It also has a face. Portraits outrun the org chart until the face is gone and the offices remember they are empty.');
  set('Democratic Republic', U, LIB,
    'The point of the republic is that it cannot do much to you. Police and tax stay controversial on purpose.');
  set('Democratic Republic', U, PART,
    'Citizenship is a job. Assemblies, sortition, and mandatory hearings sit beside the elected houses so “republic” does not mean “vote every four years.”');
  set('Democratic Republic', U, ISO,
    'The republic’s virtue is that it does not go abroad looking for monsters. Expeditionary budgets die as unrepublican.');

  // —— Direct Democracy ——
  set('Direct Democracy', U, N,
    'The big statutes are the people’s. Assemblies or ballots decide; officers exist to count, publish, and carry out what was already voted.');
  set('Direct Democracy', F, N,
    'Union questions go to a union ballot, local questions to the cantons. A federal officer who “interprets” a lost vote is asking to be recalled from both directions.');
  set('Direct Democracy', C, N,
    'Each member demos is supreme at home. Confederal acts require another round of popular votes, so nothing urgent is actually confederal.');
  set('Direct Democracy', Y, N,
    'Most citizens vote on everything that binds them, except in the special territories whose side deals say some files never go to the floor.');
  set('Direct Democracy', U, CS,
    'The people can vote laws, not the ground rules. Entrenched rights and amendment supermajorities stop a Tuesday ballot from deleting the minority.');
  set('Direct Democracy', U, POP,
    'Every dispute becomes a campaign. Demagogues live on the initiative process; quiet administration is treated as theft from the floor.');
  set('Direct Democracy', U, MIL,
    'The assembly votes peace and war, then discovers the army had already moved. Officers call it “preparation”; voters call the next ballot a purge.');
  set('Direct Democracy', U, PAT,
    'The floor votes itself stipends and services, then votes the taxes to match — or does not, and the clerks improvise. Clientage wears a show-of-hands mask.');
  set('Direct Democracy', U, THEO,
    'Sacred questions are either banned from the ballot or reserved to a religious assembly that can void a profane result.');
  set('Direct Democracy', U, TECH,
    'Citizens vote after the institute has framed the choices. The options on the paper were written by people who will not be in the queue.');
  set('Direct Democracy', U, REV,
    'The revolution never left the square. Permanent assembly, emergency votes, and “until the enemy is beaten” are how ordinary law is made.');
  set('Direct Democracy', U, CORP,
    'Initiatives are expensive. Firms bankroll signatures and slogans until the popular will looks like a product launch.');
  set('Direct Democracy', U, BUR,
    'The people vote yes; then the circulars begin. A passed statute can sit in implementing rules until it means the opposite.');
  set('Direct Democracy', U, ECO,
    'Land votes are frequent and bitter. A majority that wants a dam still has to beat a green initiative that can freeze the river for years.');
  set('Direct Democracy', U, MER,
    'Anyone may speak; drafting seats go to those who can pass the competence boards. The floor is popular, the pen is not.');
  set('Direct Democracy', U, CHA,
    'The assembly follows a voice. Motions pass because that person is standing there; when they sit down, the demos has no agenda.');
  set('Direct Democracy', U, LIB,
    'The only popular votes that reliably pass are votes to forbid the state a new power. Doing things takes more turnout than stopping things.');
  set('Direct Democracy', U, PART,
    'This is the full version: juries, sortition, rotating chairs, and ballots stacked until politics is a second job.');
  set('Direct Democracy', U, ISO,
    'Foreign pacts must clear the same floor as a road tax. Entanglement dies of exhaustion before it dies of principle.');

  // —— Consociational Democracy ——
  set('Consociational Democracy', U, N,
    'The country is several peoples under one roof. Cabinets are quota deals; each bloc has a veto on the files that would ruin it, so government is slow and hard to kill.');
  set('Consociational Democracy', F, N,
    'Communities have states or cantons of their own, plus guaranteed seats in the union cabinet. Crossing a communal line is a constitutional event, not a campaign theme.');
  set('Consociational Democracy', C, N,
    'The blocs are effectively sovereign and meet as a cartel. “National” policy is a treaty among communities that keep their own police.');
  set('Consociational Democracy', Y, N,
    'Power-sharing is the rule, except for the region that negotiated a thicker shield than the others — its own court, militia, or money — which the grand coalition cannot outvote.');
  set('Consociational Democracy', U, CS,
    'The bargain is written down: seats, vetoes, and census rules sit in the charter. A majority of one community cannot “win an election” and take the rest.');
  set('Consociational Democracy', U, POP,
    'Each street has its own tribune. Populists campaign against the cartel, then discover they still need the other blocs to turn the lights on.');
  set('Consociational Democracy', U, MIL,
    'The army is either carefully mixed or quietly owned by one community. Officers are a communal veto that does not appear in the seating plan.');
  set('Consociational Democracy', U, PAT,
    'Each bloc runs a welfare world for its own. The state is a clearing house of rival kindnesses; mixing the lists is how riots start.');
  set('Consociational Democracy', U, TRAD,
    'The quotas follow old ranks: elders, churches, clans. Modern parties are skins on communal houses that predate the republic.');
  set('Consociational Democracy', U, THEO,
    'The communities are faiths. Personal status law is plural; the cabinet’s real work is keeping the holy courts from declaring each other void.');
  set('Consociational Democracy', U, TECH,
    'Communal bosses still name ministers, but the shared files — water, currency, rails — sit with mixed technical boards nobody quite owns.');
  set('Consociational Democracy', U, REV,
    'The settlement is treated as a truce after a war that might resume. Every budget is a ceasefire; “normal politics” is a slogan.');
  set('Consociational Democracy', U, CORP,
    'Each community has its combines. Cabinet seats are as much trade associations as ethnic tickets, and a strike in one bloc can halt the deal.');
  set('Consociational Democracy', U, BUR,
    'The price of peace is duplicate offices. Every file exists in several languages and several directorates so nobody has to trust a single stamp.');
  set('Consociational Democracy', U, ECO,
    'Rivers and hills ignore communal maps. Green rules either become the only truly shared law or the next thing to fight over.');
  set('Consociational Democracy', U, MER,
    'Quotas set how many; exams set whom. A community cannot send just anyone — the others will reject an incompetent as a breach of the deal.');
  set('Consociational Democracy', U, LIB,
    'The grand coalition agrees on this much: the center should stay weak so no bloc can use it. The veto is how liberty is defined here.');
  set('Consociational Democracy', U, PART,
    'Communal assemblies bind their ministers. A deal made in the capital can be undone the same night in four separate halls.');
  set('Consociational Democracy', U, ISO,
    'Foreign patrons are how communal wars restart. The settlement forbids entangling alliances unless every bloc signs, which means almost none sign.');

  // —— Deliberative Democracy ——
  set('Deliberative Democracy', U, N,
    'Legitimacy is a conversation that has to be seen. Citizen assemblies, long hearings, and published reasons matter more than a raw 51 percent.');
  set('Deliberative Democracy', F, N,
    'Union assemblies and state assemblies both claim the right to talk a policy to death. A federal act that skipped the process is treated as illegitimate even if the votes were there.');
  set('Deliberative Democracy', C, N,
    'Each member polity deliberates at home, then sends instructed talkers upward. The confederal floor is a negotiation among already-finished arguments.');
  set('Deliberative Democracy', Y, N,
    'The talking cure is general, except in the special region whose charter lets it skip the forums on the files it cares about most.');
  set('Deliberative Democracy', U, CS,
    'Process is constitutional. A majority that rams a bill without the mandated hearings loses in court for that reason alone.');
  set('Deliberative Democracy', U, POP,
    'The forums are loud on purpose. Facilitators chase “the authentic voice” until quieter evidence looks like elitism.');
  set('Deliberative Democracy', U, MIL,
    'Officers sit in the security hearings as if they were another citizens’ chamber. A deliberation that excludes them is called naïve, then ignored.');
  set('Deliberative Democracy', U, PAT,
    'Hearings always end in a benefit. A policy with no stipend attached cannot survive the testimony stage.');
  set('Deliberative Democracy', U, TRAD,
    'The assemblies copy older councils: elders speak first, formula phrases close the session. Innovation has to wear custom.');
  set('Deliberative Democracy', U, THEO,
    'Scripture and sermon are admitted as public reason. A bill that cannot be justified in the sanctuary will not survive the civic hall.');
  set('Deliberative Democracy', U, TECH,
    'Citizens talk; the briefing books were written by the institute. Consensus tends to look like last year’s expert paper.');
  set('Deliberative Democracy', U, REV,
    'The founding assembly never closed. Every statute is a continuation of the uprising’s debate; “enough talking” is a counter-revolutionary sentence.');
  set('Deliberative Democracy', U, CORP,
    'Stakeholder tables include the firms as if they were a neighborhood. Deliberation that excludes capital is called incomplete, then defunded.');
  set('Deliberative Democracy', U, BUR,
    'Minutes, impact statements, and comment periods are the government. A decision without a paper trail is not a decision.');
  set('Deliberative Democracy', U, ECO,
    'Non-human interests get advocates in the room. A process that only counted voters would be ruled incomplete.');
  set('Deliberative Democracy', U, MER,
    'Sortition is real, then training is mandatory. Random citizens still have to pass the briefing before their vote counts as informed.');
  set('Deliberative Democracy', U, CHA,
    'The circle has a magnet. People come to hear one speaker reason; when that person is silent the method looks like delay.');
  set('Deliberative Democracy', U, LIB,
    'The only consensus that forms easily is “do not add a power.” Deliberation is a brake, which is the point.');
  set('Deliberative Democracy', U, PART,
    'This is deliberation as mass work: rotating chairs, paid time off to attend, and a duty to show up. Politics is not optional civic hobby.');
  set('Deliberative Democracy', U, ISO,
    'Foreign commitments must survive the same long floor. By the time the hearing ends, the treaty’s moment has usually passed.');
}

loadDemocracyOperating();

