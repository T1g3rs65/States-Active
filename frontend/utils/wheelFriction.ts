/** Plus/minus for every wheel result. Keep in lockstep with backend/wheel_friction.py */

type Entry = { plus: string; minus: string; extract?: number; pollution?: number };

const SUBTYPE: Record<string, Entry> = {
  'Representative Democracy': { plus: 'Laws stick — the chamber can actually pass a budget.', minus: 'Deals take time; a crisis waits on committee.', extract: 1 },
  'Parliamentary Democracy': { plus: 'A cabinet that keeps the house can move fast.', minus: 'Lose the whip and the whole executive falls.', extract: 1 },
  'Presidential Democracy': { plus: 'A separate executive can act while the house argues.', minus: 'Gridlock when palace and chamber disagree.', extract: 1.05 },
  'Democratic Republic': { plus: 'Office is elective and law is supposed to bind it.', minus: 'Virtue talk is slow when someone needs a decision today.', extract: 1, pollution: 0.95 },
  'Direct Democracy': { plus: 'The floor can force a real yes or no.', minus: 'Turnout and mood swing policy overnight.', extract: 0.95, pollution: 0.9 },
  'Consociational Democracy': { plus: 'Rival blocs can share power without a civil war.', minus: 'Every ministry is a quota; nothing is simple.', extract: 0.95 },
  'Deliberative Democracy': { plus: 'Policy that survives the hearing is hard to unwind.', minus: 'Urgency dies in the forum.', extract: 0.9, pollution: 0.85 },
  'One-Party Elite Rule': { plus: 'The party can steer every desk the same way.', minus: 'No loyal opposition — rot hides until it bursts.', extract: 1.1, pollution: 1.15 },
  'Military Junta': { plus: "The marshal's desk actually moves men and metal.", minus: 'Civilian life is a logistics annex.', extract: 1.05, pollution: 1.1 },
  'Plutocracy': { plus: 'Deposits and firms pay — the treasurer is the state.', minus: 'Happiness and equality leak to whoever holds the invoice.', extract: 1.3, pollution: 1.25 },
  'Aristocracy': { plus: 'Old houses keep order without a new election.', minus: 'Talent waits on blood.', extract: 0.95, pollution: 0.9 },
  'Theocratic Council': { plus: 'Doctrine binds the street and the court.', minus: 'Science and heresy share a dock.', extract: 0.9, pollution: 0.85 },
  'Gerontocracy': { plus: 'Precedent holds; panic is unfashionable.', minus: 'The young wait. So does every reform.', extract: 0.9, pollution: 0.9 },
  'Syndicate / Labor Oligarchy': { plus: 'The shop floor can halt a policy — and a strike means something.', minus: 'Idle capital and closed shops choke growth.', extract: 0.95, pollution: 1.05 },
  'Mafiocracy / Criminal Oligarchy': { plus: 'Protection is real if you pay the right crew.', minus: 'Law is a racket; crime is the tax.', extract: 1.1, pollution: 1.1 },
  'Dictatorship': { plus: 'One office can order the map by morning.', minus: "Fear taxes happiness and the diplomat's word.", extract: 1.1, pollution: 1.15 },
  'Absolute Monarchy': { plus: 'The crown is a single throat to shout through.', minus: 'The realm is as wise as one household.', extract: 1 },
  'Tyranny / Personalist Rule': { plus: 'Loyalty to one name can move anything that name wants.', minus: 'No name, no state — institutions are furniture.', extract: 1.05, pollution: 1.1 },
  'Absolute Theocracy': { plus: 'Creed and levy are the same sentence.', minus: 'Unbelief is a crime; labs look like heresy.', extract: 0.85, pollution: 0.8 },
  'Electoral Autocracy': { plus: 'The show of choice soaks unrest without losing the palace.', minus: 'The count is the campaign; legitimacy is paper.', extract: 1.05, pollution: 1.05 },
  'Diarchy / Dual Rule': { plus: 'Two seals can check a tyrant.', minus: 'Two seals can freeze the mail.', extract: 0.95 },
  'Competitive Authoritarian': { plus: 'Opposition can exist — useful steam valve.', minus: 'The refs still belong to the palace.', extract: 1.05, pollution: 1.05 },
  'Illiberal Democracy': { plus: 'A real majority can steamroll.', minus: 'Minorities and courts get bent around the winner.', extract: 1.05, pollution: 1.1 },
  'Military-Managed Democracy': { plus: 'Civilians govern inside a fence that keeps coups rare.', minus: 'The fence can move.', extract: 1.05, pollution: 1.05 },
  'Anarcho-Communist Commune': { plus: 'The hall can share what it has without a taxman.', minus: 'Nobody can levy for a war or a dam.', extract: 0.7, pollution: 0.75 },
  'Warlord / Failed State': { plus: 'Armed bosses can hold a patch.', minus: 'There is no nation, only roadblocks.', extract: 0.65, pollution: 1.2 },
  'Anarcho-Capitalist / Private-Law': { plus: 'Contracts and insurers extract without a ministry.', minus: 'No public law — the poor are a coverage gap.', extract: 1.25, pollution: 1.3 },
  'Mutual-Aid Network': { plus: 'Care shows up without an office.', minus: 'Disasters that need a levy go badly.', extract: 0.75, pollution: 0.7 },
  'Tribal / Clan Anarchy': { plus: 'Custom holds kin together without a capital.', minus: 'Feud is the foreign policy.', extract: 0.8, pollution: 0.8 },
  'Worker-Syndicate Free Territory': { plus: 'The shop is the town hall — labor actually runs the map.', minus: 'A clerk without a trade is a suspect, and capital flees.', extract: 0.9, pollution: 1.05 },
  'Hive Council / One-Party Elite Rule': { plus: 'The chorus can retune every nest the same morning.', minus: 'A wrong note is not debate; it is error.', extract: 1.15, pollution: 1.1 },
  'Caste Oligarchy': { plus: 'Ranks keep the comb from collapsing into argument.', minus: 'Low castes never sit. Talent molts in place.', extract: 1.05 },
  'Absolute Monarchy / Queen-Rule': { plus: 'The Queen is a single scent — decree and hive are one.', minus: 'The hive is as wise as one court.', extract: 1.05 },
  'Hive Collapse / Swarm Anarchy': { plus: 'The swarm still moves — hunger is a kind of government.', minus: 'Nothing sits the throne. There is no levy, only traffic.', extract: 0.55, pollution: 1.15 },
};

const TERRITORIAL: Record<string, Entry> = {
  unitary: { plus: 'One law, one chain — policy hits the whole map.', minus: 'No provincial shock absorber; a bad center hits everyone.', extract: 1.05, pollution: 1.05 },
  federal: { plus: 'States can try a policy without burning the union.', minus: 'Two stacks of paper; the last mile stalls.', extract: 1, pollution: 0.95 },
  confederal: { plus: 'Members actually govern — local culture and works thrive without a capital steamrolling them.', minus: 'The diet cannot levy an army or a real foreign policy.', extract: 1.05, pollution: 0.9 },
  'federacy / asymmetrical federation': { plus: 'A special region can be bargained, not crushed.', minus: 'Equality before the charter is a slogan with a hole.', extract: 1 },
  'imperial / hegemonic': { plus: 'The core can draw tribute and men from the marches.', minus: 'The marches do not love you; occupation costs mood abroad.', extract: 1.2, pollution: 1.2 },
};

const STYLE: Record<string, Entry> = {
  'None (clean result)': { plus: 'No extra faction sitting on the machine.', minus: 'No style bonus either — you are only what the other wheels said.', extract: 1 },
  None: { plus: 'No extra faction sitting on the machine.', minus: 'No style bonus either — you are only what the other wheels said.', extract: 1 },
  'Constitutional / Limited': { plus: 'A charter can kill a majority that goes too far.', minus: 'Urgency loses to a clause.', extract: 0.95, pollution: 0.95 },
  Populist: { plus: 'The street can be turned into turnout and mood.', minus: 'Quiet evidence looks like elitism; experts get shouted down.', extract: 1, pollution: 1.05 },
  'Military-Influenced': { plus: 'Officers keep the powder dry.', minus: 'Civilian files wait on the mess.', extract: 1.05, pollution: 1.05 },
  'Paternalist / Welfare-First': { plus: 'Clinics and stipends actually land.', minus: 'The dole is a leash; debt creeps.', extract: 0.95, pollution: 0.9 },
  'Traditional / Hereditary': { plus: 'Custom holds when law is thin.', minus: 'New blood and new science wait at the door.', extract: 0.9, pollution: 0.9 },
  'Theocratic Influence': { plus: 'Pulpits can bless a hard law and make it stick.', minus: 'The lab and the foreign desk walk on eggshells.', extract: 0.9, pollution: 0.85 },
  Technocratic: { plus: 'The numbers outrank the faction — plans actually run.', minus: 'The street does not love a spreadsheet.', extract: 1.1, pollution: 0.95 },
  'Revolutionary / Provisional': { plus: 'Emergency can still expropriate and found.', minus: 'Nothing feels finished; investment hates the calendar.', extract: 0.9, pollution: 1.1 },
  'Corporate / Business Elite': { plus: 'Firms extract and build without waiting on a ministry.', minus: 'The flag is letterhead; the poor are a line item.', extract: 1.28, pollution: 1.22 },
  Bureaucratic: { plus: 'Paper trails survive a bad minister.', minus: 'Nothing moves without the form.', extract: 0.95, pollution: 0.95 },
  'Ecological / Green-Influenced': { plus: 'Land and water can overrule a mill.', minus: 'Dirty deposits pay less; growth coughs.', extract: 0.75, pollution: 0.65 },
  Meritocratic: { plus: 'Exams fill the serious desks.', minus: 'The unexamined street feels locked out.', extract: 1.05, pollution: 0.95 },
  'Charismatic Leader Focus': { plus: 'One name can swing the country.', minus: 'When the name dies, so does the following.', extract: 1 },
  'Praetorian / Security-State': { plus: 'Inner troops can unmake a plot overnight.', minus: 'The same troops can unmake a government.', extract: 1, pollution: 1.05 },
  'Libertarian / Minimal-State': { plus: 'New agencies die; people keep more of what they make.', minus: 'The thin state cannot run a war or a clinic well.', extract: 1.1, pollution: 1.15 },
  'Participatory / Deliberative': { plus: 'Ordinary people are in the room between elections.', minus: 'Politics becomes a second job; experts wait.', extract: 0.95, pollution: 0.9 },
  Isolationist: { plus: 'Foreign entanglement dies; the border is a policy.', minus: "The diplomat's desk is a coat rack; trade and approval suffer.", extract: 0.9, pollution: 0.95 },
};

function pick(table: Record<string, Entry>, key?: string | null): Entry | null {
  if (!key) return null;
  return table[key] || null;
}

export function govFrictionRows(nation?: {
  government_subtype?: string | null;
  territorial_structure?: string | null;
  style_modifier?: string | null;
} | null): { label: string; plus: string; minus: string }[] {
  if (!nation) return [];
  const rows: { label: string; plus: string; minus: string }[] = [];
  const add = (key: string, label: string) => {
    const p = PLAY[key];
    if (p?.plus && p?.minus) rows.push({ label, plus: p.plus, minus: p.minus });
  };
  if (nation.government_subtype) add(nation.government_subtype, nation.government_subtype);
  add(nation.territorial_structure || 'unitary', nation.territorial_structure || 'unitary');
  const styleKey = nation.style_modifier || 'None (clean result)';
  if (styleKey !== 'None (clean result)' && styleKey !== 'None') {
    add(styleKey, styleKey);
  }
  return rows;
}

export function industryExtractMult(nation?: {
  government_subtype?: string | null;
  territorial_structure?: string | null;
  style_modifier?: string | null;
} | null): number {
  let m = 1;
  for (const e of [
    pick(SUBTYPE, nation?.government_subtype),
    pick(TERRITORIAL, nation?.territorial_structure || 'unitary'),
    pick(STYLE, nation?.style_modifier || 'None (clean result)'),
  ]) {
    if (e?.extract) m *= e.extract;
  }
  return Math.max(0.55, Math.min(1.5, m));
}

const PLAY: Record<string, { plus: string; minus: string }> = {
  'Representative Democracy': {
    plus: 'First minister and treasurer desks stronger each day.',
    minus: 'Marshal weaker. Issues lean elections and bills — not only those.',
  },
  'Parliamentary Democracy': {
    plus: 'First minister and diplomat stronger each day.',
    minus: 'Marshal weaker. Issues lean confidence votes and coalitions.',
  },
  'Presidential Democracy': {
    plus: 'First minister and spy stronger. Deposits pay a bit more.',
    minus: 'Diplomat weaker. Issues lean vetoes and split government.',
  },
  'Democratic Republic': {
    plus: 'Culture stronger. Slightly less mine pollution.',
    minus: 'Marshal weaker. Issues lean civic duty and trials.',
  },
  'Direct Democracy': {
    plus: 'Culture much stronger each day.',
    minus: 'First minister and treasurer weaker. Deposits pay a little less.',
  },
  'Consociational Democracy': {
    plus: 'Diplomat stronger each day.',
    minus: 'First minister weaker. Issues lean quotas and communal vetoes.',
  },
  'Deliberative Democracy': {
    plus: 'Scientist and culture stronger. Cleaner industry.',
    minus: 'Marshal weaker. Slower extraction. Issues lean hearings and delay.',
  },
  'One-Party Elite Rule': {
    plus: 'First minister and spy stronger. Mines pay extra GDP.',
    minus: 'Culture and diplomat weaker. Extra pollution. Issues lean party and purges.',
  },
  'Military Junta': {
    plus: 'Marshal much stronger, builder up. Fuel/iron add a little military.',
    minus: 'Culture and diplomat down. Issues lean curfew and conscription.',
  },
  'Plutocracy': {
    plus: 'Treasurer and builder much stronger. Deposits pay a lot more GDP.',
    minus: 'Culture weaker. A lot more pollution. Issues lean combines and strikes.',
  },
  'Aristocracy': {
    plus: 'First minister and culture up.',
    minus: 'Scientist and builder down. Issues lean blood and dues.',
  },
  'Theocratic Council': {
    plus: 'Culture and spy stronger. Cleaner, thinner extraction.',
    minus: 'Scientist much weaker. Issues lean canon and blasphemy.',
  },
  'Gerontocracy': {
    plus: 'Treasurer a bit stronger each day.',
    minus: 'Scientist and builder down. Issues lean delay and youth unrest.',
  },
  'Syndicate / Labor Oligarchy': {
    plus: 'Culture and builder up.',
    minus: 'Treasurer down. Issues lean strikes and closed shops.',
  },
  'Mafiocracy / Criminal Oligarchy': {
    plus: 'Spy and treasurer up. Deposits still pay.',
    minus: 'Diplomat down. Issues lean tribute and crews.',
  },
  'Dictatorship': {
    plus: 'Marshal and spy stronger. Mines/fuel help GDP and a little military.',
    minus: 'Culture and diplomat weaker. Extra pollution.',
  },
  'Absolute Monarchy': {
    plus: 'First minister and culture up.',
    minus: 'Scientist a bit down. Issues lean court and succession.',
  },
  'Tyranny / Personalist Rule': {
    plus: 'Spy and marshal up.',
    minus: 'First minister and treasurer down. Issues lean favorites and purges.',
  },
  'Absolute Theocracy': {
    plus: 'Culture much stronger.',
    minus: 'Scientist much weaker. Less extraction. Issues lean inquisition.',
  },
  'Electoral Autocracy': {
    plus: 'Culture and spy up.',
    minus: 'Diplomat down. Issues lean rigged counts.',
  },
  'Diarchy / Dual Rule': {
    plus: 'Diplomat a bit stronger (two courts to talk to).',
    minus: 'First minister weaker — deadlock. Issues lean two chairs.',
  },
  'Competitive Authoritarian': {
    plus: 'Spy stronger.',
    minus: 'Diplomat weaker. Issues lean managed opposition.',
  },
  'Illiberal Democracy': {
    plus: 'First minister, culture, and spy up.',
    minus: 'Diplomat down. Issues lean majority will and the press.',
  },
  'Military-Managed Democracy': {
    plus: 'Marshal much stronger. Fuel helps the army.',
    minus: 'First minister and culture down. Issues lean garrison veto.',
  },
  'Anarcho-Communist Commune': {
    plus: 'Culture up.',
    minus: 'Builder, treasurer, marshal down. Deposits barely pay national GDP.',
  },
  'Warlord / Failed State': {
    plus: 'Marshal and spy up.',
    minus: 'First minister, treasurer, diplomat gutted. Extraction is loot.',
  },
  'Anarcho-Capitalist / Private-Law': {
    plus: 'Treasurer and builder up. Deposits pay hard.',
    minus: 'Culture down. Pollution hard. Issues lean charters and exit fees.',
  },
  'Mutual-Aid Network': {
    plus: 'Culture up.',
    minus: 'Builder, treasurer, marshal down. Weak national extraction.',
  },
  'Tribal / Clan Anarchy': {
    plus: 'Culture up.',
    minus: 'Diplomat down. Issues lean feud and guest-right.',
  },
  'Worker-Syndicate Free Territory': {
    plus: 'Builder and culture up.',
    minus: 'Treasurer down. Issues lean pickets.',
  },
  'Hive Council / One-Party Elite Rule': {
    plus: 'First minister and spy stronger. Hive industry extracts more.',
    minus: 'Culture weaker. Issues lean retuning and dissent as noise.',
  },
  'Caste Oligarchy': {
    plus: 'First minister and marshal up.',
    minus: 'Scientist down. Issues lean rungs and molt-law.',
  },
  'Absolute Monarchy / Queen-Rule': {
    plus: 'First minister and culture up. A little extra from deposits.',
    minus: 'Scientist down. Issues lean edict and court.',
  },
  'Hive Collapse / Swarm Anarchy': {
    plus: 'Marshal still ticks — hunger is a kind of government.',
    minus: 'Civil desks gutted. Extraction is hunger. Issues lean missing Queen.',
  },
  unitary: {
    plus: 'First minister stronger. Deposits pay a bit more (one policy, whole map).',
    minus: 'Culture weaker. A bit more pollution — a bad center hits everyone.',
  },
  federal: {
    plus: 'Builder and diplomat a bit stronger.',
    minus: 'First minister a bit weaker. Issues lean state vs union.',
  },
  confederal: {
    plus: 'Culture and builder stronger. Local deposits still pay. A bit less pollution.',
    minus: 'Marshal and diplomat weaker — no confederal army or foreign levy.',
  },
  'federacy / asymmetrical federation': {
    plus: 'Diplomat a bit stronger.',
    minus: 'First minister a bit weaker. Issues lean side letters.',
  },
  'imperial / hegemonic': {
    plus: 'Marshal and treasurer stronger. Marches add GDP and a little military.',
    minus: 'Diplomat much weaker. Extra pollution. Issues lean tribute.',
  },
  'Constitutional / Limited': {
    plus: 'Spy and scientist a bit stronger.',
    minus: 'First minister slower. Slightly less extraction.',
  },
  Populist: {
    plus: 'Culture much stronger each day.',
    minus: 'Scientist weaker. Issues lean rallies.',
  },
  'Military-Influenced': {
    plus: 'Marshal stronger. Fuel helps the army.',
    minus: 'Culture weaker. Issues lean the garrison.',
  },
  'Paternalist / Welfare-First': {
    plus: 'Culture and builder up.',
    minus: 'Treasurer down (the dole costs).',
  },
  'Traditional / Hereditary': {
    plus: 'Culture up.',
    minus: 'Scientist down. Less extraction.',
  },
  'Theocratic Influence': {
    plus: 'Culture up. Cleaner industry.',
    minus: 'Scientist and diplomat down. Thinner extraction.',
  },
  Technocratic: {
    plus: 'Scientist and builder much stronger. Deposits run more efficiently.',
    minus: 'Culture weaker.',
  },
  'Revolutionary / Provisional': {
    plus: 'Marshal and culture up.',
    minus: 'Treasurer down. Jumpy extraction. Extra pollution.',
  },
  'Corporate / Business Elite': {
    plus: 'Treasurer and builder much stronger. Deposits pay a lot more.',
    minus: 'Culture weaker. A lot more pollution.',
  },
  Bureaucratic: {
    plus: 'Treasurer a bit stronger.',
    minus: 'Builder and marshal slower.',
  },
  'Ecological / Green-Influenced': {
    plus: 'Builder and scientist up. Dirty deposits pollute much less.',
    minus: 'Dirty deposits pay much less GDP.',
  },
  Meritocratic: {
    plus: 'Scientist and first minister up.',
    minus: 'Culture down.',
  },
  'Charismatic Leader Focus': {
    plus: 'Culture and first minister up.',
    minus: 'Treasurer and builder a bit down.',
  },
  'Praetorian / Security-State': {
    plus: 'Spy and marshal much stronger.',
    minus: 'Culture weaker. Issues lean checkpoints.',
  },
  'Libertarian / Minimal-State': {
    plus: 'Treasurer a bit up. Deposits pay more (thin state, fat firms).',
    minus: 'Marshal and builder weaker. More pollution if they dig.',
  },
  'Participatory / Deliberative': {
    plus: 'Culture up.',
    minus: 'First minister and marshal down.',
  },
  Isolationist: {
    plus: 'Spy and marshal a bit up.',
    minus: 'Diplomat much weaker. Less trade GDP.',
  },
};
