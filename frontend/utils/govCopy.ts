/** Wheel-based government display helpers. Legacy enum/DB strings are no longer displayed. */

/** GH-93 wheel identity string. Prefers the backend-built full display name. */
export function wheelIdentity(nation?: {
  display_name?: string | null;
  display_identity?: string | null;
  government_subtype?: string | null;
  territorial_structure?: string | null;
  style_modifier?: string | null;
} | null): string {
  if (!nation) return '';
  if (nation.display_name) return nation.display_name;
  if (nation.display_identity) return nation.display_identity;
  return [
    nation.government_subtype,
    nation.territorial_structure,
    nation.style_modifier && nation.style_modifier !== 'None (clean result)'
      ? nation.style_modifier
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Return a generic wheel-based government blurb. */
export function govBlurb(raw?: string | null): string {
  if (!raw) return '';
  // Wheel subtypes are the new display identity; keep only wheel-relevant blurbs.
  const WHEEL_BLURB: Record<string, string> = {
    'Democracy': 'Power flows from elections and public consent.',
    'Republic': 'Elected representatives govern under a constitution.',
    'Monarchy': 'A hereditary crown holds sovereign authority.',
    'Theocracy': 'Religious law and clerical authority shape the state.',
    'Dictatorship': 'A single ruler or clique holds unchecked power.',
    'Oligarchy': 'A small elite class controls government and economy.',
    'Autocracy': 'One authority rules with minimal constraint.',
    'Corporatocracy': 'Corporate interests dominate public policy.',
    'Technocracy': 'Experts and technical criteria guide decisions.',
    'Anarchy': 'No centralized state; society self-organizes.',
    'Commune': 'Collective ownership and direct participation.',
    'Hive': 'Caste and collective will override individual ambition.',
    'Swarm': 'A decentralized but coordinated collective.',
    'Collective': 'Group decisions bind all members.',
    'Junta': 'Military leaders hold transitional or permanent power.',
    'Military': 'Armed forces oversee civil governance.',
    'Federal': 'Power is divided between central and regional governments.',
    'Unitary': 'A single national government holds primary authority.',
    'Confederation': 'Sovereign regions delegate limited power upward.',
    'Parliamentary': 'The legislature selects and supervises the executive.',
    'Presidential': 'A separate elected president heads the executive.',
    'Direct': 'Citizens vote on policy without intermediaries.',
    'Constitutional': 'Fundamental law limits all branches of government.',
    'Absolute': 'The ruler is not meaningfully bound by law.',
    'Elective': 'Leadership is chosen rather than inherited.',
    'Meritocratic': 'Ability and achievement determine position.',
    'Plutocratic': 'Wealth translates directly into political power.',
    'Socialist': 'Social ownership and equality are explicit goals.',
    'Capitalist': 'Markets and private ownership drive the economy.',
    'Liberal': 'Individual rights and limited government are core principles.',
    'Conservative': 'Tradition, order, and gradual change are emphasized.',
    'Progressive': 'Reform and social improvement are pursued actively.',
    'Nationalist': 'National identity and interest guide policy.',
    'Internationalist': 'Global cooperation takes priority over narrow interest.',
    'Isolationist': 'Foreign entanglement is minimized.',
    'Interventionist': 'The state actively shapes society and abroad.',
    'Laissez-Faire': 'The state interferes as little as possible.',
    'Regulated': 'Markets operate under significant rules.',
    'Planned': 'Central direction coordinates economic activity.',
    'Mixed': 'Public and private sectors share economic responsibility.',
    'Free-Market': 'Private exchange and competition are paramount.',
    'Syndicalist': 'Worker organizations manage industry.',
    'Tribal': 'Kinship and custom organize political life.',
    'Clan': 'Extended families are the basic units of power.',
    'City-State': 'A single urban center is the focus of sovereignty.',
    'Empire': 'A dominant center rules over diverse territories.',
    'Commonwealth': 'Associated peoples share sovereignty voluntarily.',
    'Union': 'Formerly separate polities have merged authority.',
    'Protectorate': 'A stronger power guarantees and influences the state.',
    'Puppet': 'Foreign interests effectively control the government.',
    'Vassal': 'The state owes allegiance and service to a suzerain.',
    'Satrapy': 'A provincial governor rules on behalf of an empire.',
    'Client': 'Independence is limited by dependence on a patron.',
    'Buffer': 'The state exists chiefly between rival powers.',
    'Frontier': 'Borderland conditions shape law and society.',
    'Nomadic': 'The population and government are mobile.',
    'Sedentary': 'Permanent settlement anchors the state.',
    'Maritime': 'Sea trade and naval power define the nation.',
    'Mercantile': 'Trade and commercial profit drive the state.',
    'Agrarian': 'Landed agriculture dominates economy and culture.',
    'Industrial': 'Manufacturing and urban labor define the state.',
    'Post-Industrial': 'Services, technology, and information dominate.',
    'Feudal': 'Lords and vassals hold land in exchange for service.',
    'Bureaucratic': 'Official rules and hierarchy govern daily life.',
    'Pragmatic': 'Practical outcomes outweigh ideology.',
    'Idealistic': 'Principles are pursued even at practical cost.',
    'Populist': 'The people, or their supposed will, are invoked constantly.',
    'Elitist': 'A claimed superior class is trusted to rule.',
    'Secular': 'Religious institutions have no official role.',
    'Religious': 'Faith is central to law and identity.',
    'Multi-Faith': 'Several religions coexist under state neutrality.',
    'Atheist': 'Religion is formally excluded from public life.',
    'Militarist': 'Military values pervade civilian society.',
    'Pacifist': 'Force is rejected as a tool of policy.',
    'Neutral': 'The state avoids alignment in great-power conflicts.',
    'Allied': 'The state is bound to partners by formal obligation.',
    'Satellite': 'The state orbits a stronger power’s interests.',
    'Rump': 'The remnants of a once-larger polity persist.',
    'Exile': 'The government claims authority from outside its homeland.',
    'Revolutionary': 'The regime derives legitimacy from upheaval.',
    'Restoration': 'An older order has been re-established.',
    'Transitional': 'The system is explicitly temporary and reforming.',
    'Provisional': 'An interim government awaits permanent arrangement.',
    'Emergency': 'Crisis powers have suspended normal rules.',
    'Occupied': 'Foreign forces administer the territory.',
    'Mandate': 'An international authority supervises the state.',
    'Trust': 'The state is held in stewardship for future independence.',
    'Condominium': 'Two or more powers share sovereignty.',
    'Free Territory': 'No outside power claims control.',
    'Autonomous': 'Self-governance exists within a larger sovereignty.',
    'Dependent': 'A metropolitan power controls external affairs.',
    'Associated': 'The state is linked to another by treaty, not subjection.',
    'Sovereign': 'The state claims full independent authority.',
    'Personal Union': 'Two states share the same monarch but remain separate.',
    'Dynastic Union': 'Ruling families link otherwise separate realms.',
    'Real Union': 'Separate crowns share institutions.',
    'Composite': 'Multiple historical realms are governed together.',
    'Supranational': 'Authority has been pooled above the national level.',
    'Subnational': 'The unit operates below full sovereignty.',
    'Microstate': 'A very small state survives by niche and diplomacy.',
    'Great Power': 'The state shapes the international system.',
    'Middle Power': 'The state influences regional affairs.',
    'Small Power': 'The state must align to protect its interests.',
  };
  const direct = WHEEL_BLURB[raw];
  if (direct) return direct;
  // Try matching any word in the raw string against wheel blurb keys.
  const words = raw.split(/[^A-Za-z0-9\-]+/);
  for (const word of words) {
    if (WHEEL_BLURB[word]) return WHEEL_BLURB[word];
  }
  return '';
}
