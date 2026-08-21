import Constants from 'expo-constants';

function resolveApiUrl(): string {
  const baked =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    '';
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    const isLan =
      host === '10.0.4.27' ||
      host === 'localhost' ||
      host === '127.0.0.1';
    // Public tunnel (HTTPS) cannot reach the LAN API IP. Same origin instead.
    if (!isLan) {
      return window.location.origin;
    }
  }
  return baked;
}

const API_URL = resolveApiUrl();

export const api = {
  // Quiz
  getQuiz: async () => {
    const response = await fetch(`${API_URL}/api/quiz/questions`);
    return response.json();
  },
  
  // Races
  getRaces: async () => {
    const response = await fetch(`${API_URL}/api/races`);
    return response.json();
  },
  
  // Nation
  createNation: async (userId: string, quizResult: any, race: string = 'human', worldId?: string, capital?: { col: number; row: number }) => {
    // Use AbortController with 60 second timeout (OpenAI takes ~20 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds
    
    try {
      const response = await fetch(`${API_URL}/api/nations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          quiz_result: quizResult,
          race,
          world_id: worldId,
          ...(capital ? { capital_col: capital.col, capital_row: capital.row } : {}),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 60 seconds');
      }
      throw error;
    }
  },
  
  getNationByUser: async (userId: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${API_URL}/api/nations/user/${userId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('getNationByUser failed:', error);
      return { success: false };
    }
  },
  
  getNation: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}`);
    return response.json();
  },
  
  deleteNation: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}`, {
      method: 'DELETE',
    });
    return response.json();
  },
  
  regenerateDescription: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/description`, {
      method: 'PUT',
    });
    return response.json();
  },
  
  // Issues
  getIssues: async (nationId: string, forceGenerate = false) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/issues?force_generate=${forceGenerate}`);
    return response.json();
  },
  
  submitDecision: async (nationId: string, issueId: string, choiceIndex: number) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nation_id: nationId, issue_id: issueId, choice_index: choiceIndex }),
    });
    return response.json();
  },

  reportTimezoneGeo: async (nationId: string, geoMax: number, bands: number[]) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/timezone-geo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geo_max: geoMax, bands }),
    });
    return response.json();
  },

  addCity: async (nationId: string, col: number, row: number) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ col, row }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not found city');
    return data;
  },

  setCities: async (nationId: string, cities: { col: number; row: number }[]) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/cities`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cities }),
    });
    return response.json();
  },
  
  // Rankings
  getRankings: async (statName: string, limit = 100, worldId?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (worldId) params.append('world_id', worldId);
    const response = await fetch(`${API_URL}/api/rankings/${statName}?${params}`);
    return response.json();
  },
  
  getExtremeRankings: async (category: string, worldId?: string) => {
    const params = worldId ? `?world_id=${worldId}` : '';
    const response = await fetch(`${API_URL}/api/rankings/extremes/${category}${params}`);
    return response.json();
  },
  
  updateFlag: async (nationId: string, flagBase64: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/flag`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag_base64: flagBase64 }),
    });
    return response.json();
  },
  
  updateCustomization: async (nationId: string, customization: { currency?: string; national_animal?: string }) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/customization`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customization),
    });
    return response.json();
  },
  
  sendAdvisorTask: async (nationId: string, advisorSlot: number, taskDescription: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/advisor-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advisor_slot: advisorSlot, task_description: taskDescription }),
    });
    return response.json();
  },

  probeAdvisorTrust: async (nationId: string, targetSlot: number) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/advisor-probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_slot: targetSlot }),
    });
    return response.json();
  },
  
  sendAdvisorReform: async (nationId: string, advisorSlot: number, policyName: string, reformInstructions: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/advisor-reform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        advisor_slot: advisorSlot, 
        policy_name: policyName,
        reform_instructions: reformInstructions 
      }),
    });
    return response.json();
  },
  
  // Territory counts for industry system
  updateTerritoryCounts: async (nationId: string, territoryCounts: Record<string, number>, totalTerritories: number, resourceCounts?: Record<string, number>) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/territories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        territory_counts: territoryCounts,
        total_territories: totalTerritories,
        resource_counts: resourceCounts || {}
      }),
    });
    return response.json();
  },
  
  getTerritoryCounts: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/territories`);
    return response.json();
  },
  
  // Industry Leaderboard
  getIndustryLeaderboard: async (worldId?: string) => {
    const params = worldId ? `?world_id=${worldId}` : '';
    const response = await fetch(`${API_URL}/api/industry/leaderboard${params}`);
    return response.json();
  },
  
  // Stats History
  getStatHistory: async (nationId: string, statName: string, days = 90) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/history/${statName}?days=${days}`);
    return response.json();
  },
  
  // Policies
  getPolicies: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/policies`);
    return response.json();
  },
  
  // Global Decision Feed
  getDecisionFeed: async (limit = 50, skip = 0, worldId?: string) => {
    const params = new URLSearchParams({ limit: limit.toString(), skip: skip.toString() });
    if (worldId) params.append('world_id', worldId);
    const response = await fetch(`${API_URL}/api/feed/decisions?${params}`);
    return response.json();
  },
  
  // Admin: Fix overlapping nation positions
  fixOverlappingPositions: async () => {
    const response = await fetch(`${API_URL}/api/admin/fix-overlapping-positions`, {
      method: 'POST',
    });
    return response.json();
  },
  
  // ============== Server Browser APIs ==============
  
  // Get list of public servers
  getServers: async (includeOffline = false) => {
    const response = await fetch(`${API_URL}/api/servers?include_offline=${includeOffline}`);
    return response.json();
  },
  
  // Get specific server info
  getServerInfo: async (serverId: string) => {
    const response = await fetch(`${API_URL}/api/servers/${serverId}`);
    return response.json();
  },
  
  // Get info about a server by URL (for direct connection)
  getServerInfoByUrl: async (serverUrl: string) => {
    const response = await fetch(`${serverUrl}/api/server/info`);
    return response.json();
  },
  
  // Get players on a server
  getServerPlayers: async (serverUrl: string) => {
    const response = await fetch(`${serverUrl}/api/server/players`);
    return response.json();
  },
  
  // Verify server password
  verifyServerPassword: async (serverId: string, password: string) => {
    const response = await fetch(`${API_URL}/api/servers/${serverId}/verify-password?password=${encodeURIComponent(password)}`, {
      method: 'POST',
    });
    return response.json();
  },
  
  // Get current server info (local)
  getCurrentServerInfo: async () => {
    const response = await fetch(`${API_URL}/api/server/info`);
    return response.json();
  },
  
  // ============== World Browser APIs ==============
  
  // Get list of public worlds
  getWorlds: async () => {
    const response = await fetch(`${API_URL}/api/worlds`);
    return response.json();
  },
  
  // Get specific world info
  getWorld: async (worldId: string) => {
    const response = await fetch(`${API_URL}/api/worlds/${worldId}`);
    return response.json();
  },
  
  // Create a new world
  createWorld: async (worldData: {
    name: string;
    description?: string;
    seed?: number;
    max_players?: number;
    enabled_races?: string[];
    creator_nation_id?: string;
    creator_nation_name?: string;
    allows_migration?: boolean;
  }) => {
    const response = await fetch(`${API_URL}/api/worlds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(worldData),
    });
    return response.json();
  },
  
  // Update world settings
  updateWorld: async (worldId: string, updates: any) => {
    const response = await fetch(`${API_URL}/api/worlds/${worldId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  },
  
  // Delete a world
  deleteWorld: async (worldId: string, nationId?: string) => {
    const url = nationId 
      ? `${API_URL}/api/worlds/${worldId}?nation_id=${nationId}`
      : `${API_URL}/api/worlds/${worldId}`;
    const response = await fetch(url, { method: 'DELETE' });
    return response.json();
  },
  
  // Get nations in a world
  getWorldNations: async (worldId: string) => {
    const response = await fetch(`${API_URL}/api/worlds/${worldId}/nations`);
    return response.json();
  },
  
  // Join a world with a nation
  joinWorld: async (worldId: string, nationId: string) => {
    const response = await fetch(`${API_URL}/api/worlds/${worldId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nation_id: nationId }),
    });
    return response.json();
  },
  
  // Migrate nation to another world
  migrateToWorld: async (worldId: string, nationId: string) => {
    const response = await fetch(`${API_URL}/api/worlds/${worldId}/migrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nation_id: nationId }),
    });
    return response.json();
  },
  
  // ============== Nation Migration APIs ==============
  
  // Export nation data for migration
  exportNation: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/export`);
    return response.json();
  },
  
  // Import nation data from another server
  importNation: async (userId: string, nationData: any, sourceServerUrl: string, targetServerUrl: string) => {
    const response = await fetch(`${targetServerUrl}/api/nations/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        nation_data: nationData,
        source_server_url: sourceServerUrl
      }),
    });
    return response.json();
  },
  
  // Check if a server allows migration
  checkMigrationStatus: async (serverUrl: string) => {
    const response = await fetch(`${serverUrl}/api/server/migration-status`);
    return response.json();
  },
  
  // ============== International Voting APIs ==============
  
  // Get active votes
  getActiveVotes: async (worldId?: string) => {
    const params = worldId ? `?world_id=${worldId}` : '';
    const response = await fetch(`${API_URL}/api/votes/active${params}`);
    return response.json();
  },
  
  // Get ended votes
  getEndedVotes: async (limit = 20, worldId?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (worldId) params.append('world_id', worldId);
    const response = await fetch(`${API_URL}/api/votes/ended?${params}`);
    return response.json();
  },
  
  // Get vote details
  getVoteDetails: async (voteId: string) => {
    const response = await fetch(`${API_URL}/api/votes/${voteId}`);
    return response.json();
  },
  
  // Cast a vote
  castVote: async (voteId: string, nationId: string, nationName: string, voteType: string, sponsorStatement?: string) => {
    const response = await fetch(`${API_URL}/api/votes/${voteId}/cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nation_id: nationId,
        nation_name: nationName,
        vote_type: voteType,
        sponsor_statement: sponsorStatement
      }),
    });
    return response.json();
  },
  
  // Get pending international issues for a nation
  getPendingInternationalIssues: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/pending-international-issues`);
    return response.json();
  },
  
  // Get pending chain issues for a nation
  getPendingChainIssues: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/pending-chain-issues`);
    return response.json();
  },
  
  // ============== Alliance APIs ==============
  
  // Send alliance request
  sendAllianceRequest: async (fromNationId: string, fromNationName: string, toNationId: string, message: string, fromNationFlag?: string) => {
    const response = await fetch(`${API_URL}/api/alliances/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_nation_id: fromNationId,
        from_nation_name: fromNationName,
        from_nation_flag: fromNationFlag,
        to_nation_id: toNationId,
        message: message
      }),
    });
    return response.json();
  },
  
  // Respond to alliance request
  respondToAlliance: async (requestId: string, accept: boolean) => {
    const response = await fetch(`${API_URL}/api/alliances/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: requestId,
        accept: accept
      }),
    });
    return response.json();
  },
  
  // Get nation's alliances
  getAlliances: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/alliances`);
    return response.json();
  },
  
  // Get alliance requests
  getAllianceRequests: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/alliance-requests`);
    return response.json();
  },
  
  // Break alliance
  breakAlliance: async (allianceId: string, nationId: string) => {
    const response = await fetch(`${API_URL}/api/alliances/${allianceId}?nation_id=${nationId}`, {
      method: 'DELETE',
    });
    return response.json();
  },
  
  // Check if allied
  checkIfAllied: async (nationId: string, otherNationId: string) => {
    const response = await fetch(`${API_URL}/api/nations/${nationId}/is-ally/${otherNationId}`);
    return response.json();
  },
  
  // ============== Multi-Alliance APIs ==============
  
  // Create a new multi-nation alliance
  createMultiAlliance: async (data: {
    founder_nation_id: string;
    founder_nation_name: string;
    founder_nation_flag?: string;
    founder_race: string;
    name: string;
    tag: string;
    description?: string;
    motto?: string;
    color?: string;
    is_public?: boolean;
    requires_approval?: boolean;
  }) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  // Browse public alliances
  browseAlliances: async (limit: number = 50, worldId?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (worldId) params.append('world_id', worldId);
    const response = await fetch(`${API_URL}/api/multi-alliances/browse?${params}`);
    return response.json();
  },
  
  // Get alliance details
  getMultiAlliance: async (allianceId: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/${allianceId}`);
    return response.json();
  },
  
  // Get nation's multi-alliance
  getNationMultiAlliance: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/nation/${nationId}`);
    return response.json();
  },

  // Alias used by older screens
  getNationAlliance: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/nation/${nationId}`);
    return response.json();
  },
  
  // Invite to alliance
  inviteToAlliance: async (allianceId: string, inviterNationId: string, toNationId: string, message?: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alliance_id: allianceId,
        inviter_nation_id: inviterNationId,
        to_nation_id: toNationId,
        message: message || ''
      }),
    });
    return response.json();
  },
  
  // Get pending alliance invites
  getAllianceInvites: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/invites/${nationId}`);
    return response.json();
  },
  
  // Respond to alliance invite
  respondToAllianceInvite: async (inviteId: string, accept: boolean) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/invites/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invite_id: inviteId,
        accept: accept
      }),
    });
    return response.json();
  },
  
  // Request to join alliance
  requestToJoinAlliance: async (allianceId: string, nationId: string, nationName: string, nationFlag?: string, message?: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alliance_id: allianceId,
        nation_id: nationId,
        nation_name: nationName,
        nation_flag: nationFlag,
        message: message || ''
      }),
    });
    return response.json();
  },
  
  // Handle join request (for leaders)
  // joinAsRole: 'member' | 'vassal' - optional, specify the role for the joining nation
  handleJoinRequest: async (requestId: string, handlerNationId: string, accept: boolean, joinAsRole?: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/join-requests/handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: requestId,
        handler_nation_id: handlerNationId,
        accept: accept,
        join_as_role: joinAsRole  // 'member' or 'vassal'
      }),
    });
    return response.json();
  },
  
  // Leave alliance
  leaveMultiAlliance: async (allianceId: string, nationId: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alliance_id: allianceId,
        nation_id: nationId
      }),
    });
    return response.json();
  },
  
  // Kick from alliance
  kickFromAlliance: async (allianceId: string, kickerNationId: string, targetNationId: string, reason?: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alliance_id: allianceId,
        kicker_nation_id: kickerNationId,
        target_nation_id: targetNationId,
        reason: reason || ''
      }),
    });
    return response.json();
  },
  
  // Promote member
  promoteMember: async (allianceId: string, promoterNationId: string, targetNationId: string, newRole: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alliance_id: allianceId,
        promoter_nation_id: promoterNationId,
        target_nation_id: targetNationId,
        new_role: newRole
      }),
    });
    return response.json();
  },
  
  // Edit faction settings
  editAllianceSettings: async (data: {
    alliance_id: string;
    editor_nation_id: string;
    name?: string;
    description?: string;
    motto?: string;
    color?: string;
    is_public?: boolean;
    requires_approval?: boolean;
    min_reputation?: number;
    min_population?: number;
    max_members?: number;
    allowed_races?: string[];
    allowed_ideologies?: string[];
    ideology_restrictions?: {
      min_auth?: number;
      max_auth?: number;
      min_econ?: number;
      max_econ?: number;
    } | null;
  }) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  // Transfer leadership
  transferLeadership: async (allianceId: string, currentFounderId: string, newFounderId: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/transfer-leadership?alliance_id=${allianceId}&current_founder_id=${currentFounderId}&new_founder_id=${newFounderId}`, {
      method: 'POST',
    });
    return response.json();
  },
  
  // ============== Reputation APIs ==============
  
  // Get nation reputation
  getNationReputation: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/reputation/${nationId}`);
    return response.json();
  },
  
  // Get reputation leaderboard
  getReputationLeaderboard: async (limit: number = 50) => {
    const response = await fetch(`${API_URL}/api/reputation/leaderboard/top?limit=${limit}`);
    return response.json();
  },
  
  // ============== War APIs ==============
  
  // Declare war
  declareWar: async (attackerId: string, defenderId: string, casusBelli: string) => {
    const response = await fetch(`${API_URL}/api/wars/declare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attacker_id: attackerId,
        defender_id: defenderId,
        casus_belli: casusBelli,
      }),
    });
    return response.json();
  },
  
  // Get nation's active war
  getNationActiveWar: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/wars/nation/${nationId}`);
    return response.json();
  },
  
  // Get war details
  getWarDetails: async (warId: string) => {
    const response = await fetch(`${API_URL}/api/wars/${warId}`);
    return response.json();
  },
  
  // Surrender war
  surrenderWar: async (warId: string, surrenderingNationId: string) => {
    const response = await fetch(`${API_URL}/api/wars/${warId}/surrender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        war_id: warId,
        surrendering_nation_id: surrenderingNationId,
      }),
    });
    return response.json();
  },

  // Get war participants with full details
  getWarParticipants: async (warId: string) => {
    const response = await fetch(`${API_URL}/api/wars/${warId}/participants`);
    return response.json();
  },

  // Check if a nation can be called to war
  canCallToWar: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/wars/can-call/${nationId}`);
    return response.json();
  },

  // Call a faction member to war (sends a request)
  callToWar: async (callerNationId: string, targetNationId: string) => {
    const response = await fetch(`${API_URL}/api/wars/call-to-war?caller_nation_id=${callerNationId}&target_nation_id=${targetNationId}`, {
      method: 'POST',
    });
    return response.json();
  },

  // Get pending war join requests for a nation
  getWarJoinRequests: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/wars/join-requests/${nationId}`);
    return response.json();
  },

  // Respond to a war join request (accept or reject)
  respondToWarJoinRequest: async (requestId: string, nationId: string, accept: boolean) => {
    const response = await fetch(`${API_URL}/api/wars/join-requests/${requestId}/respond?nation_id=${nationId}&accept=${accept}`, {
      method: 'POST',
    });
    return response.json();
  },
  
  // ============== Faction Chat APIs ==============
  
  // Send faction chat message
  sendFactionMessage: async (factionId: string, senderId: string, message: string) => {
    const response = await fetch(`${API_URL}/api/factions/${factionId}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faction_id: factionId,
        sender_id: senderId,
        message: message,
      }),
    });
    return response.json();
  },
  
  // Get faction chat messages
  getFactionMessages: async (factionId: string, nationId: string, limit: number = 50) => {
    const response = await fetch(`${API_URL}/api/factions/${factionId}/chat/messages?nation_id=${nationId}&limit=${limit}`);
    return response.json();
  },
  
  // Get faction join requests
  getAllianceJoinRequests: async (allianceId: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/${allianceId}/requests`);
    return response.json();
  },
  
  // Respond to join request (accept/reject, choose role)
  respondToJoinRequest: async (requestId: string, accept: boolean, role?: string) => {
    const response = await fetch(`${API_URL}/api/multi-alliances/join-request/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: requestId,
        accept: accept,
        role: role || 'member',
      }),
    });
    return response.json();
  },

  // ============== Notifications APIs ==============
  
  // Get notifications for a nation
  getNotifications: async (nationId: string, unreadOnly: boolean = false, limit: number = 50) => {
    const response = await fetch(`${API_URL}/api/notifications/${nationId}?unread_only=${unreadOnly}&limit=${limit}`);
    return response.json();
  },

  // Mark a notification as read
  markNotificationRead: async (notificationId: string) => {
    const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });
    return response.json();
  },

  // Mark all notifications as read
  markAllNotificationsRead: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/notifications/${nationId}/read-all`, {
      method: 'POST',
    });
    return response.json();
  },

  // Get unread notification count
  getNotificationCount: async (nationId: string) => {
    const response = await fetch(`${API_URL}/api/notifications/${nationId}/count`);
    return response.json();
  },
};

// Helper to create API instance for a specific server URL
export const createServerApi = (serverUrl: string) => ({
  ...api,
  // Override methods to use the specific server URL
  getNation: async (nationId: string) => {
    const response = await fetch(`${serverUrl}/api/nations/${nationId}`);
    return response.json();
  },
  createNation: async (userId: string, quizResult: any) => {
    const response = await fetch(`${serverUrl}/api/nations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, quiz_result: quizResult }),
    });
    return response.json();
  },
  // Add more overrides as needed for multi-server support
});
