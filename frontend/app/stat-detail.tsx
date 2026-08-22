import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNationStore } from '../store/nationStore';
import { api } from '../utils/api';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { leaningColor, hexAlpha } from '../utils/politicalCompass';

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

  useEffect(() => {
    if (nation && statName) {
      loadHistory();
    }
  }, [nation, statName, selectedPeriod]);

  const loadHistory = async () => {
    if (!nation?.id && !nation?._id) return;
    
    setLoading(true);
    try {
      const nationId = nation.id || nation._id;
      const response = await api.getStatHistory(nationId, statName, selectedPeriod);
      
      if (response.success) {
        setHistoryData(response.history);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!nation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No nation found</Text>
      </View>
    );
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
  const chartData = historyData.map((item, index) => ({
    value: item.value,
    label: index % labelFreq === 0 ? format(new Date(item.timestamp), 'MM/dd') : '',
    dataPointText: '', // Remove individual data point labels for cleaner look
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/overview')}>
          <Ionicons name="arrow-back" size={24} color={tint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{statLabel}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.currentValueCard}>
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
        </View>

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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tint} />
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        ) : historyData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={64} color="rgba(243,246,250,0.48)" />
            <Text style={styles.emptyText}>No historical data yet</Text>
            <Text style={styles.emptySubtext}>Make more decisions to see trends</Text>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Historical Trend</Text>
            <LineChart
              data={chartData}
              width={chartWidth}
              height={250}
              spacing={getChartSpacing()}
              initialSpacing={10}
              endSpacing={10}
              color={tint}
              thickness={2}
              startFillColor={hexAlpha(tint, 0.28)}
              endFillColor={hexAlpha(tint, 0.04)}
              startOpacity={0.9}
              endOpacity={0.2}
              areaChart
              curved
              yAxisColor="rgba(255,255,255,0.08)"
              xAxisColor="rgba(255,255,255,0.08)"
              yAxisTextStyle={{ color: 'rgba(243,246,250,0.70)', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: 'rgba(243,246,250,0.70)', fontSize: 8 }}
              rulesColor="rgba(255,255,255,0.08)"
              rulesType="solid"
              yAxisThickness={1}
              xAxisThickness={1}
              maxValue={maxValue * 1.1}
              noOfSections={5}
              showVerticalLines
              verticalLinesColor="rgba(255,255,255,0.08)"
              dataPointsColor={tint}
              dataPointsRadius={chartData.length > 30 ? 2 : 4}
              textColor="rgba(243,246,250,0.70)"
              textFontSize={10}
              hideDataPoints={chartData.length > 60}
              disableScroll={true}
            />
          </View>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F14',
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
    backgroundColor: '#11171F',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    color: '#00E0C7',
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
    backgroundColor: '#00E0C7',
  },
  periodButtonText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#F3F6FA',
  },
  chartCard: {
    backgroundColor: '#11171F',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
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
    backgroundColor: '#11171F',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    color: '#00E0C7',
  },
  errorText: {
    color: '#FF5A65',
    fontSize: 16,
    textAlign: 'center',
  },
});
