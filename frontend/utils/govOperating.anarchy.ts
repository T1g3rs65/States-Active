import { NONE, UNITARY, HUMAN, ZYTHERA, put } from './govOperating.store';

const U = UNITARY;
const F = 'federal';
const C = 'confederal';
const I = 'imperial / hegemonic';
const N = NONE;
const POP = 'Populist';
const REV = 'Revolutionary / Provisional';
const ECO = 'Ecological / Green-Influenced';
const PART = 'Participatory / Deliberative';
const LIB = 'Libertarian / Minimal-State';
const TRAD = 'Traditional / Hereditary';
const ISO = 'Isolationist';
const CHA = 'Charismatic Leader Focus';
const MIL = 'Military-Influenced';
const CORP = 'Corporate / Business Elite';
const THEO = 'Theocratic Influence';

function h(subtype: string, terr: string, style: string, text: string) {
  put(HUMAN, subtype, terr, style, text);
}
function z(subtype: string, terr: string, style: string, text: string) {
  put(ZYTHERA, subtype, terr, style, text);
}

export function loadAnarchyOperating() {
  h('Anarcho-Communist Commune', U, N,
    'No state, no owners. Land and shops are held in common; assemblies handle what little “government” exists, and they can unhandle it tomorrow.');
  h('Anarcho-Communist Commune', F, N,
    'Communes federate for rails, defense of the revolution, and nothing they can do locally. A federal clerk who starts acting like a minister gets recalled by the sending hall.');
  h('Anarcho-Communist Commune', C, N,
    'Each commune is sovereign. The confederal congress is a swap meet of mandates that expire when the delegates go home.');
  h('Anarcho-Communist Commune', U, POP,
    'The floor is the crowd. Anyone who looks like a permanent officer is shouted down — or followed, which is the danger.');
  h('Anarcho-Communist Commune', U, REV,
    'Expropriation is still on the agenda. “After the victory” is how they justify the committee that was supposed to dissolve.');
  h('Anarcho-Communist Commune', U, ECO,
    'The land is the commons, full stop. A mill the assembly wants still loses if it poisons the water they all drink.');
  h('Anarcho-Communist Commune', U, PART,
    'Attendance is the culture. Sortition, rotation, and long nights; people who hate meetings leave, which is a quiet exile.');
  h('Anarcho-Communist Commune', U, LIB,
    'They mean no bosses, including the assembly when it overreaches. Binding mandates are suspect; exit is always legal.');
  h('Anarcho-Communist Commune', U, ISO,
    'The world is states and owners. This commune treats both as contagion and keeps the road bad on purpose.');

  h('Warlord / Failed State', U, N,
    'The center has collapsed. Armed bosses run patches of land; “the nation” is a name on a map and a radio station if the generator works.');
  h('Warlord / Failed State', F, N,
    'The bosses sometimes swear a league. Federalism here is a ceasefire with letterhead; tax is a roadblock.');
  h('Warlord / Failed State', C, N,
    'Each armed patch is sovereign. Confederal talk is how they divide ammo and blame.');
  h('Warlord / Failed State', U, POP,
    'A boss who feeds the street is a hero. One who only extracts is a rumor with guns — until the next boss.');
  h('Warlord / Failed State', U, REV,
    'Every crew claims to be restoring the republic, the king, or the people. The slogan is spare magazines.');
  h('Warlord / Failed State', U, ECO,
    'Whoever holds the dam holds the valley. Ecology is logistics: fuel, water, and a burned orchard.');
  h('Warlord / Failed State', U, CHA,
    'The failed state has a name people still follow. When that name dies, the map redraws before the funeral ends.');
  h('Warlord / Failed State', U, MIL,
    'There is no civilian file. Every ministry is a brigade with a stamp stolen from the last capital.');
  h('Warlord / Failed State', U, ISO,
    'Foreign patrons pick favorites and call it aid. The smarter bosses take the crates and mine the road behind them.');
  h('Warlord / Failed State', U, TRAD,
    'Old clans re-armed. Custom and feud outlasted the ministries; the warlord is often just the eldest with the best rifles.');

  h('Anarcho-Capitalist / Private-Law', U, N,
    'No public sovereign. Firms, insurers, and private courts sell protection and arbitration; a person without a contract is a gap in coverage.');
  h('Anarcho-Capitalist / Private-Law', F, N,
    'Charter zones federate for currency and roads by contract. Secession is a clause, not a war — until the clause is under-insured.');
  h('Anarcho-Capitalist / Private-Law', C, N,
    'Each zone’s law is a product. Confederal “government” is a standards body for competing protection brands.');
  h('Anarcho-Capitalist / Private-Law', U, POP,
    'The customers are “the people.” A firm that gouges gets a rival; a firm that shoots customers gets a bigger rival.');
  h('Anarcho-Capitalist / Private-Law', U, REV,
    'This market was born in a crash of the last state. Founders still talk like pirates; the second generation talks like counsel.');
  h('Anarcho-Capitalist / Private-Law', U, ECO,
    'Externalities are a lawsuit if someone will pay to bring it. Rivers without a plaintiff are dumps.');
  h('Anarcho-Capitalist / Private-Law', U, PART,
    'Shareholder meetings and subscriber votes. Participation is for people who paid for the token.');
  h('Anarcho-Capitalist / Private-Law', U, LIB,
    'This is the full brief: almost no public law, stacked private law, and a cultural allergy to anything named a ministry.');
  h('Anarcho-Capitalist / Private-Law', U, CORP,
    'The largest insurers are the government. Smaller firms live under their terms of service.');
  h('Anarcho-Capitalist / Private-Law', U, ISO,
    'Foreign states are a liability. This zone wants trade, not flags, and shoots customs agents as trespassers.');
  h('Anarcho-Capitalist / Private-Law', U, TRAD,
    'Old houses turned their privileges into charters. Blood still helps when you need a court that knows your name.');

  h('Mutual-Aid Network', U, N,
    'People organize through voluntary aid webs, not offices. Nothing is owed upward; a person who stops showing up is just gone, not a criminal.');
  h('Mutual-Aid Network', F, N,
    'Local webs federate for disasters and roads. Federal “officers” are switchboards; they cannot levy.');
  h('Mutual-Aid Network', C, N,
    'Each web is a world. Confederal contact is a rumor mill and a spare parts list.');
  h('Mutual-Aid Network', U, POP,
    'The popular person is the one who shows up with soup. Charisma without labor is embarrassing.');
  h('Mutual-Aid Network', U, REV,
    'The network still thinks the state might return. Caches, codes, and a romantic underground even when nobody is hunting them.');
  h('Mutual-Aid Network', U, ECO,
    'Care includes the land they eat from. A member who poisons a well is dropped, which is the harshest law they have.');
  h('Mutual-Aid Network', U, PART,
    'Everyone who eats attends. Meetings are the culture; people who hate them trade more and talk less.');
  h('Mutual-Aid Network', U, LIB,
    'No one can be bound. Even a disaster pact is exit-at-will, which is why some disasters go badly.');
  h('Mutual-Aid Network', U, ISO,
    'Outside is where the states live. This web prefers bad roads and cousins.');
  h('Mutual-Aid Network', U, TRAD,
    'Kin and custom do the matching. A stranger can join, slowly, by work; there is no form.');

  h('Tribal / Clan Anarchy', U, N,
    'Kin and custom are the law. Clans deal with each other; there is no standing capital, only grounds, grudges, and gatherings.');
  h('Tribal / Clan Anarchy', F, N,
    'Clans federate for war and grazing. A “federal” speaker is a host, not a king, and lasts as long as the guest-right.');
  h('Tribal / Clan Anarchy', C, N,
    'This is already a confederacy of blood. Adding a diet just gives the feuds a calendar.');
  h('Tribal / Clan Anarchy', U, POP,
    'A clan that feeds guests grows. Reputation is the only poll, and it is counted in cattle and funerals.');
  h('Tribal / Clan Anarchy', U, REV,
    'Younger lineages talk about burning the old settlements. Elders call it the same raid with new songs.');
  h('Tribal / Clan Anarchy', U, ECO,
    'Pasture law is older than maps. A well poisoned is a war; a forest cut without leave is a theft of the dead.');
  h('Tribal / Clan Anarchy', U, PART,
    'Every adult of the lineage may speak. Quiet people still lose to loud cousins, which is also custom.');
  h('Tribal / Clan Anarchy', U, LIB,
    'No clan may bind another. Individuals who hate their blood leave and become someone else’s problem.');
  h('Tribal / Clan Anarchy', U, TRAD,
    'This is the thing itself: precedent, insult, marriage, and the right to be avenged.');
  h('Tribal / Clan Anarchy', U, THEO,
    'Ancestors and spirits sit in the gathering. A deal the dead would hate does not hold.');
  h('Tribal / Clan Anarchy', U, ISO,
    'The next valley is already abroad. States beyond that are weather.');
  h('Tribal / Clan Anarchy', U, CHA,
    'One name still rides at the front of every gathering. When that rider falls, the federation is a memory.');

  h('Worker-Syndicate Free Territory', U, N,
    'Workplaces federate and run the territory. There is no civil state above the syndicates — the shop is the town hall.');
  h('Worker-Syndicate Free Territory', F, N,
    'Local federations keep the shops; a territorial federation keeps the rails and the militia. A clerk without a trade is a suspect.');
  h('Worker-Syndicate Free Territory', C, N,
    'Each free territory’s syndicates are sovereign. They trade, they do not merge, and a bad contract is a strike across a border that is also a picket.');
  h('Worker-Syndicate Free Territory', U, POP,
    'Mass meetings can bounce a secretary before lunch. They can also be packed by the dock that sleeps nearest the hall.');
  h('Worker-Syndicate Free Territory', U, REV,
    'The expropriation minutes are still open. “Until the bosses are gone” includes bosses who grew inside the federation.');
  h('Worker-Syndicate Free Territory', U, ECO,
    'Green shops can close a pit. The federation’s civil wars are overtime versus the river.');
  h('Worker-Syndicate Free Territory', U, PART,
    'If you work, you sit. Idle talkers without a card do not get the floor.');
  h('Worker-Syndicate Free Territory', U, LIB,
    'Shops may secede. The free territory is allergic to a center that looks like a ministry, even its own.');
  h('Worker-Syndicate Free Territory', U, ISO,
    'Cheap foreign labor is the old world trying to come back. The dock is closed to flags.');
  h('Worker-Syndicate Free Territory', U, TRAD,
    'Trades are books of families. A new craft has to fight for a seat the way a new clan would.');
}

export function loadZytheraOperating() {
  z('Hive Council / One-Party Elite Rule', U, N,
    'The hive speaks through a council. Individual will is noise; caste and chorus are the politics, and a dissenting drone is a wrong note.');
  z('Hive Council / One-Party Elite Rule', F, N,
    'Sister hives keep local choruses under one council-song. Federalism is harmony: a hive that sings off-key is retuned, not outvoted.');
  z('Hive Council / One-Party Elite Rule', I, N,
    'The council-hive husbands lesser nests as chambers of itself. Outer broods work; they do not sit.');
  z('Caste Oligarchy', U, N,
    'Brood-castes hold fixed ranks. The high castes decide the pattern; the rest secrete it into the world.');
  z('Caste Oligarchy', F, N,
    'Each nest keeps its caste ladder, then sends the highest to a union of high castes. Low castes never travel as speakers.');
  z('Absolute Monarchy / Queen-Rule', U, N,
    'The Queen is the hive. Her court is the only ministry; pheromone and decree are the same sentence.');
  z('Absolute Monarchy / Queen-Rule', F, N,
    'Daughter-queens hold nests and still kneel. A federal hive is a family of thrones with one scent at the top.');
  z('Absolute Monarchy / Queen-Rule', I, N,
    'This is a hive empire. Subject species and lesser nests exist to feed a court they will never smell as equals.');
  z('Hive Collapse / Swarm Anarchy', U, N,
    'The Queen is gone or ignored. The swarm still moves together by habit and hunger, but nothing sits the throne, and that is the terror.');
  z('Hive Collapse / Swarm Anarchy', F, N,
    'Broken nests federate by collision. There is no song, only traffic.');
  z('Hive Collapse / Swarm Anarchy', C, N,
    'Each fragment of swarm is its own weather. Confederal talk is humans trying to name a stampede.');
  z('Theocratic Council', U, N,
    'A sacred brood-college speaks for the divine hive. Doctrine is caste law; unbelief is a molt that does not happen.');
  z('Gerontocracy', U, N,
    'The oldest queens and brood-mothers keep the chairs. Young castes wait through lives that would be careers in a human city.');
  z('Tyranny / Personalist Rule', U, N,
    'One Queen or usurper-brood has made the hive a private body. The chorus exists to say her name.');
  z('Absolute Theocracy', U, N,
    'The Queen is worshipped as the hive’s god. Liturgy and labor are not separate shifts.');
}

loadAnarchyOperating();
loadZytheraOperating();
