import React from 'react';
import { Users, Sparkles, Mic2, SlidersHorizontal, Heart, Music, ListMusic, History } from 'lucide-react';

export default function About() {
    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-1px' }}>
                    Welcome to Mehfil
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
                    Mehfil is a next-generation music streaming experience designed for audiophiles and social listeners alike. 
                    Experience music like never before with our cutting-edge features.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <FeatureCard 
                    icon={<Users size={32} color="#c084fc" />} 
                    title="Listen Together" 
                    description="Sync playback with friends globally. Everyone connected in the room can control the music and listen at the exact same timeline. A fully collaborated, real-time social listening experience."
                    glowColor="rgba(192, 132, 252, 0.2)"
                />
                <FeatureCard 
                    icon={<Sparkles size={32} color="#818cf8" />} 
                    title="AI AutoMix" 
                    description="Smart recommendations that flawlessly crossfade into the next track based on your listening vibe. Our algorithms ensure the party never stops and the transitions are seamless."
                    glowColor="rgba(129, 140, 248, 0.2)"
                />
                <FeatureCard 
                    icon={<Mic2 size={32} color="#f472b6" />} 
                    title="Song Recognition" 
                    description="Tap the mic to instantly identify any song playing around you. Discover new music in the real world and add it directly to your digital library."
                    glowColor="rgba(244, 114, 182, 0.2)"
                />
                <FeatureCard 
                    icon={<SlidersHorizontal size={32} color="#34d399" />} 
                    title="Pro Equalizer & Sleep Timer" 
                    description="Fine-tune your audio experience with our built-in frequency equalizer. Set a sleep timer with our modern bed icon to drift off to your favorite melodies without draining your battery."
                    glowColor="rgba(52, 211, 153, 0.2)"
                />
                <FeatureCard 
                    icon={<Music size={32} color="#fbbf24" />} 
                    title="High-Quality Streaming" 
                    description="Immerse yourself in crystal clear audio. We fetch the best available quality for your tracks, ensuring every beat and lyric is delivered in pristine condition."
                    glowColor="rgba(251, 191, 36, 0.2)"
                />
                <FeatureCard 
                    icon={<Heart size={32} color="#ef4444" />} 
                    title="Personalized Experience" 
                    description="From picking your preferred genres during onboarding to getting a tailored 'Made For You' feed, Mehfil adapts to your unique taste."
                    glowColor="rgba(239, 68, 68, 0.2)"
                />
            </div>
            
            <div style={{ marginTop: '5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '3rem 2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Crafted with Love</h2>
                <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', margin: '0 auto 2rem' }}>
                    Every pixel, every animation, and every feature has been carefully designed to give you the most premium music listening experience on the web.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '12px 24px', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                    <Heart size={20} color="#ef4444" fill="#ef4444" /> by h3y.Sam
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description, glowColor }) {
    return (
        <div style={{ 
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', 
            padding: '2rem', 
            borderRadius: '24px', 
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: `0 10px 30px ${glowColor}`,
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'default'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = `0 20px 40px ${glowColor}`;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 10px 30px ${glowColor}`;
        }}
        >
            <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>{title}</h3>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{description}</p>
        </div>
    );
}
