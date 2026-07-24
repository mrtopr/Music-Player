import React, { useEffect, useState } from 'react';
import { Play, Clock, Music, Loader2 } from 'lucide-react';
import '../styles/Stats.css';
import { getUserId } from '../utils/telemetry.js';
import { useAuthStore } from '../store/useAuthStore';

export default function Stats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const userId = getUserId();
            const token = useAuthStore.getState().token;

            // Don't attempt fetch for unauthenticated users — userId would be null
            // which fails backend UUID validation and returns a 400 error.
            if (!userId || !token) {
                setLoading(false);
                return;
            }

            try {
                const API = import.meta.env.VITE_API_URL || '';
                const res = await fetch(`${API}/api/telemetry/stats?userId=${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setStats(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="stats-loading">
                <Loader2 className="spinner" size={32} />
                <p>Loading your listening stats...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="stats-empty">
                <h2>No Stats Yet</h2>
                <p>Start listening to some music to generate your personalized stats!</p>
            </div>
        );
    }

    return (
        <div className="stats-page animate-fade-in">
            <h1 className="stats-title">My Listening Stats</h1>
            
            <div className="stats-grid">
                {/* Total Time */}
                <div className="stat-card glass-panel">
                    <div className="stat-icon-wrapper">
                        <Clock className="stat-icon" />
                    </div>
                    <div className="stat-content">
                        <h3>Total Listening Time</h3>
                        <p className="stat-value">{stats.totalListeningTimeMinutes} <span>minutes</span></p>
                    </div>
                </div>

                {/* Top Artists */}
                <div className="stat-card glass-panel">
                    <div className="stat-icon-wrapper">
                        <Play className="stat-icon" />
                    </div>
                    <div className="stat-content">
                        <h3>Top Artists</h3>
                        <ul className="stat-list">
                            {stats.topArtists.length > 0 ? (
                                stats.topArtists.map((artist, idx) => (
                                    <li key={idx}><span className="rank">#{idx + 1}</span> {artist.name}</li>
                                ))
                            ) : (
                                <li>No top artists yet</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Top Genres */}
                <div className="stat-card glass-panel">
                    <div className="stat-icon-wrapper">
                        <Music className="stat-icon" />
                    </div>
                    <div className="stat-content">
                        <h3>Top Genres</h3>
                        <ul className="stat-list">
                            {stats.topGenres.length > 0 ? (
                                stats.topGenres.map((genre, idx) => (
                                    <li key={idx}><span className="rank">#{idx + 1}</span> {genre.name}</li>
                                ))
                            ) : (
                                <li>No top genres yet</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
