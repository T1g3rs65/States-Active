import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNationStore } from '../../store/nationStore';
import { api } from '../../utils/api';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { PieChart } from 'react-native-chart-kit';
import { getNationSizeClass } from '../../utils/nationSize';
import { getPoliticalCompassTheme } from '../../utils/politicalCompass';
import { getRaceTheme } from '../../utils/raceColors';

const { width } = Dimensions.get('window');

export default function Overview() {
  const router = useRouter();
  const { nation, setNation } = useNationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGraph, setSelectedGraph] = useState('government');
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Get race-based theme color for UI
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = raceTheme.color;
  
  // Load notification count on focus
  useFocusEffect(
    useCallback(() => {
      if (nation?.id || nation?._id) {
        loadNotificationCount();
      }
    }, [])
  );

  const loadNotificationCount = async () => {
    if (!nation?.id && !nation?._id) return;
    try {
      const nationId = nation.id || nation._id;
      const response = await api.getWarJoinRequests(nationId);
      if (response.success) {
        setNotificationCount(response.count || 0);
      }
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };
  
  // Get political compass theme for political leaning text only
  const politicalTheme = nation 
    ? getPoliticalCompassTheme(
        nation.stats.civil_rights,
        nation.stats.gdp,
        nation.stats.political_freedom
      )
    : { color: '#00E0C7', name: 'Centrist', description: 'Moderate' };

  useEffect(() => {
    if (nation) {
      refreshNation();
    }
  }, []);

  const refreshNation = async () => {
    if (!nation?.id && !nation?._id) return;
    
    setRefreshing(true);
    try {
      const nationId = nation.id || nation._id;
      const response = await api.getNation(nationId);
      if (response.success) {
        setNation(response.nation);
      }
    } catch (error) {
      console.error('Error refreshing nation:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!nation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No nation found</Text>
      </View>
    );
  }

  const stats = nation.stats;

  const categories = {
    economy: [
      { key: 'gdp', label: 'GDP', value: nation.gdp_display || '$0', unit: '', isRealistic: true },
      { key: 'economy_growth', label: 'Growth', value: stats.economy_growth, unit: '%' },
      { key: 'unemployment', label: 'Unemployment', value: stats.unemployment, unit: '%' },
      { key: 'inflation', label: 'Inflation', value: stats.inflation, unit: '%' },
    ],
    freedoms: [
      { key: 'civil_rights', label: 'Civil Rights', value: stats.civil_rights, unit: '/100' },
      { key: 'political_freedom', label: 'Political Freedom', value: stats.political_freedom, unit: '/100' },
      { key: 'freedom_speech', label: 'Free Speech', value: stats.freedom_speech, unit: '/100' },
      { key: 'freedom_press', label: 'Free Press', value: stats.freedom_press, unit: '/100' },
    ],
    social: [
      { key: 'happiness', label: 'Happiness', value: stats.happiness, unit: '/100' },
      { key: 'life_expectancy', label: 'Life Expectancy', value: stats.life_expectancy, unit: ' years' },
      { key: 'healthcare_quality', label: 'Healthcare', value: stats.healthcare_quality, unit: '/100' },
      { key: 'literacy_rate', label: 'Literacy', value: stats.literacy_rate, unit: '%' },
    ],
    environment: [
      { key: 'environment', label: 'Environment', value: stats.environment, unit: '/100' },
      { key: 'pollution', label: 'Pollution', value: stats.pollution, unit: '/100', inverse: true },
      { key: 'biodiversity', label: 'Biodiversity', value: stats.biodiversity, unit: '/100' },
      { key: 'eco_footprint', label: 'Eco Footprint', value: stats.eco_footprint, unit: '/100', inverse: true },
    ],
    military: [
      { key: 'military_strength', label: 'Military Strength', value: stats.military_strength, unit: '/100' },
      { key: 'crime_rate', label: 'Crime Rate', value: stats.crime_rate, unit: '/1000', inverse: true },
      { key: 'law_enforcement', label: 'Law Enforcement', value: stats.law_enforcement, unit: '/100' },
    ],
    science: [
      { key: 'scientific_advancement', label: 'Science', value: stats.scientific_advancement, unit: '/100' },
      { key: 'university_attendance', label: 'University', value: stats.university_attendance, unit: '%' },
      { key: 'science_literacy', label: 'Literacy', value: stats.literacy_rate, unit: '%' },
      { key: 'budget_education', label: 'Education Budget', value: stats.budget_education, unit: '%' },
    ],
    budget: [
      { key: 'budget_defense', label: 'Defense Budget', value: stats.budget_defense, unit: '%' },
      { key: 'budget_education', label: 'Education Budget', value: stats.budget_education, unit: '%' },
      { key: 'budget_healthcare', label: 'Healthcare Budget', value: stats.budget_healthcare, unit: '%' },
      { key: 'budget_welfare', label: 'Welfare Budget', value: stats.budget_welfare, unit: '%' },
      { key: 'budget_environment', label: 'Environment Budget', value: stats.budget_environment, unit: '%' },
      { key: 'budget_infrastructure', label: 'Infrastructure Budget', value: stats.budget_infrastructure, unit: '%' },
      { key: 'budget_other', label: 'Other Budget', value: stats.budget_other, unit: '%' },
    ],
    finance: [
      { key: 'tax_rate', label: 'Tax Rate', value: stats.tax_rate, unit: '%' },
      { key: 'national_debt', label: 'National Debt', value: stats.national_debt, unit: '% GDP' },
      { key: 'income_equality', label: 'Income Equality', value: stats.income_equality, unit: '/100' },
      { key: 'gini_coefficient', label: 'Gini Coefficient', value: stats.gini_coefficient, unit: '' },
    ],
  };

  const getStatColor = (value, inverse = false) => {
    let normalized = value;
    if (inverse) normalized = 100 - value;
    
    if (normalized >= 70) return '#27D17A';
    if (normalized >= 40) return '#F2C94C';
    return '#FF5A65';
  };

  const navigateToStatDetail = (statKey, statLabel) => {
    router.push({
      pathname: '/stat-detail',
      params: { stat: statKey, label: statLabel },
    });
  };

  const renderStatCard = (stat, statKey, index) => (
    <TouchableOpacity 
      key={`${stat.key}_${index}`} 
      style={styles.allStatCard}
      onPress={() => navigateToStatDetail(statKey, stat.label)}
    >
      <Text style={styles.allStatLabel}>{stat.label}</Text>
      <Text style={[styles.allStatValue, { color: themeColor }]}>
        {stat.isRealistic ? stat.value : `${stat.value.toFixed(1)}${stat.unit}`}
      </Text>
      <Text style={styles.allStatHint}>Tap for graph</Text>
    </TouchableOpacity>
  );

  const renderFlag = () => {
    if (!nation.flag_base64) return null;
    
    const isSvg = nation.flag_base64.includes('svg');
    
    if (isSvg) {
      const base64Data = nation.flag_base64.split('base64,')[1];
      const svgString = atob(base64Data);
      return <SvgXml xml={svgString} width={60} height={40} style={styles.headerFlag} />;
    } else {
      return <Image source={{ uri: nation.flag_base64 }} style={styles.headerFlag} resizeMode="contain" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Statistics</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications" size={24} color={themeColor} />
            {notificationCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: '#FF5A65' }]}>
                <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-circle" size={28} color={themeColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshNation} tintColor="#00E0C7" />
        }
      >
      <LinearGradient colors={['#11171F', '#0B0F14']} style={styles.headerCard}>
        <View style={styles.headerTop}>
          {nation.flag_base64 && (() => {
            const isSvg = nation.flag_base64.includes('svg');
            if (isSvg) {
              const base64Data = nation.flag_base64.split('base64,')[1];
              const svgString = atob(base64Data);
              return <SvgXml xml={svgString} width={60} height={40} style={styles.headerFlag} />;
            } else {
              return <Image source={{ uri: nation.flag_base64 }} style={styles.headerFlag} resizeMode="contain" />;
            }
          })()}
          <View style={styles.headerTextContainer}>
            <Text style={styles.nationName}>{nation.name}</Text>
            <Text style={styles.governmentType}>{nation.government_type}</Text>
            <Text style={[styles.sizeClass, { color: themeColor }]}>{getNationSizeClass(stats.population)}</Text>
          </View>
        </View>
        {nation.motto && <Text style={styles.motto}>&quot;{nation.motto}&quot;</Text>}
        <View style={styles.statsRow}>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatValue, { color: themeColor }]}>{nation.total_decisions}</Text>
            <Text style={styles.miniStatLabel}>Decisions</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatValue, { color: themeColor }]}>{stats.population.toFixed(1)}k</Text>
            <Text style={styles.miniStatLabel}>Population</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatValue, { color: themeColor }]}>{stats.international_approval.toFixed(0)}</Text>
            <Text style={styles.miniStatLabel}>Approval</Text>
          </View>
        </View>
        <View style={[styles.politicalBadge, { backgroundColor: politicalTheme.color + '22', borderColor: politicalTheme.color }]}>
          <Text style={[styles.politicalName, { color: politicalTheme.color }]}>{politicalTheme.name}</Text>
          <Text style={styles.politicalDesc}>{politicalTheme.description}</Text>
        </View>
      </LinearGradient>

      <View style={styles.graphTabs}>
        <TouchableOpacity 
          style={[styles.graphTab, selectedGraph === 'government' && { backgroundColor: themeColor, borderColor: themeColor }]}
          onPress={() => setSelectedGraph('government')}
        >
          <Text style={[styles.graphTabText, selectedGraph === 'government' && styles.graphTabTextActive]}>
            Government
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.graphTab, selectedGraph === 'economy' && { backgroundColor: themeColor, borderColor: themeColor }]}
          onPress={() => setSelectedGraph('economy')}
        >
          <Text style={[styles.graphTabText, selectedGraph === 'economy' && styles.graphTabTextActive]}>
            Economy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.graphTab, selectedGraph === 'society' && { backgroundColor: themeColor, borderColor: themeColor }]}
          onPress={() => setSelectedGraph('society')}
        >
          <Text style={[styles.graphTabText, selectedGraph === 'society' && styles.graphTabTextActive]}>
            Society
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.graphTab, selectedGraph === 'territory' && { backgroundColor: themeColor, borderColor: themeColor }]}
          onPress={() => setSelectedGraph('territory')}
        >
          <Text style={[styles.graphTabText, selectedGraph === 'territory' && styles.graphTabTextActive]}>
            Territory
          </Text>
        </TouchableOpacity>
      </View>

      {selectedGraph === 'government' && (
        <View style={styles.graphSection}>
          <Text style={styles.graphTitle}>Government Expenditure</Text>
          <Text style={styles.graphSubtitle}>
            Total Government Spending: {(() => {
              const gdpValue = nation.gdp_value || parseFloat(nation.gdp_display?.replace(/[^0-9.]/g, '') || '0') * 1000000000;
              const govSpending = (gdpValue * nation.stats.tax_rate / 100);
              if (govSpending >= 1000000000) return `$${(govSpending / 1000000000).toFixed(1)}B`;
              if (govSpending >= 1000000) return `$${(govSpending / 1000000).toFixed(1)}M`;
              return `$${(govSpending / 1000).toFixed(1)}K`;
            })()}
          </Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={(() => {
                const budgets = [
                  { name: 'Defense', value: nation.stats.budget_defense || 10, color: '#FF5A65' },
                  { name: 'Education', value: nation.stats.budget_education || 15, color: '#00B8B8' },
                  { name: 'Healthcare', value: nation.stats.budget_healthcare || 20, color: '#27D17A' },
                  { name: 'Welfare', value: nation.stats.budget_welfare || 15, color: '#00B8B8' },
                  { name: 'Environment', value: nation.stats.budget_environment || 5, color: '#27D17A' },
                  { name: 'Infrastructure', value: nation.stats.budget_infrastructure || 20, color: '#F2C94C' },
                  { name: 'Other', value: nation.stats.budget_other || 15, color: 'rgba(243,246,250,0.48)' },
                ];
                const total = budgets.reduce((sum, b) => sum + b.value, 0);
                return budgets.map(b => ({
                  name: b.name,
                  population: Math.round((b.value / total) * 100),
                  color: b.color,
                  legendFontColor: 'rgba(243,246,250,0.70)',
                  legendFontSize: 12
                }));
              })()}
              width={width - 64}
              height={220}
              chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </View>
      )}

      {selectedGraph === 'economy' && (
        <View style={styles.graphSection}>
          <Text style={styles.graphTitle}>The Economy</Text>
          <Text style={styles.graphSubtitle}>GDP: {nation.gdp_display} • {nation.stats.tax_rate.toFixed(0)}% Tax Rate</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={(() => {
                const sectors = [
                  { name: 'Private Sector', value: 100 - nation.stats.tax_rate - nation.stats.unemployment, color: '#27D17A' },
                  { name: 'Government', value: nation.stats.tax_rate, color: '#00E0C7' },
                  { name: 'Defense Industry', value: nation.stats.budget_defense * 0.7, color: '#FF5A65' },
                  { name: 'Healthcare', value: nation.stats.budget_healthcare * 0.5, color: '#00B8B8' },
                  { name: 'Black Market', value: nation.stats.crime_rate * 0.5, color: 'rgba(243,246,250,0.48)' },
                  { name: 'Unemployed', value: nation.stats.unemployment, color: '#FF5A65' },
                ];
                const total = sectors.reduce((sum, s) => sum + Math.max(0, s.value), 0);
                return sectors.map(s => ({
                  name: s.name,
                  population: Math.round((Math.max(0, s.value) / total) * 100),
                  color: s.color,
                  legendFontColor: 'rgba(243,246,250,0.70)',
                  legendFontSize: 12
                }));
              })()}
              width={width - 64}
              height={220}
              chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </View>
      )}

      {selectedGraph === 'society' && (
        <View style={styles.graphSection}>
          <Text style={styles.graphTitle}>Leading Causes of Death</Text>
          <Text style={styles.graphSubtitle}>Health & Life Expectancy: {nation.stats.life_expectancy.toFixed(0)} years</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={(() => {
                const causes = [
                  { name: 'Old Age', value: Math.max(10, nation.stats.life_expectancy * 0.65), color: '#27D17A' },
                  { name: 'Heart Disease', value: Math.max(5, (100 - nation.stats.healthcare_quality) * 0.4), color: '#FF5A65' },
                  { name: 'Cancer', value: Math.max(3, nation.stats.pollution * 0.08 + 5), color: '#F2C94C' },
                  { name: 'Violence/Crime', value: Math.max(1, nation.stats.crime_rate * 0.15), color: '#00E0C7' },
                  { name: 'Accidents', value: 3, color: '#00E0C7' },
                ];
                const total = causes.reduce((sum, c) => sum + c.value, 0);
                return causes.map(c => ({
                  name: c.name,
                  population: Math.round((c.value / total) * 100),
                  color: c.color,
                  legendFontColor: 'rgba(243,246,250,0.70)',
                  legendFontSize: 12
                }));
              })()}
              width={width - 64}
              height={220}
              chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </View>
      )}

      {selectedGraph === 'territory' && (
        <View style={styles.graphSection}>
          <Text style={styles.graphTitle}>Territorial Composition</Text>
          <Text style={styles.graphSubtitle}>
            Total Territory: {nation.total_territories || 0} tiles
          </Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={(() => {
                const territoryCounts = nation.territory_counts || {};
                
                // Biome colors matching the world map
                const biomeColors = {
                  // Forests
                  'tropical_rainforest': '#003300',
                  'temperate_rainforest': '#1F3F1F',
                  'boreal_forest': '#2F4F2F',
                  'evergreen_forest': '#05450A',
                  'deciduous_forest': '#78D203',
                  'mixed_forest': '#009900',
                  // Grasslands
                  'grassland': '#B6FF05',
                  'temperate_grassland': '#C8C87A',
                  'flooded_grassland': '#A0D6A0',
                  'savanna': '#FBFF13',
                  'woody_savanna': '#DADE48',
                  'shrubland': '#BFBB22',
                  // Deserts
                  'hot_desert': '#E3B98F',
                  'semi_arid_desert': '#D8B56B',
                  'cold_desert': '#C9B89B',
                  'barren': '#F9FFA4',
                  // Wetlands
                  'swamp': '#2F3F2F',
                  'marsh': '#5F7F5F',
                  'peat_bog': '#4F3F2F',
                  'mangrove': '#00CF75',
                  'wetland': '#27FF87',
                  // Mountains
                  'rocky_mountain': '#4A4A4A',
                  'alpine_meadow': '#6B6B6B',
                  'sparse_vegetation': '#8B8B7A',
                  // Tundra/Ice
                  'tundra': '#F6E2A0',
                  'arctic_tundra': '#D0D8C0',
                  'glacier': '#B0E0FF',
                  'ice_shelf': '#E8F4FF',
                  'snow_ice': '#F0F0F0',
                  // Coastal
                  'beach': '#F0E68C',
                  'rocky_coast': '#707070',
                  'salt_marsh': '#8FBC8F',
                  // Water
                  'river': '#2060A0',
                  'shallow_sea': '#0064C8',
                  'deep_ocean': '#1C0DFF',
                  // Special
                  'badlands': '#B86F50',
                  'karst': '#C0C0C0',
                };
                
                // Pretty names for biomes
                const biomeNames = {
                  'tropical_rainforest': 'Rainforest',
                  'temperate_rainforest': 'Temp. Rainforest',
                  'boreal_forest': 'Boreal Forest',
                  'evergreen_forest': 'Evergreen',
                  'deciduous_forest': 'Deciduous',
                  'mixed_forest': 'Mixed Forest',
                  'grassland': 'Grassland',
                  'temperate_grassland': 'Temp. Grassland',
                  'flooded_grassland': 'Wetland Grass',
                  'savanna': 'Savanna',
                  'woody_savanna': 'Woody Savanna',
                  'shrubland': 'Shrubland',
                  'hot_desert': 'Hot Desert',
                  'semi_arid_desert': 'Semi-Arid',
                  'cold_desert': 'Cold Desert',
                  'barren': 'Barren',
                  'swamp': 'Swamp',
                  'marsh': 'Marsh',
                  'peat_bog': 'Peat Bog',
                  'mangrove': 'Mangrove',
                  'wetland': 'Wetland',
                  'rocky_mountain': 'Mountains',
                  'alpine_meadow': 'Alpine',
                  'sparse_vegetation': 'Sparse Veg.',
                  'tundra': 'Tundra',
                  'arctic_tundra': 'Arctic Tundra',
                  'glacier': 'Glacier',
                  'ice_shelf': 'Ice Shelf',
                  'snow_ice': 'Snow/Ice',
                  'beach': 'Beach',
                  'rocky_coast': 'Rocky Coast',
                  'salt_marsh': 'Salt Marsh',
                  'river': 'River',
                  'shallow_sea': 'Coastal Water',
                  'deep_ocean': 'Ocean',
                  'badlands': 'Badlands',
                  'karst': 'Karst',
                };
                
                // Convert to array and sort by count
                const biomeArray = Object.entries(territoryCounts)
                  .map(([biome, count]) => ({
                    name: biomeNames[biome] || biome.replace(/_/g, ' '),
                    value: count,
                    color: biomeColors[biome] || 'rgba(243,246,250,0.48)',
                  }))
                  .filter(b => b.value > 0)
                  .sort((a, b) => b.value - a.value);
                
                // Take top 6 and group rest as "Other"
                const topBiomes = biomeArray.slice(0, 6);
                const otherBiomes = biomeArray.slice(6);
                const otherTotal = otherBiomes.reduce((sum, b) => sum + b.value, 0);
                
                if (otherTotal > 0) {
                  topBiomes.push({ name: 'Other', value: otherTotal, color: 'rgba(243,246,250,0.48)' });
                }
                
                const total = topBiomes.reduce((sum, b) => sum + b.value, 0);
                
                if (total === 0) {
                  return [{ name: 'No Data', population: 100, color: 'rgba(243,246,250,0.48)', legendFontColor: 'rgba(243,246,250,0.70)', legendFontSize: 12 }];
                }
                
                return topBiomes.map(b => ({
                  name: b.name,
                  population: Math.round((b.value / total) * 100),
                  color: b.color,
                  legendFontColor: 'rgba(243,246,250,0.70)',
                  legendFontSize: 11
                }));
              })()}
              width={width - 64}
              height={220}
              chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
          {(!nation.territory_counts || Object.keys(nation.territory_counts).length === 0) && (
            <Text style={styles.noDataHint}>
              Visit the World Map to sync your territory data
            </Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Statistics</Text>
        <View style={styles.keyStatsGrid}>
          <TouchableOpacity 
            style={styles.keyStatCard}
            onPress={() => navigateToStatDetail('population', 'Population')}
          >
            <Text style={styles.keyStatLabel}>Population</Text>
            <Text style={[styles.keyStatValue, { color: themeColor }]}>{nation.stats.population.toFixed(1)}k</Text>
            <Text style={styles.keyStatHint}>Tap for graph</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.keyStatCard}
            onPress={() => navigateToStatDetail('gdp', 'GDP')}
          >
            <Text style={styles.keyStatLabel}>GDP</Text>
            <Text style={[styles.keyStatValue, { color: themeColor }]}>{nation.gdp_display}</Text>
            <Text style={styles.keyStatHint}>Tap for graph</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.keyStatCard}
            onPress={() => navigateToStatDetail('happiness', 'Happiness')}
          >
            <Text style={styles.keyStatLabel}>Happiness</Text>
            <Text style={[styles.keyStatValue, { color: themeColor }]}>{nation.stats.happiness.toFixed(1)}</Text>
            <Text style={styles.keyStatHint}>Tap for graph</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.keyStatCard}
            onPress={() => navigateToStatDetail('tax_rate', 'Tax Rate')}
          >
            <Text style={styles.keyStatLabel}>Tax Rate</Text>
            <Text style={[styles.keyStatValue, { color: themeColor }]}>{nation.stats.tax_rate.toFixed(1)}%</Text>
            <Text style={styles.keyStatHint}>Tap for graph</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.keyStatCard}
            onPress={() => navigateToStatDetail('crime_rate', 'Crime Rate')}
          >
            <Text style={styles.keyStatLabel}>Crime Rate</Text>
            <Text style={[styles.keyStatValue, { color: themeColor }]}>{nation.stats.crime_rate.toFixed(1)}</Text>
            <Text style={styles.keyStatHint}>Tap for graph</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.keyStatCard}
            onPress={() => navigateToStatDetail('life_expectancy', 'Life Exp.')}
          >
            <Text style={styles.keyStatLabel}>Life Exp.</Text>
            <Text style={[styles.keyStatValue, { color: themeColor }]}>{nation.stats.life_expectancy.toFixed(0)} yrs</Text>
            <Text style={styles.keyStatHint}>Tap for graph</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.allStatsContainer}>
        <Text style={styles.allStatsTitle}>All Statistics</Text>
        <View style={styles.statsGrid}>
          {Object.values(categories).flat()
            .filter(stat => !['population', 'gdp', 'happiness', 'tax_rate', 'crime_rate', 'life_expectancy'].includes(stat.key))
            .map((stat, index) => renderStatCard(stat, stat.key, index))
          }
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#11171F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  profileButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerFlag: {
    width: 60,
    height: 40,
    borderRadius: 4,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTextContainer: {
    flex: 1,
  },
  nationName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F3F6FA',
    marginBottom: 8,
  },
  governmentType: {
    fontSize: 16,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 4,
  },
  sizeClass: {
    fontSize: 14,
    fontWeight: '600',
  },
  motto: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E0C7',
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
  },
  politicalBadge: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  politicalName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  politicalDesc: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
  },
  descriptionText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    lineHeight: 22,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#11171F',
    borderRadius: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#11171F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  actionButtonText: {
    color: '#F3F6FA',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 12,
  },
  allStatCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#11171F',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  allStatLabel: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 8,
    textAlign: 'center',
  },
  allStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  allStatHint: {
    fontSize: 10,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3F6FA',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  keyStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 12,
  },
  keyStatCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#11171F',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  keyStatLabel: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 8,
    textAlign: 'center',
  },
  keyStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  keyStatHint: {
    fontSize: 10,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 4,
    textAlign: 'center',
  },
  graphTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  graphTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#11171F',
    alignItems: 'center',
  },
  graphTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.70)',
  },
  graphTabTextActive: {
    color: '#F3F6FA',
  },
  graphSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  graphTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F3F6FA',
    marginBottom: 4,
  },
  graphSubtitle: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF5A65',
    fontSize: 16,
    textAlign: 'center',
  },
  allStatsContainer: {
    marginTop: 24,
  },
  allStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3F6FA',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  noDataHint: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
