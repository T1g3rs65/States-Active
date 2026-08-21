import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Polygon, Rect, Defs, ClipPath } from 'react-native-svg';

const COLORS = [
  '#FF5A65', '#F2C94C', '#27D17A', '#00E0C7', '#6366F1', '#00E0C7',
  '#00B8B8', '#F3F6FA', '#000000', 'rgba(243,246,250,0.70)', '#FCD34D', '#27D17A',
];

const PATTERNS = [
  { id: 'solid', name: 'Solid' },
  { id: 'horizontal', name: 'Horizontal Stripes' },
  { id: 'vertical', name: 'Vertical Stripes' },
  { id: 'cross', name: 'Cross' },
  { id: 'saltire', name: 'St. Andrews Cross' },
  { id: 'nordic', name: 'Nordic Cross' },
  { id: 'chevron', name: 'Chevron' },
  { id: 'diagonal', name: 'Diagonal' },
];

interface FlagCreatorProps {
  onFlagCreated: (flagBase64: string) => void;
  race?: string;
}

// Hexagon points for a flat-topped hexagon
const getHexagonPoints = (width: number, height: number) => {
  const w = width;
  const h = height;
  // Flat-topped hexagon
  return `${w*0.25},0 ${w*0.75},0 ${w},${h*0.5} ${w*0.75},${h} ${w*0.25},${h} 0,${h*0.5}`;
};

export default function FlagCreator({ onFlagCreated, race = 'human' }: FlagCreatorProps) {
  const [color1, setColor1] = useState('#00E0C7');
  const [color2, setColor2] = useState('#F3F6FA');
  const [color3, setColor3] = useState('#FF5A65');
  const [pattern, setPattern] = useState('horizontal');
  
  const isHexagon = race?.toLowerCase() === 'zythera';

  const uploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: isHexagon ? [1, 1] : [3, 2],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const imageBase64 = result.assets[0].base64;
      
      if (isHexagon) {
        // For Zythera race, wrap the image in an SVG with hexagonal clip
        const w = 200;
        const h = 173;
        const hexPoints = `${w*0.25},0 ${w*0.75},0 ${w},${h*0.5} ${w*0.75},${h} ${w*0.25},${h} 0,${h*0.5}`;
        
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
          <defs>
            <clipPath id="hexClip">
              <polygon points="${hexPoints}"/>
            </clipPath>
          </defs>
          <g clip-path="url(#hexClip)">
            <image href="data:image/jpeg;base64,${imageBase64}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>
          </g>
          <polygon points="${hexPoints}" fill="none" stroke="#11171F" stroke-width="3"/>
        </svg>`;
        
        const hexFlagBase64 = `data:image/svg+xml;base64,${btoa(svg)}`;
        onFlagCreated(hexFlagBase64);
      } else {
        // Regular rectangular flag
        const flagBase64 = `data:image/jpeg;base64,${imageBase64}`;
        onFlagCreated(flagBase64);
      }
    }
  };

  const generateFlag = () => {
    const svg = isHexagon ? createHexagonFlagSVG(pattern, color1, color2, color3) : createFlagSVG(pattern, color1, color2, color3);
    onFlagCreated(svg);
  };

  const createFlagSVG = (p: string, c1: string, c2: string, c3: string) => {
    let svg = '';
    
    if (p === 'horizontal') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect width="300" height="66.67" fill="${c1}"/>
        <rect y="66.67" width="300" height="66.67" fill="${c2}"/>
        <rect y="133.33" width="300" height="66.67" fill="${c3}"/>
      </svg>`;
    } else if (p === 'vertical') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect width="100" height="200" fill="${c1}"/>
        <rect x="100" width="100" height="200" fill="${c2}"/>
        <rect x="200" width="100" height="200" fill="${c3}"/>
      </svg>`;
    } else if (p === 'cross') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect width="300" height="200" fill="${c1}"/>
        <rect x="130" width="40" height="200" fill="${c2}"/>
        <rect y="80" width="300" height="40" fill="${c2}"/>
      </svg>`;
    } else if (p === 'saltire') {
      // St. Andrews Cross (X shape)
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect width="300" height="200" fill="${c1}"/>
        <polygon points="0,0 60,0 300,200 240,200" fill="${c2}"/>
        <polygon points="240,0 300,0 60,200 0,200" fill="${c2}"/>
      </svg>`;
    } else if (p === 'nordic') {
      // Nordic cross (like Denmark, Sweden)
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect width="300" height="200" fill="${c1}"/>
        <rect x="80" width="40" height="200" fill="${c2}"/>
        <rect y="80" width="300" height="40" fill="${c2}"/>
      </svg>`;
    } else if (p === 'chevron') {
      // Chevron pattern
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect width="300" height="200" fill="${c1}"/>
        <polygon points="0,0 150,100 0,200" fill="${c2}"/>
        <polygon points="300,0 150,100 300,200" fill="${c3}"/>
      </svg>`;
    } else if (p === 'diagonal') {
      // Diagonal split
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <polygon points="0,0 300,0 300,200" fill="${c1}"/>
        <polygon points="0,0 0,200 300,200" fill="${c2}"/>
      </svg>`;
    } else {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect width="300" height="200" fill="${c1}"/>
      </svg>`;
    }
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const createHexagonFlagSVG = (p: string, c1: string, c2: string, c3: string) => {
    // Hexagon dimensions (200x173 for proper flat-topped hexagon proportions)
    const w = 200;
    const h = 173;
    const hexPoints = `${w*0.25},0 ${w*0.75},0 ${w},${h*0.5} ${w*0.75},${h} ${w*0.25},${h} 0,${h*0.5}`;
    
    let patternContent = '';
    
    if (p === 'horizontal') {
      patternContent = `
        <rect width="${w}" height="${h/3}" fill="${c1}"/>
        <rect y="${h/3}" width="${w}" height="${h/3}" fill="${c2}"/>
        <rect y="${h*2/3}" width="${w}" height="${h/3}" fill="${c3}"/>
      `;
    } else if (p === 'vertical') {
      patternContent = `
        <rect width="${w/3}" height="${h}" fill="${c1}"/>
        <rect x="${w/3}" width="${w/3}" height="${h}" fill="${c2}"/>
        <rect x="${w*2/3}" width="${w/3}" height="${h}" fill="${c3}"/>
      `;
    } else if (p === 'cross') {
      patternContent = `
        <rect width="${w}" height="${h}" fill="${c1}"/>
        <rect x="${w*0.43}" width="${w*0.14}" height="${h}" fill="${c2}"/>
        <rect y="${h*0.4}" width="${w}" height="${h*0.2}" fill="${c2}"/>
      `;
    } else if (p === 'saltire') {
      patternContent = `
        <rect width="${w}" height="${h}" fill="${c1}"/>
        <polygon points="0,0 ${w*0.2},0 ${w},${h} ${w*0.8},${h}" fill="${c2}"/>
        <polygon points="${w*0.8},0 ${w},0 ${w*0.2},${h} 0,${h}" fill="${c2}"/>
      `;
    } else if (p === 'nordic') {
      patternContent = `
        <rect width="${w}" height="${h}" fill="${c1}"/>
        <rect x="${w*0.27}" width="${w*0.13}" height="${h}" fill="${c2}"/>
        <rect y="${h*0.4}" width="${w}" height="${h*0.2}" fill="${c2}"/>
      `;
    } else if (p === 'chevron') {
      patternContent = `
        <rect width="${w}" height="${h}" fill="${c1}"/>
        <polygon points="0,0 ${w*0.5},${h*0.5} 0,${h}" fill="${c2}"/>
        <polygon points="${w},0 ${w*0.5},${h*0.5} ${w},${h}" fill="${c3}"/>
      `;
    } else if (p === 'diagonal') {
      patternContent = `
        <polygon points="0,0 ${w},0 ${w},${h}" fill="${c1}"/>
        <polygon points="0,0 0,${h} ${w},${h}" fill="${c2}"/>
      `;
    } else {
      patternContent = `<rect width="${w}" height="${h}" fill="${c1}"/>`;
    }
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      <defs>
        <clipPath id="hexClip">
          <polygon points="${hexPoints}"/>
        </clipPath>
      </defs>
      <g clip-path="url(#hexClip)">
        ${patternContent}
      </g>
      <polygon points="${hexPoints}" fill="none" stroke="#11171F" stroke-width="3"/>
    </svg>`;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const renderPreview = () => {
    const uri = isHexagon
      ? createHexagonFlagSVG(pattern, color1, color2, color3)
      : createFlagSVG(pattern, color1, color2, color3);
    return (
      <Image
        source={{ uri }}
        style={isHexagon ? { width: 140, height: 121 } : { width: 180, height: 120, borderRadius: 6 }}
        resizeMode="contain"
      />
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Design Your Flag</Text>
      
      {isHexagon && (
        <View style={styles.hexBanner}>
          <Text style={styles.hexBannerText}>🔷 Zythera nations use hexagonal flags</Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.uploadButton} onPress={uploadImage}>
        <Text style={styles.uploadButtonText}>📤 Upload Image Instead</Text>
      </TouchableOpacity>
      
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR DESIGN BELOW</Text>
        <View style={styles.dividerLine} />
      </View>
      
      <View style={styles.previewContainer}>
        {renderPreview()}
      </View>

      <Text style={styles.sectionTitle}>Pattern</Text>
      <View style={styles.patternGrid}>
        {PATTERNS.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.patternButton, pattern === p.id && styles.patternButtonActive]}
            onPress={() => setPattern(p.id)}
          >
            <Text style={[styles.patternButtonText, pattern === p.id && styles.patternButtonTextActive]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Color 1</Text>
      <View style={styles.colorGrid}>
        {COLORS.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.colorButton, { backgroundColor: c }, color1 === c && styles.colorButtonSelected]}
            onPress={() => setColor1(c)}
          />
        ))}
      </View>

      {pattern !== 'solid' && (
        <>
          <Text style={styles.sectionTitle}>Color 2</Text>
          <View style={styles.colorGrid}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorButton, { backgroundColor: c }, color2 === c && styles.colorButtonSelected]}
                onPress={() => setColor2(c)}
              />
            ))}
          </View>
        </>
      )}

      {(pattern === 'horizontal' || pattern === 'vertical' || pattern === 'chevron') && (
        <>
          <Text style={styles.sectionTitle}>Color 3</Text>
          <View style={styles.colorGrid}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorButton, { backgroundColor: c }, color3 === c && styles.colorButtonSelected]}
                onPress={() => setColor3(c)}
              />
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.createButton} onPress={generateFlag}>
        <Text style={styles.createButtonText}>Use This Flag</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3F6FA',
    marginBottom: 24,
    textAlign: 'center',
  },
  hexBanner: {
    backgroundColor: '#11171F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00E0C7',
  },
  hexBannerText: {
    color: '#00E0C7',
    fontSize: 14,
    textAlign: 'center',
  },
  hexLabel: {
    color: 'rgba(243,246,250,0.48)',
    fontSize: 12,
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: '#27D17A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: 'rgba(243,246,250,0.48)',
    fontSize: 12,
    marginHorizontal: 16,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 12,
    marginTop: 8,
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  patternButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#11171F',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  patternButtonActive: {
    borderColor: '#00E0C7',
    backgroundColor: '#1E3A5F',
  },
  patternButtonText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
  },
  patternButtonTextActive: {
    color: '#00E0C7',
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#27D17A',
    borderWidth: 4,
  },
  createButton: {
    backgroundColor: '#00E0C7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  createButtonText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
});
