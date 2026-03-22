/**
 * Mood Theme Configuration System (Mehfil)
 * Defines aesthetics (colors, icons, effects) for each category/mood.
 */

export const moodThemes = {
  romantic: {
    name: 'Romantic',
    colors: {
      primary: '#ef4444',        // Red-500
      secondary: '#f472b6',      // Pink-400
      accent: '#fb7185',         // Rose-400
      background: '#1a0505',     // Dark red tint
      surface: '#2d0f0f',        // Darker red
      text: '#fecaca',           // Light red
      gradient: 'linear-gradient(135deg, #1a0505 0%, #2d0f0f 50%, #1a0505 100%)',
      glow: 'rgba(239, 68, 68, 0.3)'
    },
    icons: {
      decoration: 'heart',
      pattern: 'hearts',
      playerIcon: 'heart'
    },
    effects: {
      floatingElements: 'hearts',
      particleColor: '#f472b6',
      backgroundAnimation: 'pulse-soft',
      buttonGlow: true
    },
    typography: {
      fontFamily: "'Playfair Display', serif",
      letterSpacing: '0.05em'
    }
  },
  
  sad: {
    name: 'Sad',
    colors: {
      primary: '#3b82f6',        // Blue-500
      secondary: '#64748b',      // Slate-500
      accent: '#94a3b8',         // Slate-400
      background: '#0f172a',     // Dark blue
      surface: '#1e293b',        // Slate-800
      text: '#cbd5e1',           // Slate-300
      gradient: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      glow: 'rgba(59, 130, 246, 0.3)'
    },
    icons: {
      decoration: 'cloud-rain',
      pattern: 'raindrops',
      playerIcon: 'cloud'
    },
    effects: {
      floatingElements: 'raindrops',
      particleColor: '#64748b',
      backgroundAnimation: 'drift-slow',
      buttonGlow: false
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
      letterSpacing: '0.02em'
    }
  },
  
  party: {
    name: 'Party',
    colors: {
      primary: '#a855f7',        // Purple-500
      secondary: '#ec4899',      // Pink-500
      accent: '#f59e0b',         // Amber-500
      background: '#1a0b2e',     // Dark purple
      surface: '#2d1b4e',        // Purple-900
      text: '#fde68a',           // Amber-200
      gradient: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 33%, #1a0b2e 66%, #2d1b4e 100%)',
      glow: 'rgba(168, 85, 247, 0.4)'
    },
    icons: {
      decoration: 'sparkles',
      pattern: 'confetti',
      playerIcon: 'party-popper'
    },
    effects: {
      floatingElements: 'confetti',
      particleColor: '#ec4899',
      backgroundAnimation: 'disco',
      buttonGlow: true
    },
    typography: {
      fontFamily: "'Outfit', sans-serif",
      letterSpacing: '0.1em'
    }
  },
  
  dance: {
    name: 'Dance',
    colors: {
      primary: '#fbbf24',        // Amber-400
      secondary: '#f59e0b',      // Amber-500
      accent: '#f97316',         // Orange-500
      background: '#1a1200',     // Dark amber
      surface: '#2d1f00',        // Amber-950
      text: '#fef3c7',           // Amber-100
      gradient: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 50%, #1a1200 100%)',
      glow: 'rgba(251, 191, 36, 0.4)'
    },
    icons: {
      decoration: 'music-2',
      pattern: 'waves',
      playerIcon: 'disc'
    },
    effects: {
      floatingElements: 'music-notes',
      particleColor: '#fbbf24',
      backgroundAnimation: 'pulse-energy',
      buttonGlow: true
    },
    typography: {
      fontFamily: "'Outfit', sans-serif",
      letterSpacing: '0.08em'
    }
  },
  
  classical: {
    name: 'Classical',
    colors: {
      primary: '#d4af37',        // Gold
      secondary: '#c9b896',      // Champagne
      accent: '#8b7355',         // Bronze
      background: '#1a1510',     // Dark brown
      surface: '#2d2620',        // Brown-900
      text: '#f5ebe0',           // Warm white
      gradient: 'linear-gradient(180deg, #1a1510 0%, #2d2620 50%, #1a1510 100%)',
      glow: 'rgba(212, 175, 55, 0.3)'
    },
    icons: {
      decoration: 'music',
      pattern: 'ornate',
      playerIcon: 'disc-3'
    },
    effects: {
      floatingElements: 'notes-elegant',
      particleColor: '#d4af37',
      backgroundAnimation: 'float-slow',
      buttonGlow: false
    },
    typography: {
      fontFamily: "'Playfair Display', serif",
      letterSpacing: '0.03em'
    }
  },
  
  rock: {
    name: 'Rock',
    colors: {
      primary: '#dc2626',        // Red-600
      secondary: '#7f1d1d',      // Red-900
      accent: '#000000',         // Black
      background: '#0a0a0a',     // Near black
      surface: '#1a1a1a',        // Gray-900
      text: '#fca5a5',           // Red-300
      gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
      glow: 'rgba(220, 38, 38, 0.4)'
    },
    icons: {
      decoration: 'guitar',
      pattern: 'lightning',
      playerIcon: 'flame'
    },
    effects: {
      floatingElements: 'lightning',
      particleColor: '#dc2626',
      backgroundAnimation: 'flicker',
      buttonGlow: true
    },
    typography: {
      fontFamily: "'Oswald', sans-serif",
      letterSpacing: '0.1em'
    }
  },
  
  // Default theme
  default: {
    name: 'Default',
    colors: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      accent: '#f97316',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#f5f5f5',
      gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
      glow: 'rgba(251, 191, 36, 0.3)'
    },
    icons: {
      decoration: 'music',
      pattern: 'default',
      playerIcon: 'music'
    },
    effects: {
      floatingElements: 'none',
      particleColor: '#fbbf24',
      backgroundAnimation: 'none',
      buttonGlow: false
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
      letterSpacing: 'normal'
    }
  }
};

// Map categories to themes
export const categoryToTheme = {
  'romantic': 'romantic',
  'love': 'romantic',
  'sad': 'sad',
  'melancholy': 'sad',
  'party': 'party',
  'dance': 'dance',
  'energetic': 'dance',
  'classical': 'classical',
  'instrumental': 'classical',
  'rock': 'rock',
  'metal': 'rock',
  'pop': 'default',
  'hip hop': 'default',
  'all music': 'default'
};

export function getThemeForCategory(category = '') {
  if (!category) return moodThemes.default;
  const themeKey = categoryToTheme[category.toLowerCase()] || 'default';
  return moodThemes[themeKey];
}
