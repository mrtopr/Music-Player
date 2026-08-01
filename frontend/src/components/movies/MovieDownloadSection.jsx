import React from 'react';
import { Download, HardDrive, FileVideo, Magnet, ExternalLink, ShieldCheck } from 'lucide-react';

export default function MovieDownloadSection({ videoFiles, torrentUrl, detailsUrl, movieTitle }) {
    if (!videoFiles || videoFiles.length === 0) {
        return (
            <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.6)'
            }}>
                <FileVideo size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No direct downloadable MP4 files discovered for this title.</p>
                {detailsUrl && (
                    <a 
                        href={detailsUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: 'var(--accent-primary, #c084fc)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}
                    >
                        View item on Archive.org <ExternalLink size={14} />
                    </a>
                )}
            </div>
        );
    }

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(25, 25, 30, 0.9), rgba(15, 15, 20, 0.95))',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '24px',
            marginTop: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
            {/* Header badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981'
                    }}>
                        <Download size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                            Dedicated Movie Download Section
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                            Public Domain • Direct MP4 & Archive Files
                        </span>
                    </div>
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)',
                    fontSize: '0.75rem', color: '#10b981', fontWeight: 600
                }}>
                    <ShieldCheck size={14} /> 100% Legal Public Domain
                </div>
            </div>

            {/* List of downloadable files */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {videoFiles.map((file, idx) => (
                    <div 
                        key={idx}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 18px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            transition: 'background 0.2s, border 0.2s',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            <FileVideo size={22} style={{ color: '#c084fc', flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {file.format || file.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                                    <span><HardDrive size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {file.size}</span>
                                    {file.height && <span>Resolution: {file.height}p</span>}
                                </div>
                            </div>
                        </div>

                        <a
                            href={file.url}
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 18px',
                                borderRadius: '8px',
                                background: idx === 0 ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                color: idx === 0 ? '#000' : '#fff',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                border: 'none',
                                flexShrink: 0
                            }}
                        >
                            <Download size={16} /> {idx === 0 ? 'Download Best Quality' : 'Download File'}
                        </a>
                    </div>
                ))}

                {/* Torrent Download option if present */}
                {torrentUrl && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Magnet size={22} style={{ color: '#a855f7' }} />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                                    Archive Torrent Package
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                    Full metadata + multi-format video files
                                </div>
                            </div>
                        </div>

                        <a
                            href={torrentUrl}
                            download
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 18px',
                                borderRadius: '8px',
                                background: 'rgba(168, 85, 247, 0.2)',
                                color: '#d8b4fe',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textDecoration: 'none',
                                border: '1px solid rgba(168, 85, 247, 0.4)'
                            }}
                        >
                            <Magnet size={16} /> Get Torrent
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
