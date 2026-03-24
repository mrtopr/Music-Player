import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, X } from 'lucide-react';

export default function LoginModal() {
    const [visible, setVisible] = useState(false);
    const [name, setName] = useState('');
    const [pic, setPic] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        const saved = localStorage.getItem('mehfilUser');
        if (!saved) {
            setTimeout(() => setVisible(true), 500);
        }
    }, []);

    const handlePic = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setPic(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const userData = { name: name.trim(), profilePicture: pic, loginDate: new Date().toISOString() };
        try {
            localStorage.setItem('mehfilUser', JSON.stringify(userData));
        } catch (e) {
            console.warn('Profile picture too large for storage, saving name only.', e);
            localStorage.setItem('mehfilUser', JSON.stringify({ ...userData, profilePicture: null }));
        }
        setVisible(false);

        window.dispatchEvent(new Event('mehfil-login'));
    };

    if (!visible) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 99999, justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(145deg, #1a1a1a, #111)', padding: '2.5rem', borderRadius: '20px', width: '400px', maxWidth: '90vw', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                {/* Logo */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <img src="/mehfil-logo.png" alt="Mehfil" style={{ width: '60px', height: '60px', marginBottom: '0.5rem', objectFit: 'contain' }} />
                    <h2 style={{ fontFamily: "'Merienda', cursive", color: 'var(--accent-primary)', margin: 0 }}>Mehfil</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>दिल से सुनो — Welcome!</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Avatar Upload */}
                    <div
                        onClick={() => fileRef.current?.click()}
                        style={{
                            width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 1.5rem',
                            background: pic ? `url(${pic}) center/cover` : 'rgba(255,255,255,0.06)',
                            border: '2px dashed rgba(255,255,255,0.2)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'border-color 0.3s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                    >
                        {!pic && <Camera size={28} color="var(--text-muted)" />}
                    </div>
                    <input type="file" ref={fileRef} accept="image/*" onChange={handlePic} style={{ display: 'none' }} />

                    {/* Name Input */}
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        style={{
                            width: '100%', padding: '0.9rem 1.2rem', borderRadius: 'var(--radius-pill, 50px)',
                            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-primary, #fff)', fontSize: '1rem', outline: 'none',
                            marginBottom: '1.5rem', textAlign: 'center',
                            transition: 'border-color 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                        autoFocus
                    />

                    {/* Submit */}
                    <button className="primary-cta-btn" type="submit" style={{
                        width: '100%', padding: '0.9rem', borderRadius: 'var(--radius-pill, 50px)',
                        fontSize: '1rem', fontWeight: 600
                    }}>
                        Start Listening 🎵
                    </button>
                </form>
            </div>
        </div>
    );
}
