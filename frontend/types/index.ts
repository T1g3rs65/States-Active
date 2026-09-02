export interface NationStats {
  gdp: number;
  economy_growth: number;
  unemployment: number;
  inflation: number;
  civil_rights: number;
  freedom_speech: number;
  freedom_press: number;
  freedom_assembly: number;
  freedom_religion: number;
  political_freedom: number;
  voting_rights: number;
  corruption: number;
  political_apathy: number;
  happiness: number;
  life_expectancy: number;
  obesity_rate: number;
  environment: number;
  pollution: number;
  biodiversity: number;
  eco_footprint: number;
  healthcare_quality: number;
  literacy_rate: number;
  university_attendance: number;
  scientific_advancement: number;
  crime_rate: number;
  law_enforcement: number;
  military_strength: number;
  income_equality: number;
  gini_coefficient: number;
  population: number;
  population_growth: number;
  budget_education: number;
  budget_defense: number;
  budget_healthcare: number;
  budget_welfare: number;
  budget_environment: number;
  budget_infrastructure: number;
  budget_other: number;
  national_debt: number;
  tax_rate: number;
  tax_revenue?: number;
  international_approval: number;
  alliance_power: number;
}

// Wheel result shape (GH-93). Mirrors backend/government_wheels.py WheelResult.
export interface WheelResult {
  government_form: string;        // democracy | oligarchy | autocracy
  government_subtype: string;     // e.g. "Parliamentary Democracy"
  territorial_structure: string;  // unitary | federal | confederal
  style_modifier: string;         // e.g. "Technocratic" or "None (clean result)"
}

export interface WheelOption {
  label: string;
  weight: number;
}

export type WheelId = 'form' | 'subtype' | 'territorial' | 'style';

export interface WheelConfig {
  id: WheelId;
  label: string;
  conditional_on?: string; // subtype depends on form
  options: WheelOption[] | Record<string, WheelOption[]>;
}

export interface QuizResultPayload {
  answers: QuizAnswer[];
  nation_name: string;
  motto?: string;
  flag_base64?: string;
  currency?: string;
  national_animal?: string;
  wheel_result?: WheelResult;
}

export interface Nation {
  id?: string;
  _id?: string;
  user_id: string;
  name: string;
  flag_base64?: string;
  /** @deprecated Legacy compass/flavor label kept for compatibility. Do not display. */
  government_type: string;
  /** GH-93 wheel identity — the DISPLAYED government. */
  government_form?: string;
  government_subtype?: string;
  territorial_structure?: string;
  style_modifier?: string;
  form_locked?: boolean;
  legitimacy?: number;
  display_identity?: string;
  display_name?: string;
  motto?: string;
  description: string;
  race?: string;
  world_id?: string;  // Which world this nation belongs to
  needs_capital?: boolean;
  stats: NationStats;
  stats_history: Array<{
    timestamp: string;
    stats: NationStats;
  }>;
  created_at: string;
  last_issue_time?: string;
  total_decisions: number;
  // UI-facing derived / optional fields
  gdp_display?: string;
  gdp_value?: number;
  territory_center_col?: number;
  territory_center_row?: number;
  currency?: string;
  national_animal?: string;
  leader_name?: string;
  leader_sex?: 'male' | 'female' | string;
  dynasty_surname?: string;
  last_description_update?: string;
  co_leader_name?: string;
  diarchy_senior?: number | null;
  territory_counts?: Record<string, number>;
  total_territories?: number;
  resource_counts?: Record<string, number>;
  advisors?: Advisor[];
  last_reform_sent?: string;
  task_used_today?: boolean;
  policies?: Policy[];
  policy_flags?: Record<string, { id: string; label: string; on: boolean; source?: string }>;
  timezone_count?: number | null;
  timezone_geo_max?: number;
  timezone_bands?: number[];
  cities?: { col: number; row: number }[];
}

export interface Advisor {
  slot: number;
  name: string;
  role: string;
  race?: string;
  portrait?: string;
  expertise?: string[];
  ability?: number;
  approval?: number;
  gov_mod?: number;
  gov_mod_pct?: number;
  last_effect?: string;
  role_blurb?: string;
}

export interface IssueChoice {
  text: string;
  effects: Record<string, number>;
  description: string;
  vetoed?: boolean;
}

export interface Issue {
  id?: string;
  _id?: string;
  nation_id: string;
  title: string;
  description: string;
  choices: IssueChoice[];
  generated_at: string;
  resolved: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

export interface QuizAnswer {
  question_id: number;
  answer_index: number;
}

export interface Advisor {
  slot: number;
  name: string;
  role: string;
  race?: string;
  portrait?: string;
  expertise?: string[];
  title?: string;
  ability?: number;
  approval?: number;
  last_task_sent?: string;
  last_reform_sent?: string;
  last_effect?: string;
  role_id?: string;
  role_blurb?: string;
  task_hint?: string;
  trust_known?: number | null;
  trust_known_at?: string | null;
  trust_is_stale?: boolean;
  trust_age_days?: number | null;
}

export interface MultiAlliance {
  _id?: string;
  id?: string;
  name: string;
  tag: string;
  description?: string;
  motto?: string;
  color?: string;
  members?: any[];
  vassals?: any[];
  max_members?: number;
  is_public?: boolean;
  requires_approval?: boolean;
  min_reputation?: number;
  min_population?: number;
  allowed_races?: string[];
  allowed_ideologies?: string[];
  ideology_restrictions?: { allowed?: string[]; banned?: string[] };
  created_at?: string;
  member_count?: number;
}

export interface AllianceInvite {
  _id?: string;
  id?: string;
  alliance_id: string;
  alliance_name: string;
  invited_by_nation_name: string;
  message: string;
  created_at: string;
}

export interface Policy {
  _id?: string;
  id?: string;
  name: string;
  category: string;
  short_description: string;
  news_snippet: string;
  enacted_at: string;
  issue_id?: string;
}

export interface DecisionFeedItem {
  id: string;
  nation_id: string;
  nation_name: string;
  /** @deprecated Legacy compass/flavor label kept for compatibility. Do not display. */
  government_type: string;
  government_subtype?: string;
  display_name?: string;
  race?: string;
  issue_title: string;
  choice_text: string;
  policy_created?: string;
  policy_description?: string;
  stat_changes: Record<string, number>;
  timestamp: string;
  civil_rights: number;
  gdp: number;
  political_freedom: number;
  is_international: boolean;
  // War event properties
  is_war_event?: boolean;
  event_type?: string;
  title?: string;
  description?: string;
  war_id?: string;
  // Faction properties
  faction_id?: string;
  faction_tag?: string;
  faction_color?: string;
}
