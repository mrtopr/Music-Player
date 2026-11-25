export const DEFAULT_UNIVERSE = 'bollywood';

export const UNIVERSES = {
    bollywood: {
        id: 'bollywood',
        label: 'Bollywood',
        shortLabel: 'Bollywood',
        emoji: '🎬',
        badge: '✨ Bollywood Aurora',
        tagline: 'Emerald Aurora & Gold',
        language: 'hindi',
        moduleLanguages: 'hindi,punjabi',
        heroTitle: 'Suno Dil Se',
        heroSubtitle: 'Contemporary Bollywood, soulful melodies & chart-topping hits',
        trendingQuery: 'Arijit Singh Pritam hindi hits',
        albumQuery: 'latest bollywood hindi album',
        playlistQuery: 'Bollywood Trending Hindi',
        artists: [
            'Arijit Singh', 'Shreya Ghoshal', 'Pritam', 'Atif Aslam',
            'Jubin Nautiyal', 'Sonu Nigam', 'Vishal-Shekhar', 'Darshan Raval'
        ],
        trendingSearches: [
            'Arijit Singh', 'Kesariya', 'Tum Hi Ho', 'Raataan Lambiyan',
            'Chaleya', 'Apna Bana Le', 'Shreya Ghoshal', 'Pritam'
        ],
        categories: [
            { label: 'All Music', query: 'bollywood trending 2026 hits', iconName: 'Music' },
            { label: 'Romantic', query: 'romantic hindi songs 2026', iconName: 'Heart' },
            { label: 'Dance', query: 'bollywood dance party songs 2026', iconName: 'Activity' },
            { label: 'Sad', query: 'sad hindi songs 2026', iconName: 'Frown' },
            { label: 'Party', query: 'bollywood party songs 2026', iconName: 'Sparkles' },
            { label: 'Classical', query: 'indian classical music hits', iconName: 'Award' },
            { label: 'Rock', query: 'hindi rock songs hits', iconName: 'Zap' },
            { label: 'Pop', query: 'hindi pop songs 2026', iconName: 'Star' },
            { label: 'Latest 2026', query: 'latest bollywood 2026 new song album releases', iconName: 'Calendar' },
        ],
        theme: {
            accentPrimary: '#10B981',
            accentPrimaryRGB: '16, 185, 129',
            accentSecondary: '#34D399',
            accentSecondaryRGB: '52, 211, 153',
            accentHover: '#059669',
            accentSoft: 'rgba(16, 185, 129, 0.15)',
            borderAccent: 'rgba(16, 185, 129, 0.35)',
            shadowAccent: 'rgba(16, 185, 129, 0.35)',
            bgMain: '#070A08',
            bgCard: '#0E1712',
            bgSidebar: '#0C120E',
            logoFilter: 'hue-rotate(245deg) saturate(1.2)',
            fontDisplay: "'Plus Jakarta Sans', 'Outfit', sans-serif",
            fontBody: "'Plus Jakarta Sans', 'Outfit', sans-serif",
            headingTracking: '-0.025em',
            headingWeight: '800',
            textOnAccent: '#04120B',
            heroGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(52, 211, 153, 0.08) 50%, rgba(7, 10, 8, 0.92) 100%)',
            blobs: [
                'rgba(16, 185, 129, 0.32)',
                'rgba(5, 150, 105, 0.22)',
                'rgba(52, 211, 153, 0.22)',
                'rgba(16, 185, 129, 0.24)',
                'rgba(4, 120, 87, 0.20)'
            ]
        }
    },

    english: {
        id: 'english',
        label: 'English / Global',
        shortLabel: 'Global',
        emoji: '🌐',
        badge: '⚡ Cyberpunk Global',
        tagline: 'Electric Violet & Neon Cyan',
        language: 'english',
        moduleLanguages: 'english',
        heroTitle: 'Global Frequency',
        heroSubtitle: 'Billboard Hot 100, synth-pop, club anthems & worldwide chartbusters',
        trendingQuery: 'The Weeknd Dua Lipa Taylor Swift hits',
        albumQuery: 'After Hours The Weeknd',
        playlistQuery: 'English Pop Hits',
        artists: [
            'The Weeknd', 'Taylor Swift', 'Dua Lipa', 'Drake',
            'Billie Eilish', 'Ed Sheeran', 'Bruno Mars', 'Sabrina Carpenter'
        ],
        trendingSearches: [
            'The Weeknd', 'Blinding Lights', 'Taylor Swift', 'Dua Lipa',
            'Espresso', 'Die With A Smile', 'Coldplay', 'Imagine Dragons'
        ],
        categories: [
            { label: 'Global Hits', query: 'billboard hot 100 english hits', iconName: 'Sparkles' },
            { label: 'Pop', query: 'english pop hits 2026', iconName: 'Star' },
            { label: 'EDM & Club', query: 'english edm dance club hits', iconName: 'Activity' },
            { label: 'R&B', query: 'english rnb soul hits', iconName: 'Heart' },
            { label: 'Rock', query: 'english rock anthems hits', iconName: 'Zap' },
            { label: 'Chill', query: 'english chill lofi pop', iconName: 'Music' },
            { label: 'Hip-Hop', query: 'english hip hop rap hits', iconName: 'Mic' },
            { label: 'Latest', query: 'new english songs 2026', iconName: 'Calendar' },
        ],
        theme: {
            accentPrimary: '#8B5CF6',
            accentPrimaryRGB: '139, 92, 246',
            accentSecondary: '#06B6D4',
            accentSecondaryRGB: '6, 182, 212',
            accentHover: '#7C3AED',
            accentSoft: 'rgba(139, 92, 246, 0.16)',
            borderAccent: 'rgba(139, 92, 246, 0.4)',
            shadowAccent: 'rgba(139, 92, 246, 0.38)',
            bgMain: '#08070F',
            bgCard: '#110E1F',
            bgSidebar: '#0D0B18',
            logoFilter: 'none',
            fontDisplay: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontBody: "'Plus Jakarta Sans', 'Outfit', sans-serif",
            headingTracking: '-0.03em',
            headingWeight: '800',
            textOnAccent: '#FFFFFF',
            heroGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.28) 0%, rgba(6, 182, 212, 0.16) 50%, rgba(8, 7, 15, 0.92) 100%)',
            blobs: [
                'rgba(139, 92, 246, 0.34)',
                'rgba(6, 182, 212, 0.24)',
                'rgba(167, 139, 250, 0.22)',
                'rgba(124, 58, 237, 0.24)',
                'rgba(8, 145, 178, 0.20)'
            ]
        }
    },

    hiphop: {
        id: 'hiphop',
        label: 'Desi Hip-Hop',
        shortLabel: 'Hip-Hop',
        emoji: '🎤',
        badge: '🔥 Street Cipher',
        tagline: 'Graphite & Flame Orange',
        language: 'hindi,punjabi',
        moduleLanguages: 'hindi,punjabi',
        heroTitle: 'Gully To Glory',
        heroSubtitle: 'Raw bars, heavy 808s & underground Desi Hip-Hop anthems',
        trendingQuery: 'Seedhe Maut Karan Aujla Raftaar',
        albumQuery: 'Ek Tha Raja Badshah',
        playlistQuery: 'Desi Rap Hip Hop',
        artists: [
            'DIVINE', 'Seedhe Maut', 'KR$NA', 'Raftaar',
            'Badshah', 'Hanumankind', 'Karan Aujla', 'MC Stan'
        ],
        trendingSearches: [
            'DIVINE', 'Seedhe Maut', 'KR$NA', 'Hanumankind',
            'Karan Aujla', 'Raftaar', 'Big Dawgs', 'Nanchaku'
        ],
        categories: [
            { label: 'DHH Hits', query: 'desi hip hop rap hits', iconName: 'Mic' },
            { label: 'Underground', query: 'indian underground rap hip hop', iconName: 'Zap' },
            { label: 'Punjabi Rap', query: 'punjabi hip hop rap hits', iconName: 'Activity' },
            { label: 'Hardcore Bars', query: 'krsna seedhe maut divine rap', iconName: 'Award' },
            { label: 'Trap & 808', query: 'hindi trap rap songs', iconName: 'Sparkles' },
            { label: 'Gym & Hustle', query: 'hindi workout rap motivation', iconName: 'Star' },
            { label: 'Chill Rap', query: 'melodic desi hip hop', iconName: 'Music' },
        ],
        theme: {
            accentPrimary: '#F97316',
            accentPrimaryRGB: '249, 115, 22',
            accentSecondary: '#EF4444',
            accentSecondaryRGB: '239, 68, 68',
            accentHover: '#EA580C',
            accentSoft: 'rgba(249, 115, 22, 0.16)',
            borderAccent: 'rgba(249, 115, 22, 0.4)',
            shadowAccent: 'rgba(249, 115, 22, 0.38)',
            bgMain: '#0A0908',
            bgCard: '#161210',
            bgSidebar: '#110E0C',
            logoFilter: 'hue-rotate(115deg) saturate(1.35)',
            fontDisplay: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontBody: "'Plus Jakarta Sans', 'Outfit', sans-serif",
            headingTracking: '-0.04em',
            headingWeight: '900',
            textOnAccent: '#0A0908',
            heroGradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.28) 0%, rgba(239, 68, 68, 0.14) 50%, rgba(10, 9, 8, 0.94) 100%)',
            blobs: [
                'rgba(249, 115, 22, 0.32)',
                'rgba(239, 68, 68, 0.24)',
                'rgba(251, 146, 60, 0.22)',
                'rgba(234, 88, 12, 0.24)',
                'rgba(185, 28, 28, 0.20)'
            ]
        }
    },

    nineties: {
        id: 'nineties',
        label: '90s Retro',
        shortLabel: '90s',
        emoji: '📼',
        badge: '📻 Cassette Era',
        tagline: 'Vintage Amber & Sepia',
        language: 'hindi',
        moduleLanguages: 'hindi',
        heroTitle: 'Golden Tape Rewind',
        heroSubtitle: 'Timeless 90s Bollywood classics, analog warmth & golden era duets',
        trendingQuery: 'Kumar Sanu Alka Yagnik 90s',
        albumQuery: 'Dilwale Dulhania Le Jayenge Raja Hindustani',
        playlistQuery: '90s Hindi Hits',
        artists: [
            'Kumar Sanu', 'Alka Yagnik', 'Udit Narayan', 'Lata Mangeshkar',
            'A.R. Rahman', 'Kavita Krishnamurthy', 'Abhijeet', 'S.P. Balasubrahmanyam'
        ],
        trendingSearches: [
            'Kumar Sanu', 'Alka Yagnik', 'Udit Narayan', '90s Bollywood',
            'Pehla Nasha', 'Tujhe Dekha To', 'A.R. Rahman 90s', '90s Sad Songs'
        ],
        categories: [
            { label: '90s Gold', query: '90s bollywood golden hits', iconName: 'Disc3' },
            { label: 'Romantic 90s', query: '90s romantic hindi songs kumar sanu', iconName: 'Heart' },
            { label: 'Evergreen Duets', query: 'alka yagnik udit narayan 90s hits', iconName: 'Music' },
            { label: '90s Sad', query: '90s sad hindi songs', iconName: 'Frown' },
            { label: 'Rahman 90s', query: 'ar rahman 90s hindi hits', iconName: 'Award' },
            { label: '90s Dance', query: '90s bollywood dance party hits', iconName: 'Activity' },
            { label: 'Ghazals', query: 'jagjit singh 90s ghazals', iconName: 'Sparkles' },
        ],
        theme: {
            accentPrimary: '#F59E0B',
            accentPrimaryRGB: '245, 158, 11',
            accentSecondary: '#D97706',
            accentSecondaryRGB: '217, 119, 6',
            accentHover: '#B45309',
            accentSoft: 'rgba(245, 158, 11, 0.16)',
            borderAccent: 'rgba(245, 158, 11, 0.4)',
            shadowAccent: 'rgba(245, 158, 11, 0.36)',
            bgMain: '#0B0905',
            bgCard: '#17130A',
            bgSidebar: '#120F07',
            logoFilter: 'hue-rotate(135deg) saturate(1.4) brightness(1.05)',
            fontDisplay: "'Plus Jakarta Sans', Georgia, serif",
            fontBody: "'Plus Jakarta Sans', 'Outfit', sans-serif",
            headingTracking: '0.005em',
            headingWeight: '700',
            textOnAccent: '#0B0905',
            heroGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.14) 50%, rgba(11, 9, 5, 0.94) 100%)',
            blobs: [
                'rgba(245, 158, 11, 0.30)',
                'rgba(217, 119, 6, 0.22)',
                'rgba(251, 191, 36, 0.20)',
                'rgba(180, 83, 9, 0.22)',
                'rgba(146, 64, 14, 0.18)'
            ]
        }
    },

    bhojpuri: {
        id: 'bhojpuri',
        label: 'Bhojpuri Dhamaka',
        shortLabel: 'Bhojpuri',
        emoji: '🥁',
        badge: '🎉 Festive Dhamaka',
        tagline: 'Saffron & Ruby Crimson',
        language: 'bhojpuri',
        moduleLanguages: 'bhojpuri',
        heroTitle: 'Desi Beat Dhamaka',
        heroSubtitle: 'High-energy Bhojpuri bangers, festive folk & regional chart-toppers',
        trendingQuery: 'bhojpuri hit songs',
        albumQuery: 'Pawan Singh Khesari Lal Bhojpuri',
        playlistQuery: 'Bhojpuri Hits',
        artists: [
            'Pawan Singh', 'Khesari Lal Yadav', 'Shilpi Raj', 'Neelkamal Singh',
            'Ritesh Pandey', 'Arvind Akela Kallu', 'Pramod Premi', 'Akshara Singh'
        ],
        trendingSearches: [
            'Pawan Singh', 'Khesari Lal Yadav', 'Shilpi Raj', 'Bhojpuri DJ',
            'Neelkamal Singh', 'Lollipop Lagelu', 'Ritesh Pandey', 'Bhojpuri Romantic'
        ],
        categories: [
            { label: 'Top Dhamaka', query: 'bhojpuri top hits', iconName: 'Flame' },
            { label: 'DJ & Dance', query: 'bhojpuri dj dance party songs', iconName: 'Activity' },
            { label: 'Romantic', query: 'bhojpuri romantic songs', iconName: 'Heart' },
            { label: 'Pawan Singh', query: 'pawan singh hit songs', iconName: 'Star' },
            { label: 'Khesari Hits', query: 'khesari lal yadav hit songs', iconName: 'Sparkles' },
            { label: 'Lokgeet', query: 'bhojpuri folk lokgeet', iconName: 'Music' },
            { label: 'Sad', query: 'bhojpuri sad songs', iconName: 'Frown' },
        ],
        theme: {
            accentPrimary: '#E11D48',
            accentPrimaryRGB: '225, 29, 72',
            accentSecondary: '#FBBF24',
            accentSecondaryRGB: '251, 191, 36',
            accentHover: '#BE123C',
            accentSoft: 'rgba(225, 29, 72, 0.16)',
            borderAccent: 'rgba(225, 29, 72, 0.42)',
            shadowAccent: 'rgba(225, 29, 72, 0.38)',
            bgMain: '#0D0608',
            bgCard: '#1A0C10',
            bgSidebar: '#14090C',
            logoFilter: 'hue-rotate(85deg) saturate(1.3)',
            fontDisplay: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontBody: "'Plus Jakarta Sans', 'Outfit', sans-serif",
            headingTracking: '-0.02em',
            headingWeight: '800',
            textOnAccent: '#FFFFFF',
            heroGradient: 'linear-gradient(135deg, rgba(225, 29, 72, 0.28) 0%, rgba(251, 191, 36, 0.15) 50%, rgba(13, 6, 8, 0.94) 100%)',
            blobs: [
                'rgba(225, 29, 72, 0.32)',
                'rgba(251, 191, 36, 0.22)',
                'rgba(244, 63, 94, 0.22)',
                'rgba(190, 18, 60, 0.24)',
                'rgba(217, 119, 6, 0.18)'
            ]
        }
    }
};

export const UNIVERSE_LIST = Object.values(UNIVERSES);
export const UNIVERSE_IDS = Object.keys(UNIVERSES);

export function getUniverseConfig(id) {
    return UNIVERSES[id] || UNIVERSES[DEFAULT_UNIVERSE];
}
