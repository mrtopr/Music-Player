import React from 'react';
import { useParams } from 'react-router-dom';

export default function Legal() {
    const { type } = useParams();

    const renderContent = () => {
        if (type === 'terms') {
            return (
                <>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>Terms & Conditions</h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#c084fc', marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                            By accessing and using Mehfil Music, you accept and agree to be bound by the terms and provision of this agreement.
                            Mehfil is an educational, non-commercial project designed to showcase modern web development capabilities.
                        </p>
                    </section>
                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#c084fc', marginBottom: '1rem' }}>2. Content Disclaimer</h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                            All audio content, album arts, and metadata are fetched in real-time from third-party public APIs. 
                            Mehfil Music does not host, upload, or store any copyrighted media files on its servers. We act solely as a client-side interface.
                        </p>
                    </section>
                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#c084fc', marginBottom: '1rem' }}>3. User Conduct</h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                            Users agree to use the collaborative features (like Listen Together) responsibly. 
                            Any abuse of the real-time syncing mechanisms or attempting to disrupt the service for others is prohibited.
                        </p>
                    </section>
                </>
            );
        } else if (type === 'privacy') {
            return (
                <>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>Privacy Policy</h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#818cf8', marginBottom: '1rem' }}>1. Information We Collect</h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                            Mehfil Music prioritizes your privacy. We do not require account creation, and all your data—including your listening history, 
                            favorite songs, and custom playlists—is stored locally on your device using browser storage. 
                            We do not collect or transmit your personal data to external servers.
                        </p>
                    </section>
                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#818cf8', marginBottom: '1rem' }}>2. Microphone Usage</h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                            The "Song Recognition" feature requires temporary access to your device's microphone. Audio snippets are recorded locally 
                            and sent directly to the recognition API solely for the purpose of identifying the playing track. We do not save or 
                            listen to these recordings.
                        </p>
                    </section>
                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#818cf8', marginBottom: '1rem' }}>3. Third-Party Services</h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                            We utilize third-party APIs for music streaming, lyrics fetching, and real-time WebSocket communication. 
                            These services may log standard analytical data (such as IP addresses) as per their respective privacy policies.
                        </p>
                    </section>
                </>
            );
        } else if (type === 'contact') {
            return (
                <>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>Contact Us</h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '2rem' }}>
                        Have questions, feedback, or feature requests? We'd love to hear from you!
                    </p>
                    
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.2rem', color: '#34d399', marginBottom: '0.5rem' }}>Developer</h3>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>Designed and developed by <strong>h3y.Sam</strong> with love.</p>
                        </div>
                    </div>
                </>
            );
        } else {
            return <h1 style={{ color: '#fff' }}>Page Not Found</h1>;
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
            {renderContent()}
        </div>
    );
}
