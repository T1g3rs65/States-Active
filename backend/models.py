# War System Models at end of file will be added
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

class GovernmentType(str, Enum):
    # Original Core Types
    LEFT_WING_UTOPIA = "Left-Wing Utopia"
    SCANDINAVIAN_PARADISE = "Scandinavian Liberal Paradise"
    DEMOCRATIC_SOCIALISTS = "Democratic Socialists"
    LIBERAL_DEMOCRACY = "Liberal Democratic Paradise"
    CAPITALIST_PARADISE = "Capitalist Paradise"
    CORPORATE_POLICE_STATE = "Corporate Police State"
    RIGHT_WING_UTOPIA = "Right-Wing Utopia"
    AUTHORITARIAN_DEMOCRACY = "Authoritarian Democracy"
    BENEVOLENT_DICTATORSHIP = "Benevolent Dictatorship"
    IRON_FIST_CONSUMERISTS = "Iron Fist Consumerists"
    MORALISTIC_DEMOCRACY = "Moralistic Democracy"
    PSYCHOTIC_DICTATORSHIP = "Psychotic Dictatorship"
    ANARCHY = "Anarchy"
    FATHER_KNOWS_BEST_STATE = "Father Knows Best State"
    
    # Economic Spectrum
    ECO_SOCIALIST_HAVEN = "Eco-Socialist Haven"
    WELFARE_PARADISE = "Welfare Paradise"
    LAISSEZ_FAIRE_DYNAMO = "Laissez-Faire Dynamo"
    TECH_OLIGARCHY = "Tech Oligarchy"
    TRADE_EMPIRE = "Trade Empire"
    
    # Socialist Variants (low economy, varying freedoms)
    SOCIALIST_REPUBLIC = "Socialist Republic"  # Moderate freedoms, socialist economy
    PEOPLES_REPUBLIC = "People's Republic"  # Low freedoms, socialist economy
    
    # Authoritarian Variants
    SURVEILLANCE_PANOPTICON = "Surveillance Panopticon"
    THEOCRATIC_ENFORCERS = "Theocratic Enforcers"
    MARTIAL_COMMAND = "Martial Command"
    
    # Libertarian Variants
    SEASTEAD_REPUBLIC = "Seastead Republic"
    PSYCHEDELIC_FREE_STATE = "Psychedelic Free State"
    
    # Balanced/Centrist
    PRAGMATIC_MERITOCRACY = "Pragmatic Meritocracy"
    TECHNOCRATIC_SYNDICATE = "Technocratic Syndicate"
    INOFFENSIVE_CENTRIST_DEMOCRACY = "Inoffensive Centrist Democracy"
    
    # Additional NationStates Types
    CIVIL_RIGHTS_LOVEFEST = "Civil Rights Lovefest"
    CORPORATE_BORDELLO = "Corporate Bordello"
    CORRUPT_DICTATORSHIP = "Corrupt Dictatorship"
    FREE_MARKET_PARADISE = "Free-Market Paradise"
    CYBERPUNK_MEGACITY = "Cyberpunk Megacity"
    PIRATE_HAVEN = "Pirate Haven"
    
    # ============== ZYTHERA HIVE GOVERNMENT TYPES ==============
    # All Zythera governments are led by a Queen, but vary in structure
    
    # Authoritarian Left (Collective/Communist)
    COLLECTIVE_HIVE = "Collective Hive"  # All resources shared equally, Queen as benevolent mother
    WORKERS_SWARM = "Worker's Swarm"  # Workers have equality, production for all
    
    # Authoritarian Right (Traditional/Hierarchical)
    ROYAL_HIVE = "Royal Hive"  # Traditional absolute monarchy, strict caste system
    IMPERIAL_SWARM = "Imperial Swarm"  # Expansionist empire, military conquest focused
    DIVINE_HIVE = "Divine Hive"  # Queen worshipped as goddess, theocratic
    
    # Authoritarian Center
    MILITANT_HIVE = "Militant Hive"  # Military-focused, warrior caste dominant
    ORDERED_COLONY = "Ordered Colony"  # Strict but efficient bureaucratic hive
    
    # Libertarian Left (Cooperative/Communal)
    SYMBIOTIC_SWARM = "Symbiotic Swarm"  # Individual Zythera have autonomy, cooperative
    NURTURING_HIVE = "Nurturing Hive"  # Focus on care, wellbeing, environmental harmony
    
    # Libertarian Right (Free Market/Individual)
    MERCHANT_HIVE = "Merchant Hive"  # Trade-focused, individual enterprise encouraged
    TECHNO_SWARM = "Techno-Swarm"  # Innovation-driven, tech meritocracy under Queen
    
    # Libertarian Center
    HARMONIOUS_HIVE = "Harmonious Hive"  # Balance of freedom and order, peaceful
    FREE_COLONY = "Free Colony"  # Maximum individual freedom, minimal Queen intervention
    
    # Center (Balanced)
    BALANCED_HIVE = "Balanced Hive"  # Centrist approach, pragmatic governance
    DIPLOMATIC_SWARM = "Diplomatic Swarm"  # Focus on diplomacy and cooperation with other species
    
    # Extreme/Unusual
    PARASITIC_HIVE = "Parasitic Hive"  # Exploitative, extractive economy
    HIVEMIND_COLLECTIVE = "Hivemind Collective"  # Telepathic unity, individual identity minimal
    SPLINTER_COLONY = "Splinter Colony"  # Anarchic, multiple competing queens

class NationStats(BaseModel):
    # Economy (0-100)
    gdp: float = 20.0  # GDP per capita (lowered from 50)
    economy_growth: float = 2.0  # Growth rate percentage
    unemployment: float = 5.0  # Unemployment percentage
    inflation: float = 2.0  # Inflation rate percentage
    
    # Civil Rights (0-100)
    civil_rights: float = 50.0  # Overall civil rights score
    freedom_speech: float = 50.0
    freedom_press: float = 50.0
    freedom_assembly: float = 50.0
    freedom_religion: float = 50.0
    
    # Political Freedoms (0-100)
    political_freedom: float = 50.0
    voting_rights: float = 50.0
    corruption: float = 50.0  # Lower is better
    political_apathy: float = 50.0  # Lower is better
    
    # Social
    happiness: float = 50.0  # Quality of life index
    life_expectancy: float = 75.0  # Years
    obesity_rate: float = 20.0  # Percentage
    
    # Environment (0-100, higher is better)
    environment: float = 50.0
    pollution: float = 50.0  # Lower is better
    biodiversity: float = 50.0
    eco_footprint: float = 50.0  # Lower is better
    
    # Health & Education
    healthcare_quality: float = 50.0
    literacy_rate: float = 95.0  # Percentage
    university_attendance: float = 30.0  # Percentage
    scientific_advancement: float = 50.0
    
    # Crime & Law
    crime_rate: float = 5.0  # Per 1000 people
    law_enforcement: float = 50.0
    
    # Military
    military_strength: float = 20.0  # Lowered from 50
    
    # Equality
    income_equality: float = 50.0  # Higher is more equal
    gini_coefficient: float = 0.35  # 0-1, lower is more equal
    
    # Population (in thousands)
    population: float = 2.5  # In thousands (2.5k people = small village-state, range 1-5k)
    population_growth: float = 1.0  # Percentage per year
    
    # Budget (percentages, should sum to ~100)
    budget_education: float = 15.0
    budget_defense: float = 10.0
    budget_healthcare: float = 20.0
    budget_welfare: float = 15.0
    budget_environment: float = 5.0
    budget_infrastructure: float = 20.0
    budget_other: float = 15.0
    
    # Finance
    national_debt: float = 40.0  # Percentage of GDP
    tax_rate: float = 25.0  # Average tax rate percentage
    
    # International
    international_approval: float = 50.0  # 0-100
    alliance_power: float = 0.0  # Based on alliances

class StatsSnapshot(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    stats: NationStats

class Policy(BaseModel):
    name: str  # e.g., "Nuclear Power Banned"
    category: str  # e.g., "Energy", "Civil Rights", "Economy"
    short_description: str  # Brief policy description
    news_snippet: str  # AI-generated news digest style description
    enacted_at: datetime = Field(default_factory=datetime.utcnow)
    issue_id: Optional[str] = None  # Which issue created this policy

class Advisor(BaseModel):
    slot: int  # 1-8
    title: str  # Changes with government type
    name: str  # Procedurally generated
    approval: int = 50  # 0-100
    ability: int = 50  # 0-100, visible to player - how good they are at their job
    trustworthiness: int = 50  # 0-100, hidden - affects chance of betrayal/corruption
    last_task_sent: Optional[datetime] = None  # When last regular task was sent (1-day cooldown)
    last_reform_sent: Optional[datetime] = None  # When last reform task was sent (7-day cooldown)

class DecisionFeedItem(BaseModel):
    id: Optional[str] = None
    nation_id: str
    nation_name: str
    race: str = "human"  # Race ID for theme colors
    government_type: str
    issue_title: str
    choice_text: str
    policy_created: Optional[str] = None  # Policy name if one was created
    policy_description: Optional[str] = None  # Full policy description
    stat_changes: Dict[str, float] = {}  # Key stat changes
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    # World-specific
    world_id: Optional[str] = None  # Which world this decision is from
    # For political theme colors (deprecated - using race colors now)
    civil_rights: float = 50.0
    gdp: float = 50.0
    political_freedom: float = 50.0
    # For breaking news detection
    is_international: bool = False

class Nation(BaseModel):
    id: Optional[str] = None
    user_id: str
    name: str
    race: str = "human"  # Race ID from races.json
    flag_base64: Optional[str] = None  # Base64 encoded flag image
    government_type: GovernmentType
    motto: Optional[str] = None
    description: str = "A newly formed nation finding its way in the world."
    currency: str = "Dollar"  # National currency name
    national_animal: str = "Eagle"  # National animal
    
    # World assignment
    world_id: Optional[str] = None  # Which world this nation belongs to
    
    # Current stats
    stats: NationStats
    
    # Historical stats for graphs
    stats_history: List[StatsSnapshot] = Field(default_factory=list)
    
    # Policies - major decisions that define the nation
    policies: List[Policy] = Field(default_factory=list)
    
    # Advisors - 8 permanent cabinet positions
    advisors: List[Advisor] = Field(default_factory=list)
    
    # Territory on world map
    territory_center_col: int = 0  # X position on map
    territory_center_row: int = 0  # Y position on map
    
    # Territory counts by biome type (for industry system)
    territory_counts: Dict[str, int] = Field(default_factory=dict)
    total_territories: int = 0
    
    # Reform cooldown (nation-level, 7-day)
    last_reform_sent: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_issue_time: Optional[datetime] = None
    total_decisions: int = 0
    
class IssueChoice(BaseModel):
    text: str
    effects: Dict[str, float]  # stat_name -> change amount
    description: str  # What happens if you choose this

class Issue(BaseModel):
    id: Optional[str] = None
    nation_id: str
    title: str
    description: str
    choices: List[IssueChoice]
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    chosen_index: Optional[int] = None

class Decision(BaseModel):
    id: Optional[str] = None
    nation_id: str
    issue_id: str
    choice_index: int
    stat_changes: Dict[str, float]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class QuizAnswer(BaseModel):
    question_id: int
    answer_index: int

class QuizResult(BaseModel):
    answers: List[QuizAnswer]
    nation_name: str
    motto: Optional[str] = None
    flag_base64: Optional[str] = None
    currency: Optional[str] = "Credits"  # Default currency
    national_animal: Optional[str] = "Eagle"  # Default national animal
    advisors: List[Advisor] = []  # 8 permanent cabinet positions

class CreateNationRequest(BaseModel):
    user_id: str
    quiz_result: QuizResult
    race: str = "human"  # Race ID from races.json
    world_id: Optional[str] = None  # World to join (optional)

class SubmitDecisionRequest(BaseModel):
    nation_id: str
    issue_id: str
    choice_index: int

class UpdateFlagRequest(BaseModel):
    flag_base64: str

class RankingEntry(BaseModel):
    nation_id: str
    nation_name: str
    race: str = "human"  # Race ID for theme colors
    flag_base64: Optional[str]
    government_type: str
    stat_value: float
    rank: int



# ============== Multiplayer Server Models ==============

class ServerVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"

class GameServer(BaseModel):
    """Represents a self-hosted game server registered with the master server."""
    id: Optional[str] = None
    
    # Server Identity
    name: str
    description: str = ""
    world_seed: int = 123456
    
    # Server Settings
    max_players: int = 50
    visibility: ServerVisibility = ServerVisibility.PUBLIC
    password_hash: Optional[str] = None  # For password-protected servers
    allow_migration: bool = True  # Whether nations can migrate TO this server
    
    # Server Connection
    host_url: str  # Full URL to the server (e.g., "https://myserver.com:8001")
    admin_token: str  # Secret token for admin operations
    
    # Server Status
    is_online: bool = True
    player_count: int = 0
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"  # Server version for compatibility

class ServerRegistrationRequest(BaseModel):
    """Request to register a server with the master server."""
    name: str
    description: str = ""
    world_seed: int = 123456
    max_players: int = 50
    visibility: str = "public"  # "public" or "private"
    host_url: str
    admin_token: str
    password: Optional[str] = None  # Optional password for joining
    allow_migration: bool = True  # Whether to accept migrated nations
    version: str = "1.0.0"

class ServerHeartbeatRequest(BaseModel):
    """Heartbeat to keep server registration alive."""
    admin_token: str
    player_count: int = 0
    is_online: bool = True

class ServerInfoResponse(BaseModel):
    """Public info about a game server."""
    id: str
    name: str
    description: str
    world_seed: int
    max_players: int
    player_count: int
    visibility: str
    is_online: bool
    is_password_protected: bool
    allow_migration: bool = True
    version: str
    created_at: datetime

class ServerListResponse(BaseModel):
    """List of available public servers."""
    servers: List[ServerInfoResponse]
    total: int

class JoinServerRequest(BaseModel):
    """Request to join a server."""
    server_id: str
    user_id: str
    password: Optional[str] = None  # Required if server is password-protected

class ServerConfig(BaseModel):
    """Local server configuration (for self-hosted servers)."""
    server_name: str = "My Nation Server"
    server_description: str = "A SovereignHex game server"
    world_seed: int = 123456
    max_players: int = 50
    visibility: str = "public"
    password: Optional[str] = None
    master_server_url: Optional[str] = "https://nation-sim.example.com"  # URL to register with
    admin_token: str = ""  # Generated on first run


class NationExportData(BaseModel):
    """Exported nation data for migration between servers."""
    # Core identity
    name: str
    government_type: str
    motto: Optional[str] = None
    description: str = ""
    currency: str = "Dollar"
    national_animal: str = "Eagle"
    flag_base64: Optional[str] = None
    
    # Stats
    stats: NationStats
    
    # Policies and advisors
    policies: List[Policy] = []
    advisors: List[Advisor] = []
    
    # Metadata
    total_decisions: int = 0
    created_at: datetime
    exported_at: datetime = Field(default_factory=datetime.utcnow)
    source_server: Optional[str] = None  # URL of the server it came from

class MigrationRequest(BaseModel):
    """Request to migrate a nation to another server."""
    nation_id: str
    target_server_url: str
    target_server_password: Optional[str] = None  # If target server is password protected

class ImportNationRequest(BaseModel):
    """Request to import a nation from another server."""
    user_id: str
    nation_data: NationExportData
    source_server_url: str


# ============== International Vote System ==============

class VoteType(str, Enum):
    PRAISE = "praise"
    CONDEMN = "condemn"
    NEUTRAL = "neutral"

class VoteSponsor(BaseModel):
    """A sponsor for a vote option (first to vote that way)."""
    nation_id: str
    nation_name: str
    statement: str  # The statement they wrote for others to support
    sponsored_at: datetime = Field(default_factory=datetime.utcnow)

class VoteRecord(BaseModel):
    """Individual vote cast by a nation."""
    nation_id: str
    nation_name: str
    vote_type: VoteType
    voted_at: datetime = Field(default_factory=datetime.utcnow)

class InternationalVote(BaseModel):
    """A vote on a decision with international impact."""
    id: Optional[str] = None
    
    # The decision that triggered this vote
    decision_id: str
    decision_summary: str  # Brief description of what was decided
    
    # The nation that made the decision
    source_nation_id: str
    source_nation_name: str
    source_nation_flag: Optional[str] = None
    
    # Sponsors (first to vote each way)
    praise_sponsor: Optional[VoteSponsor] = None
    condemn_sponsor: Optional[VoteSponsor] = None
    
    # Vote tallies
    praise_count: int = 0
    condemn_count: int = 0
    neutral_count: int = 0
    
    # Individual votes
    votes: List[VoteRecord] = []
    
    # Timing
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ends_at: datetime  # 24 hours after creation
    
    # Status
    is_active: bool = True
    outcome: Optional[str] = None  # "praised", "condemned", "neutral" after vote ends
    outcome_processed: bool = False  # Whether the resulting issue has been generated

class CastVoteRequest(BaseModel):
    """Request to cast a vote."""
    nation_id: str
    nation_name: str
    vote_type: str  # "praise", "condemn", "neutral"
    sponsor_statement: Optional[str] = None  # Only needed if becoming a sponsor

class ChainEvent(BaseModel):
    """An event that triggers issues for other nations based on a decision."""
    id: Optional[str] = None
    
    # Source decision
    source_decision_id: str
    source_nation_id: str
    source_nation_name: str
    trigger_action: str  # What the nation did (e.g., "banned imports", "declared war")
    
    # Target nations
    affected_nation_ids: List[str] = []  # Which nations get the chain issue
    
    # Issue to generate
    issue_template: str  # Template for the issue title
    issue_context: str  # Context for AI to generate the issue
    
    # Status
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed: bool = False

# ============== Alliance System ==============

class AllianceStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class AllianceRequest(BaseModel):
    """A request to form an alliance between two nations."""
    id: Optional[str] = None
    
    # Requester
    from_nation_id: str
    from_nation_name: str
    from_nation_flag: Optional[str] = None
    
    # Target
    to_nation_id: str
    to_nation_name: str
    
    # Request details
    message: str = ""  # Optional message with the request
    status: AllianceStatus = AllianceStatus.PENDING
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None

class Alliance(BaseModel):
    """An active alliance between two nations."""
    id: Optional[str] = None
    
    # World assignment
    world_id: Optional[str] = None  # Which world this alliance belongs to
    
    # Allied nations (stored as a pair)
    nation1_id: str
    nation1_name: str
    nation2_id: str
    nation2_name: str
    
    # Alliance details
    formed_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class SendAllianceRequest(BaseModel):
    """Request to send an alliance invitation."""
    from_nation_id: str
    from_nation_name: str
    from_nation_flag: Optional[str] = None
    to_nation_id: str
    message: str = ""

class RespondAllianceRequest(BaseModel):
    """Request to accept or reject an alliance."""
    request_id: str
    accept: bool

# ============== Multi-Nation Alliance System ==============

class AllianceRole(str, Enum):
    """Role within a multi-nation alliance."""
    FOUNDER = "founder"      # Created the alliance, full control
    LEADER = "leader"        # Can invite, kick, manage
    OFFICER = "officer"      # Can invite members
    MEMBER = "member"        # Basic member
    VASSAL = "vassal"        # Subordinate member, under 500k pop

class AllianceMember(BaseModel):
    """A member nation within a multi-nation alliance."""
    nation_id: str
    nation_name: str
    nation_flag: Optional[str] = None
    race: str = "human"
    role: AllianceRole = AllianceRole.MEMBER
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    contribution_score: int = 0  # Tracks member activity/contribution
    
    # Ideology compliance tracking (for faction restrictions)
    ideology_mismatch_started: Optional[datetime] = None  # When incompatibility was detected
    ideology_compliant_since: Optional[datetime] = None  # When they became compliant (for 24h reset check)
    last_ideology_check: Optional[datetime] = None  # Last time we checked compliance
    grace_period_warned: bool = False  # Whether we've warned them about grace period

class MultiAlliance(BaseModel):
    """A multi-nation alliance (faction/coalition)."""
    id: Optional[str] = None
    
    # World assignment
    world_id: Optional[str] = None  # Which world this faction belongs to
    
    # Alliance identity
    name: str
    tag: str  # Short 3-5 letter tag, e.g., "NATO", "AXIS"
    description: str = ""
    motto: str = ""
    color: str = "#3B82F6"  # Alliance color for UI
    
    # Members
    members: List[AllianceMember] = []
    vassals: List[AllianceMember] = []  # Vassals (under 500k pop)
    max_members: int = 10  # Hardcapped at 10
    max_vassals: int = 3  # Max 3 vassal slots (unlock at 3/7/10 members)
    
    # Stats
    total_gdp: float = 0  # Combined GDP of all members
    total_military: float = 0  # Combined military strength
    total_population: float = 0  # Combined population
    
    # Settings
    is_public: bool = True  # Can be found in alliance browser
    requires_approval: bool = True  # Founder/Leaders must approve joins
    min_reputation: int = 0  # Minimum reputation to join
    min_population: int = 0  # Minimum population to join (in millions)
    
    # Race restrictions (empty list = all races allowed)
    allowed_races: List[str] = []  # e.g., ["human", "zythera"] or [] for all
    
    # Ideology restrictions - list of allowed political compass quadrants
    # Options: "auth_right", "auth_left", "lib_right", "lib_left", "centrist"
    # Empty list = all ideologies allowed
    allowed_ideologies: List[str] = []
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    disbanded_at: Optional[datetime] = None
    is_active: bool = True

class AllianceInvite(BaseModel):
    """Invitation to join a multi-nation alliance."""
    id: Optional[str] = None
    alliance_id: str
    alliance_name: str
    
    # Inviter
    invited_by_nation_id: str
    invited_by_nation_name: str
    
    # Invitee
    to_nation_id: str
    to_nation_name: str
    
    message: str = ""
    status: AllianceStatus = AllianceStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None

class AllianceJoinRequest(BaseModel):
    """Request from a nation to join an alliance."""
    id: Optional[str] = None
    alliance_id: str
    alliance_name: str
    
    # Requester
    nation_id: str
    nation_name: str
    nation_flag: Optional[str] = None
    
    message: str = ""
    status: AllianceStatus = AllianceStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None

# ============== Reputation System ==============

class ReputationEvent(BaseModel):
    """A single reputation-affecting event."""
    id: Optional[str] = None
    nation_id: str
    
    event_type: str  # "alliance_formed", "alliance_broken", "war_declared", "treaty_honored", etc.
    description: str
    reputation_change: int  # Positive or negative
    
    # Related entities
    related_nation_id: Optional[str] = None
    related_nation_name: Optional[str] = None
    related_alliance_id: Optional[str] = None
    related_alliance_name: Optional[str] = None
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class NationReputation(BaseModel):
    """A nation's reputation score and history."""
    nation_id: str
    nation_name: str
    
    # Reputation scores
    overall_score: int = 100  # Starting reputation (0-200 scale, 100 is neutral)
    alliance_reliability: int = 100  # How reliable in alliances (0-200)
    diplomatic_standing: int = 100  # General diplomatic reputation (0-200)
    
    # Statistics
    alliances_formed: int = 0
    alliances_broken: int = 0
    alliances_honored: int = 0  # Alliances that lasted > 30 days
    wars_declared: int = 0
    treaties_signed: int = 0
    treaties_broken: int = 0
    
    # Calculated metrics
    betrayal_rate: float = 0.0  # Percentage of alliances broken by this nation
    
    # Recent history (last 10 events for quick display)
    recent_events: List[ReputationEvent] = []
    
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# ============== API Request Models ==============

class CreateAllianceRequest(BaseModel):
    """Request to create a new multi-nation alliance."""
    founder_nation_id: str
    founder_nation_name: str
    founder_nation_flag: Optional[str] = None
    founder_race: str = "human"
    
    name: str
    tag: str
    description: str = ""
    motto: str = ""
    color: str = "#3B82F6"
    is_public: bool = True
    requires_approval: bool = True
    min_reputation: int = 0
    min_population: int = 0
    allowed_races: List[str] = []  # Empty = all races allowed
    ideology_restrictions: Optional[dict] = None

class EditAllianceSettingsRequest(BaseModel):
    """Request to edit faction settings (founder/leader only)."""
    alliance_id: str
    editor_nation_id: str
    
    # Editable fields (all optional - only update if provided)
    name: Optional[str] = None
    description: Optional[str] = None
    motto: Optional[str] = None
    color: Optional[str] = None
    is_public: Optional[bool] = None
    requires_approval: Optional[bool] = None
    min_reputation: Optional[int] = None
    min_population: Optional[int] = None
    max_members: Optional[int] = None
    allowed_races: Optional[List[str]] = None
    allowed_ideologies: Optional[List[str]] = None  # ["auth_right", "auth_left", "lib_right", "lib_left", "centrist"]

class InviteToAllianceRequest(BaseModel):
    """Request to invite a nation to an alliance."""
    alliance_id: str
    inviter_nation_id: str
    to_nation_id: str
    message: str = ""

class RespondToAllianceInviteRequest(BaseModel):
    """Response to an alliance invitation."""
    invite_id: str
    accept: bool

class RequestToJoinAllianceRequest(BaseModel):
    """Request from a nation to join an alliance."""
    alliance_id: str
    nation_id: str
    nation_name: str
    nation_flag: Optional[str] = None
    message: str = ""

class HandleJoinRequestRequest(BaseModel):
    """Handler (leader) response to a join request."""
    request_id: str
    handler_nation_id: str
    accept: bool
    join_as_role: Optional[str] = None  # "member" or "vassal" - only honored if eligible

class LeaveAllianceRequest(BaseModel):
    """Request to leave an alliance."""
    alliance_id: str
    nation_id: str

class KickFromAllianceRequest(BaseModel):
    """Request to kick a member from alliance."""
    alliance_id: str
    kicker_nation_id: str
    target_nation_id: str
    reason: str = ""

class PromoteMemberRequest(BaseModel):
    """Request to promote a member's role."""
    alliance_id: str
    promoter_nation_id: str
    target_nation_id: str
    new_role: AllianceRole



# ============== WAR SYSTEM MODELS ==============

class CasusBelli(str, Enum):
    """Reasons for declaring war."""
    IDEOLOGICAL_CONFLICT = "ideological_conflict"
    RESOURCE_COMPETITION = "resource_competition"
    AGGRESSIVE_EXPANSION = "aggressive_expansion"
    DEFENSIVE_WAR = "defensive_war"
    ALLY_OBLIGATION = "ally_obligation"

class WarStatus(str, Enum):
    """War status states."""
    ACTIVE = "active"
    PEACE_NEGOTIATION = "peace_negotiation"
    ENDED = "ended"

class WarEvent(BaseModel):
    """AI-generated war event."""
    title: str
    description: str  # AI-generated narrative
    war_score_change: int  # -20 to +20
    attacker_casualties: Dict[str, float] = {}  # {"military": -5, "population": -0.1}
    defender_casualties: Dict[str, float] = {}
    stat_effects: Dict[str, Dict[str, float]] = {}  # {"attacker": {"happiness": -3}}
    date: datetime = Field(default_factory=datetime.utcnow)

class PeaceTerms(BaseModel):
    """Terms of peace after war ends."""
    resource_tribute_percentage: int = 0  # % of resources per month
    resource_tribute_duration_months: int = 0
    gdp_reparations_percentage: int = 0  # % of GDP per month
    gdp_reparations_duration_months: int = 0
    started_at: datetime = Field(default_factory=datetime.utcnow)

class War(BaseModel):
    """Active war between two nations."""
    attacker_id: str
    attacker_name: str
    attacker_race: str
    attacker_government: str
    attacker_flag: Optional[str] = None
    
    defender_id: str
    defender_name: str
    defender_race: str
    defender_government: str
    defender_flag: Optional[str] = None
    
    # World assignment
    world_id: Optional[str] = None  # Which world this war is in
    
    casus_belli: CasusBelli
    status: WarStatus = WarStatus.ACTIVE
    
    war_score: int = 0  # -100 to +100
    day: int = 0
    
    events: List[WarEvent] = []
    
    # Faction involvement
    attacker_allies: List[str] = []  # Nation IDs who joined attacker's side
    defender_allies: List[str] = []  # Nation IDs who joined defender's side
    is_vassal_war: bool = False  # True if either participant is a vassal - no allies can join
    
    # Consequences
    peace_terms: Optional[PeaceTerms] = None
    winner_id: Optional[str] = None
    
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    last_battle_at: Optional[datetime] = None  # Track when the last battle occurred

class DeclareWarRequest(BaseModel):
    """Request to declare war on another nation."""
    attacker_id: str
    defender_id: str
    casus_belli: CasusBelli

class SurrenderRequest(BaseModel):
    """Request to surrender and end war."""
    war_id: str
    surrendering_nation_id: str

class WarJoinRequest(BaseModel):
    """Request to call a faction member into a war."""
    war_id: str
    caller_nation_id: str
    caller_nation_name: str
    target_nation_id: str
    target_nation_name: str
    side: str  # "attacker" or "defender"
    enemy_nation_name: str
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None

# ============== FACTION CHAT MODELS ==============

class FactionChatMessage(BaseModel):
    """A chat message in a faction."""
    faction_id: str
    sender_id: str
    sender_name: str
    sender_flag: Optional[str] = None
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SendFactionMessageRequest(BaseModel):
    """Request to send a message in faction chat."""
    faction_id: str
    sender_id: str
    message: str



# ============== NOTIFICATION MODELS ==============

class NotificationType(str, Enum):
    """Types of notifications."""
    PACT_ACCEPTED = "pact_accepted"
    PACT_DECLINED = "pact_declined"
    WAR_JOIN_ACCEPTED = "war_join_accepted"
    WAR_JOIN_DECLINED = "war_join_declined"
    FACTION_JOIN_ACCEPTED = "faction_join_accepted"
    FACTION_JOIN_REJECTED = "faction_join_rejected"

class Notification(BaseModel):
    """A notification for a nation."""
    nation_id: str  # The recipient
    notification_type: NotificationType
    title: str
    message: str
    related_nation_id: Optional[str] = None
    related_nation_name: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)



# ============== WORLD SYSTEM MODELS ==============

class World(BaseModel):
    """A game world that players can join."""
    id: Optional[str] = None
    
    # World identity
    name: str
    description: str = ""
    
    # World settings
    seed: int = 123456  # Map generation seed
    max_players: int = 50
    enabled_races: List[str] = Field(default_factory=lambda: ["human", "zythera"])  # Which races can be selected
    
    # Migration settings
    allows_migration: bool = True  # Whether nations can migrate to this world
    
    # Owner
    owner_nation_id: Optional[str] = None  # Nation that created the world
    owner_nation_name: Optional[str] = None
    
    # Stats
    player_count: int = 0
    nation_count: int = 0
    
    # Status
    is_active: bool = True
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)


class CreateWorldRequest(BaseModel):
    """Request to create a new world."""
    name: str
    description: str = ""
    seed: int = 123456
    max_players: int = 50
    enabled_races: List[str] = Field(default_factory=lambda: ["human", "zythera"])
    creator_nation_id: Optional[str] = None
    creator_nation_name: Optional[str] = None


class WorldListResponse(BaseModel):
    """Response containing list of worlds."""
    worlds: List[World]
    total: int
