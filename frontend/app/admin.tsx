import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenCanvas from '../components/ScreenCanvas';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { glassAlert, glassConfirm } from '../components/GlassModal';
import { api } from '../utils/api';
import { useAccountStore } from '../store/accountStore';

type Tab = 'worlds' | 'accounts';

export default function AdminPanel() {
  const router = useRouter();
  const { user } = useAccountStore();
  const [tab, setTab] = useState<Tab>('worlds');
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [worlds, setWorlds] = useState<any[]>([]);
  const [world, setWorld] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [worldId, setWorldId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadHome = async () => {
    if (!user?.is_admin) return;
    const [o, u, w] = await Promise.all([api.adminOverview(), api.adminUsers(), api.adminWorlds()]);
    setOverview(o);
    setUsers(u.users || []);
    setWorlds(w.worlds || []);
  };

  const loadWorld = async (id: string) => {
    const d = await api.adminWorld(id);
    setWorld(d.world);
    setPlayers(d.players || []);
  };

  const load = async () => {
    try {
      if (worldId) await loadWorld(worldId);
      else await loadHome();
    } catch (e: any) {
      await glassAlert({ title: 'Admin load failed', message: e?.message || 'Sign in again.' });
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user?.id, user?.is_admin, worldId])
  );

  const openWorld = (id: string) => {
    setQ('');
    setWorldId(id);
  };

  const run = async (fn: () => Promise<any>) => {
    try {
      await fn();
      await load();
    } catch (e: any) {
      await glassAlert({ title: 'Admin', message: e?.message || 'Failed' });
    }
  };

  const banUser = async (id: string, email: string, currentlyBanned: boolean) => {
    if (currentlyBanned) {
      const ok = await glassConfirm({ title: 'Unban?', message: email, confirmText: 'Unban' });
      if (!ok) return;
      await run(() => api.adminBanUser(id, false));
      return;
    }
    const ok = await glassConfirm({
      title: 'Ban this account?',
      message: `${email} will not be able to sign in. Their nation stays until you delete it.`,
      confirmText: 'Ban',
      destructive: true,
    });
    if (!ok) return;
    await run(() => api.adminBanUser(id, true, 'Banned by admin.'));
  };

  const filteredUsers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      `${u.email || ''} ${u.username || ''} ${u.id}`.toLowerCase().includes(s)
    );
  }, [users, q]);

  const filteredPlayers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return players;
    return players.filter((p) =>
      `${p.nation_name || ''} ${p.email || ''} ${p.leader_name || ''}`.toLowerCase().includes(s)
    );
  }, [players, q]);

  if (!user?.is_admin) {
    return (
      <ScreenCanvas>
        <ScreenHeader title="Admin" subtitle="Restricted" onBack={() => router.back()} />
        <View style={styles.pad}>
          <LiquidGlass radius={22} style={styles.card}>
            <Text style={styles.body}>This account is not an admin.</Text>
          </LiquidGlass>
        </View>
      </ScreenCanvas>
    );
  }

  return (
    <ScreenCanvas>
      <ScreenHeader
        title={world ? world.name : 'Admin'}
        subtitle={world ? 'World roster' : 'Worlds, accounts, bans'}
        onBack={() => {
          if (worldId) {
            setWorldId(null);
            setWorld(null);
            setPlayers([]);
            setQ('');
          } else router.back();
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {!worldId ? (
          <>
            <View style={styles.stats}>
              {[
                ['Accounts', overview?.users ?? '—'],
                ['Nations', overview?.nations ?? '—'],
                ['Worlds', overview?.worlds ?? '—'],
                ['Banned', users.filter((u) => u.is_banned).length],
              ].map(([k, v]) => (
                <LiquidGlass key={String(k)} radius={18} style={styles.stat}>
                  <Text style={styles.statK}>{k}</Text>
                  <Text style={styles.statV}>{String(v)}</Text>
                </LiquidGlass>
              ))}
            </View>

            <View style={styles.tabs}>
              {(['worlds', 'accounts'] as Tab[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tab, tab === t && styles.tabOn]}
                  onPress={() => {
                    setTab(t);
                    setQ('');
                  }}
                >
                  <Text style={[styles.tabT, tab === t && styles.tabTOn]}>
                    {t === 'worlds' ? 'Worlds' : 'Accounts'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'worlds' ? (
              <>
                <Text style={styles.hint}>Tap a world to see players and emails.</Text>
                {worlds.map((w) => (
                  <TouchableOpacity key={w.id} onPress={() => openWorld(w.id)} activeOpacity={0.85}>
                    <LiquidGlass radius={18} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{w.name}</Text>
                        <Text style={styles.meta}>
                          {w.official ? 'Official' : 'Community'}
                          {w.is_active === false ? ' · Closed' : ''}
                          {' · '}
                          {w.player_count ?? 0} players
                          {' · seed '}
                          {w.seed}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="rgba(243,246,250,0.45)" />
                    </LiquidGlass>
                  </TouchableOpacity>
                ))}
                {worlds.length === 0 ? <Text style={styles.empty}>No worlds yet.</Text> : null}
              </>
            ) : (
              <>
                <TextInput
                  style={styles.search}
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search email or name"
                  placeholderTextColor="rgba(243,246,250,0.4)"
                  autoCapitalize="none"
                />
                {filteredUsers.map((u) => (
                  <LiquidGlass key={u.id} radius={18} style={styles.account}>
                    <Text style={styles.name}>{u.email || u.username}</Text>
                    <Text style={styles.meta}>
                      {u.is_admin ? 'Admin' : 'Player'}
                      {u.is_banned ? ' · Banned' : ''}
                      {u.google_linked ? ' · Google' : ''}
                    </Text>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.chip}
                        onPress={async () => {
                          const ok = await glassConfirm({
                            title: u.is_admin ? 'Remove admin?' : 'Make admin?',
                            message: u.email || u.id,
                            confirmText: u.is_admin ? 'Demote' : 'Promote',
                            destructive: u.is_admin,
                          });
                          if (!ok) return;
                          await run(() => api.setUserAdmin(u.id, !u.is_admin));
                        }}
                      >
                        <Text style={styles.chipT}>{u.is_admin ? 'Demote' : 'Promote'}</Text>
                      </TouchableOpacity>
                      {u.id !== user?.id && !u.is_admin ? (
                        <TouchableOpacity
                          style={u.is_banned ? styles.chip : styles.danger}
                          onPress={() => banUser(u.id, u.email || u.id, !!u.is_banned)}
                        >
                          <Text style={u.is_banned ? styles.chipT : styles.dangerT}>
                            {u.is_banned ? 'Unban' : 'Ban'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {u.id !== user?.id ? (
                        <TouchableOpacity
                          style={styles.danger}
                          onPress={async () => {
                            const ok = await glassConfirm({
                              title: 'Delete account?',
                              message: `Removes ${u.email || u.id} and their nation.`,
                              confirmText: 'Delete',
                              destructive: true,
                            });
                            if (!ok) return;
                            await run(() => api.adminDeleteUser(u.id));
                          }}
                        >
                          <Text style={styles.dangerT}>Delete</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </LiquidGlass>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <LiquidGlass radius={18} style={styles.card}>
              <Text style={styles.meta}>
                {world?.official ? 'Official' : 'Community'}
                {world?.is_active === false ? ' · Closed' : ' · Open'}
                {' · seed '}
                {world?.seed}
                {' · '}
                {players.length} players
              </Text>
              {world?.description ? <Text style={styles.body}>{world.description}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => run(() => api.setWorldOfficial(world.id, !world.official))}
                >
                  <Text style={styles.chipT}>{world?.official ? 'Make community' : 'Make official'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => run(() => api.adminSetWorldActive(world.id, world?.is_active === false))}
                >
                  <Text style={styles.chipT}>{world?.is_active === false ? 'Reopen' : 'Close'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.danger}
                  onPress={async () => {
                    const ok = await glassConfirm({
                      title: 'Delete world?',
                      message: `Deletes “${world?.name}” and every nation in it.`,
                      confirmText: 'Delete',
                      destructive: true,
                    });
                    if (!ok) return;
                    await run(async () => {
                      await api.adminDeleteWorld(world.id);
                      setWorldId(null);
                      setWorld(null);
                    });
                  }}
                >
                  <Text style={styles.dangerT}>Delete world</Text>
                </TouchableOpacity>
              </View>
            </LiquidGlass>

            <TextInput
              style={styles.search}
              value={q}
              onChangeText={setQ}
              placeholder="Search nation or email"
              placeholderTextColor="rgba(243,246,250,0.4)"
              autoCapitalize="none"
            />
            <Text style={styles.h}>Players</Text>
            {filteredPlayers.map((p) => (
              <LiquidGlass key={p.nation_id} radius={18} style={styles.account}>
                <Text style={styles.name}>{p.nation_name}</Text>
                <Text style={styles.email}>{p.email || 'No email on file'}</Text>
                <Text style={styles.meta}>
                  {p.leader_name ? `${p.leader_name} · ` : ''}
                  {p.race}
                  {p.population != null ? ` · ${Number(p.population).toFixed(1)}k` : ''}
                  {p.is_admin ? ' · Admin' : ''}
                  {p.is_banned ? ' · Banned' : ''}
                </Text>
                <View style={styles.actions}>
                  {p.user_id && p.user_id !== user?.id && !p.is_admin ? (
                    <TouchableOpacity
                      style={p.is_banned ? styles.chip : styles.danger}
                      onPress={() => banUser(p.user_id, p.email || p.nation_name, !!p.is_banned)}
                    >
                      <Text style={p.is_banned ? styles.chipT : styles.dangerT}>
                        {p.is_banned ? 'Unban' : 'Ban'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={async () => {
                      const ok = await glassConfirm({
                        title: 'Delete nation?',
                        message: `${p.nation_name} is removed. The account stays.`,
                        confirmText: 'Remove nation',
                        destructive: true,
                      });
                      if (!ok) return;
                      await run(() => api.adminDeleteNation(p.nation_id));
                    }}
                  >
                    <Text style={styles.chipT}>Nation</Text>
                  </TouchableOpacity>
                  {p.user_id && p.user_id !== user?.id ? (
                    <TouchableOpacity
                      style={styles.danger}
                      onPress={async () => {
                        const ok = await glassConfirm({
                          title: 'Delete account?',
                          message: `Removes ${p.email || p.nation_name} and this nation.`,
                          confirmText: 'Delete',
                          destructive: true,
                        });
                        if (!ok) return;
                        await run(() => api.adminDeleteUser(p.user_id));
                      }}
                    >
                      <Text style={styles.dangerT}>Account</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </LiquidGlass>
            ))}
            {filteredPlayers.length === 0 ? <Text style={styles.empty}>No players in this world.</Text> : null}
          </>
        )}
      </ScrollView>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  card: { padding: 16, marginBottom: 14 },
  body: { color: 'rgba(243,246,250,0.75)', marginTop: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  stat: { width: '47%', padding: 14 },
  statK: { color: 'rgba(243,246,250,0.55)', fontSize: 12, textTransform: 'uppercase' },
  statV: { color: '#F3F6FA', fontSize: 22, fontWeight: '600', marginTop: 4 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: 'rgba(243,246,250,0.12)' },
  tabT: { color: 'rgba(243,246,250,0.55)', fontWeight: '600' },
  tabTOn: { color: '#F3F6FA' },
  hint: { color: 'rgba(243,246,250,0.5)', fontSize: 13, marginBottom: 10 },
  h: { color: '#F3F6FA', fontSize: 18, fontWeight: '600', marginTop: 8, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, gap: 8 },
  account: { padding: 14, marginBottom: 10 },
  name: { color: '#F3F6FA', fontWeight: '600' },
  email: { color: '#F3F6FA', marginTop: 4, fontSize: 14 },
  meta: { color: 'rgba(243,246,250,0.55)', marginTop: 3, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 12, paddingVertical: 8 },
  chipT: { color: '#F3F6FA', fontSize: 12, fontWeight: '600' },
  danger: { borderRadius: 999, borderWidth: 1, borderColor: '#FF5A65', paddingHorizontal: 12, paddingVertical: 8 },
  dangerT: { color: '#FF5A65', fontSize: 12, fontWeight: '600' },
  search: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    color: '#F3F6FA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  empty: { color: 'rgba(243,246,250,0.45)', marginTop: 8 },
});
