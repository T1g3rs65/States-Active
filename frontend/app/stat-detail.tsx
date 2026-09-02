import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNationStore } from '../store/nationStore';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { leaningColor } from '../utils/politicalCompass';
import CompassLineChart, { ChartView } from '../components/CompassLineChart';
import ScreenHeader from '../components/ScreenHeader';
import ScreenCanvas from '../components/ScreenCanvas';
import LiquidGlass from '../components/LiquidGlass';
import GradientBorder from '../components/GradientBorder';
import EmptyNation from '../components/EmptyNation';
import { getNationSizeClass } from '../utils/nationSize';
import StatusDots from '../components/StatusDots';

const { width } = Dimensions.get('window');

export default function StatDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { nation } = useNationStore();
  const tint = leaningColor(nation);
  
  const statName = params.stat as string;
  const statLabel = params.label as string;
  
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(90);
  const [chartView, setChartView] = useState<ChartView>('line');
  const otherId = params.otherId as string | undefined;
  const otherName = (params.otherName as string) || 'Them';
  const [otherHistory, setOtherHistory] = useState<any[]>([]);
  const [chartW, setChartW] = useState(Math.max(240, width - 72));

  useEffect(() => {
    if (nation && statName) {
      loadHistory();
    }
  }, [nation, statName, selectedPeriod, otherId]);

  const loadHistory = async () => {
    if (!nation?.id && !nation?._id) return;
    
    setLoading(true);
    try {
      const nationId = nation.id || nation._id;
      const mine = await api.getStatHistory(nationId, statName, selectedPeriod);
      if (mine.success) setHistoryData(mine.history || []);
      if (otherId) {
        const them = await api.getStatHistory(otherId, statName, selectedPeriod);
        setOtherHistory(them?.success ? them.history || [] : []);
      } else {
        setOtherHistory([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!nation) {
    return <EmptyNation />;
  }

  const currentValue = statName === 'gdp' ? nation.gdp_display : nation.stats[statName as keyof typeof nation.stats];
  const isGDP = statName === 'gdp';
  
  // Calculate trend
  let trend = 0;
  if (historyData.length >= 2) {
    const firstValue = historyData[0].value;
    const lastValue = historyData[historyData.length - 1].value;
    trend = lastValue - firstValue;
  }

  // Format GDP values for display
  const formatGDPValue = (value: number) => {
    if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(1)}T`;
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    return `$${(value / 1000).toFixed(1)}K`;
  };

  const maxValue = historyData.length > 0 ? Math.max(...historyData.map(d => d.value)) : 0;
  const minValue = historyData.length > 0 ? Math.min(...historyData.map(d => d.value)) : 0;

  // Calculate chart dimensions
  const chartWidth = width - 64;
  const dataCount = historyData.length;

  // Calculate appropriate label frequency based on data points
  const getLabelFrequency = () => {
    if (dataCount <= 7) return 1; // Show all labels
    if (dataCount <= 14) return 2; // Show every other label
    if (dataCount <= 30) return 5; // Show every 5th
    if (dataCount <= 90) return 15; // Show every 15th
    return 30; // Show monthly for yearly data
  };

  // Calculate spacing to fit all data points within chart width without scrolling
  const getChartSpacing = () => {
    if (dataCount <= 1) return 40;
    
    // Calculate spacing to fit all points within available width
    // Account for initial spacing and some end padding
    const availableWidth = chartWidth - 40; // 20px padding on each side
    const calculatedSpacing = Math.floor(availableWidth / Math.max(dataCount - 1, 1));
    
    // Clamp spacing to reasonable bounds
    return Math.max(3, Math.min(calculatedSpacing, 60));
  };

  // Prepare chart data with dynamic label frequency
  const labelFreq = getLabelFrequency();
  const toMs = (raw: any) => {
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  };
  const collapseByDay = (items: any[]) => {
    const map = new Map<number, number>();
    const sorted = [...items].sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
    for (const item of sorted) {
      const t = toMs(item.timestamp);
      if (!t) continue;
      const d = new Date(t);
      const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      map.set(day, Number(item.value) || 0);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, value]) => ({ t, value }));
  };
  const compare = Boolean(otherId);
  const mineSeries = compare ? collapseByDay(historyData) : historyData.map((item) => ({
    value: item.value,
    t: toMs(item.timestamp),
  }));
  const themSeries = compare ? collapseByDay(otherHistory) : [];
  const chartData = mineSeries.map((item, index) => ({
    value: item.value,
    t: item.t,
    label: index % labelFreq === 0 && item.t ? format(new Date(item.t), 'MM/dd') : '',
  }));
  const overlayData = themSeries.map((item) => ({
    value: item.value,
    t: item.t,
    label: '',
  }));

  return (
    <ScreenCanvas>
    <View style={styles.container}>
      <ScreenHeader
        title={otherId ? `${nation.name} vs ${otherName}` : (nation.name || 'Statistics')}
        subtitle={statLabel || getNationSizeClass(nation.stats?.population)}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else if (otherId) router.replace(`/compare?nationId=${otherId}` as any);
          else router.replace('/(tabs)/overview');
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <GradientBorder tone="compass" speed={6} radius={28} style={styles.currentValueCard}>
          <Text style={styles.currentLabel}>Current Value</Text>
          <View style={styles.currentRow}>
            <Text style={[styles.currentValue, { color: tint }]}>{isGDP ? currentValue : Number(currentValue).toFixed(1)}</Text>
            {trend !== 0 && (
              <View style={[styles.trendBadge, trend > 0 ? styles.trendUp : styles.trendDown]}>
                <Ionicons
                  name={trend > 0 ? 'trending-up' : 'trending-down'}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.trendText}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </GradientBorder>

        <View style={styles.periodSelector}>
          {[7, 30, 90, 365].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.periodButton,
                selectedPeriod === days && { backgroundColor: tint },
              ]}
              onPress={() => setSelectedPeriod(days)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === days && styles.periodButtonTextActive,
                ]}
              >
                {days === 365 ? 'All' : `${days}d`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {historyData.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={64} color="rgba(243,246,250,0.48)" />
            <Text style={styles.emptyText}>No historical data yet</Text>
            <Text style={styles.emptySubtext}>Make more decisions to see trends</Text>
          </View>
        ) : (
          <LiquidGlass
            radius={24}
            style={styles.chartCard}
          >
            <View
              onLayout={(e) => {
                const inner = e.nativeEvent.layout.width - 40;
                if (inner > 80) setChartW(inner);
              }}
            >
              <View style={styles.chartHead}>
                <Text style={styles.chartTitle}>Historical Trend</Text>
                <View style={styles.viewToggle}>
                  <TouchableOpacity
                    style={[styles.viewBtn, chartView === 'line' && { backgroundColor: tint }]}
                    onPress={() => setChartView('line')}
                  >
                    <Ionicons name="analytics-outline" size={16} color={chartView === 'line' ? '#08090A' : tint} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewBtn, chartView === 'bar' && { backgroundColor: tint }]}
                    onPress={() => setChartView('bar')}
                  >
                    <Ionicons name="bar-chart-outline" size={16} color={chartView === 'bar' ? '#08090A' : tint} />
                  </TouchableOpacity>
                </View>
              </View>
              {loading ? (
                <View style={styles.chartLoad}>
                  <StatusDots status="Loading" color={tint} fill />
                </View>
              ) : (
                <CompassLineChart
                  data={chartData}
                  width={chartW}
                  height={250}
                  color={tint}
                  view={chartView}
                  overlay={overlayData.length ? overlayData : undefined}
                  overlayColor="#E8C36A"
                />
              )}
              {otherId ? (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                  <Text style={{ color: tint, fontSize: 12 }}>● {nation.name}</Text>
                  <Text style={{ color: '#E8C36A', fontSize: 12 }}>● {otherName}</Text>
                </View>
              ) : null}
            </View>
          </LiquidGlass>
        )}

        <View style={styles.statsInfo}>
          <View style={styles.statInfoItem}>
            <Text style={styles.statInfoLabel}>Highest</Text>
            <Text style={[styles.statInfoValue, { color: tint }]}>
              {isGDP ? formatGDPValue(maxValue) : maxValue.toFixed(1)}
            </Text>
          </View>
          <View style={styles.statInfoItem}>
            <Text style={styles.statInfoLabel}>Lowest</Text>
            <Text style={[styles.statInfoValue, { color: tint }]}>
              {isGDP ? formatGDPValue(minValue) : minValue.toFixed(1)}
            </Text>
          </View>
          <View style={styles.statInfoItem}>
            <Text style={styles.statInfoLabel}>Average</Text>
            <Text style={[styles.statInfoValue, { color: tint }]}>
              {isGDP
                ? formatGDPValue(historyData.reduce((sum, d) => sum + d.value, 0) / historyData.length || 0)
                : (historyData.reduce((sum, d) => sum + d.value, 0) / historyData.length || 0).toFixed(1)
              }
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  chartHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 3,
  },
  viewBtn: {
    width: 32,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#11171F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  content: {
    padding: 16,
  },
  currentValueCard: {
    padding: 24,
    marginBottom: 16,
  },
  chartCard: {
    padding: 20,
    marginBottom: 16,
  },
  currentLabel: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 8,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F3F6FA',
    marginRight: 16,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  trendUp: {
    backgroundColor: '#27D17A',
  },
  trendDown: {
    backgroundColor: '#FF5A65',
  },
  trendText: {
    color: '#F3F6FA',
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#333841',
  },
  periodButtonText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#F3F6FA',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 0,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  chartLoad: {
    height: 250,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.70)',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 8,
  },
  statsInfo: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    borderRadius: 22,
  },
  statInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  statInfoLabel: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 4,
  },
  statInfoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F3F6FA',
  },
  errorText: {
    color: '#FF5A65',
    fontSize: 16,
    textAlign: 'center',
  },
});
