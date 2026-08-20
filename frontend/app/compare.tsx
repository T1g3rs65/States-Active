import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNationStore } from '../store/nationStore';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { getRaceTheme } from '../utils/raceColors';

export default function Compare() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { nation: myNation } = useNationStore();
  
  const [compareNation, setCompareNation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (params.nationId) {
      loadCompareNation(params.nationId as string);
    }
  }, [params.nationId]);
  
  const loadCompareNation = async (nationId: string) => {
    try {
      const response = await api.getNation(nationId);
      if (response.success) {
        setCompareNation(response.nation);
      }
    } catch (error) {
      console.error('Error loading nation:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading || !myNation || !compareNation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00E0C7" />
      </View>
    );
  }
  
  const myStats = myNation.stats;
  const theirStats = compareNation.stats;
  
  // Get race-based theme colors for both nations
  const myTheme = getRaceTheme(myNation.race);
  const theirTheme = getRaceTheme(compareNation.race);
  
  const comparisonCategories = {
    economy: [
      { label: 'GDP', my: myNation.gdp_display, their: compareNation.gdp_display, isRealistic: true },
      { label: 'Economy Growth', my: myStats.economy_growth, their: theirStats.economy_growth },
      { label: 'Unemployment', my: myStats.unemployment, their: theirStats.unemployment, inverse: true },
      { label: 'Inflation', my: myStats.inflation, their: theirStats.inflation, inverse: true },
      { label: 'Income Equality', my: myStats.income_equality, their: theirStats.income_equality },
      { label: 'Gini Coefficient', my: myStats.gini_coefficient, their: theirStats.gini_coefficient, inverse: true },
      { label: 'Tax Rate', my: myStats.tax_rate, their: theirStats.tax_rate },
      { label: 'National Debt', my: myStats.national_debt, their: theirStats.national_debt, inverse: true },
    ],
    civil: [
      { label: 'Civil Rights', my: myStats.civil_rights, their: theirStats.civil_rights },
      { label: 'Freedom of Speech', my: myStats.freedom_speech, their: theirStats.freedom_speech },
      { label: 'Freedom of Press', my: myStats.freedom_press, their: theirStats.freedom_press },
      { label: 'Freedom of Assembly', my: myStats.freedom_assembly, their: theirStats.freedom_assembly },
      { label: 'Freedom of Religion', my: myStats.freedom_religion, their: theirStats.freedom_religion },
      { label: 'Political Freedom', my: myStats.political_freedom, their: theirStats.political_freedom },
      { label: 'Voting Rights', my: myStats.voting_rights, their: theirStats.voting_rights },
      { label: 'Corruption', my: myStats.corruption, their: theirStats.corruption, inverse: true },
      { label: 'Political Apathy', my: myStats.political_apathy, their: theirStats.political_apathy, inverse: true },
    ],
    social: [
      { label: 'Happiness', my: myStats.happiness, their: theirStats.happiness },
      { label: 'Life Expectancy', my: myStats.life_expectancy, their: theirStats.life_expectancy },
      { label: 'Healthcare Quality', my: myStats.healthcare_quality, their: theirStats.healthcare_quality },
      { label: 'Literacy Rate', my: myStats.literacy_rate, their: theirStats.literacy_rate },
      { label: 'University Attendance', my: myStats.university_attendance, their: theirStats.university_attendance },
      { label: 'Obesity Rate', my: myStats.obesity_rate, their: theirStats.obesity_rate, inverse: true },
      { label: 'Crime Rate', my: myStats.crime_rate, their: theirStats.crime_rate, inverse: true },
      { label: 'Law Enforcement', my: myStats.law_enforcement, their: theirStats.law_enforcement },
    ],
    environment: [
      { label: 'Environment', my: myStats.environment, their: theirStats.environment },
      { label: 'Pollution', my: myStats.pollution, their: theirStats.pollution, inverse: true },
      { label: 'Biodiversity', my: myStats.biodiversity, their: theirStats.biodiversity },
      { label: 'Eco Footprint', my: myStats.eco_footprint, their: theirStats.eco_footprint, inverse: true },
    ],
    military: [
      { label: 'Military Strength', my: myStats.military_strength, their: theirStats.military_strength },
      { label: 'Defense Budget', my: myStats.budget_defense, their: theirStats.budget_defense },
    ],
    science: [
      { label: 'Scientific Advancement', my: myStats.scientific_advancement, their: theirStats.scientific_advancement },
    ],
    demographics: [
      { label: 'Population', my: myStats.population, their: theirStats.population },
      { label: 'Population Growth', my: myStats.population_growth, their: theirStats.population_growth },
    ],
    budget: [
      { label: 'Education Budget', my: myStats.budget_education, their: theirStats.budget_education },
      { label: 'Defense Budget', my: myStats.budget_defense, their: theirStats.budget_defense },
      { label: 'Healthcare Budget', my: myStats.budget_healthcare, their: theirStats.budget_healthcare },
      { label: 'Welfare Budget', my: myStats.budget_welfare, their: theirStats.budget_welfare },
      { label: 'Environment Budget', my: myStats.budget_environment, their: theirStats.budget_environment },
      { label: 'Infrastructure Budget', my: myStats.budget_infrastructure, their: theirStats.budget_infrastructure },
      { label: 'Other Budget', my: myStats.budget_other, their: theirStats.budget_other },
    ],
    international: [
      { label: 'International Approval', my: myStats.international_approval, their: theirStats.international_approval },
      { label: 'Alliance Power', my: myStats.alliance_power, their: theirStats.alliance_power },
    ],
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={myTheme.color} />
        </TouchableOpacity>
        <Text style={styles.title}>Compare Nations</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.nationHeaders}>
          <View style={[styles.nationHeader, { borderBottomWidth: 3, borderBottomColor: myTheme.color }]}>
            <Text style={styles.nationName}>{myNation.name}</Text>
            <Text style={[styles.govType, { color: myTheme.color }]}>{myNation.government_type}</Text>
            <Text style={[styles.politicalLabel, { color: myTheme.color }]}>{myTheme.name}</Text>
          </View>
          <View style={styles.vsText}>
            <Text style={styles.vs}>VS</Text>
          </View>
          <View style={[styles.nationHeader, { borderBottomWidth: 3, borderBottomColor: theirTheme.color }]}>
            <Text style={styles.nationName}>{compareNation.name}</Text>
            <Text style={[styles.govType, { color: theirTheme.color }]}>{compareNation.government_type}</Text>
            <Text style={[styles.politicalLabel, { color: theirTheme.color }]}>{theirTheme.name}</Text>
          </View>
        </View>
        
        {Object.entries(comparisonCategories).map(([categoryKey, comparisons]) => (
          <View key={categoryKey}>
            <Text style={styles.categoryTitle}>
              {categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}
            </Text>
            {comparisons.map((comp) => {
              // Safely handle undefined values
              const myValue = comp.my ?? 0;
              const theirValue = comp.their ?? 0;
              
              // For realistic values (like GDP), skip comparison logic
              const myHigher = !comp.isRealistic 
                ? (comp.inverse ? myValue < theirValue : myValue > theirValue)
                : false;
              const difference = !comp.isRealistic ? Math.abs(myValue - theirValue) : 0;
              
              return (
                <View key={comp.label} style={styles.comparisonRow}>
                  <View style={[
                    styles.statBox, 
                    { borderColor: myTheme.color },
                    myHigher && { backgroundColor: myTheme.color + '22', borderWidth: 3 }
                  ]}>
                    <Text style={[
                      styles.statValue, 
                      { color: myTheme.color },
                      myHigher && { fontWeight: 'bold' }
                    ]}>
                      {comp.isRealistic ? comp.my : (typeof myValue === 'number' ? myValue.toFixed(1) : '0')}
                    </Text>
                  </View>
                  
                  <View style={styles.labelBox}>
                    <Text style={styles.statLabel}>{comp.label}</Text>
                    {!comp.isRealistic && <Text style={styles.difference}>Δ {difference.toFixed(1)}</Text>}
                  </View>
                  
                  <View style={[
                    styles.statBox,
                    { borderColor: theirTheme.color },
                    !myHigher && { backgroundColor: theirTheme.color + '22', borderWidth: 3 }
                  ]}>
                    <Text style={[
                      styles.statValue,
                      { color: theirTheme.color },
                      !myHigher && { fontWeight: 'bold' }
                    ]}>
                      {comp.isRealistic ? comp.their : (typeof theirValue === 'number' ? theirValue.toFixed(1) : '0')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  content: {
    padding: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F3F6FA',
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  nationHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  nationHeader: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 12,
  },
  nationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 4,
  },
  govType: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  politicalLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  vsText: {
    width: 60,
    alignItems: 'center',
  },
  vs: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E0C7',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#11171F',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  winner: {
    borderColor: '#27D17A',
    backgroundColor: '#0F3730',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F3F6FA',
  },
  winnerText: {
    color: '#27D17A',
  },
  labelBox: {
    width: 120,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 4,
  },
  difference: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
  },
});
