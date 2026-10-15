import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  Music2, AlertCircle, Loader2,
  CheckCircle, KeyRound, Mail, ArrowLeft, Eye, EyeOff,
  Headphones, Radio, Disc3, Mic2, User
} from '../components/common/LordIcon';

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL ICONS
// ─────────────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.04-2.85 0-.15-.01-.29-.04-.44-.99.04-2.19.66-2.89 1.48-.56.64-.99 1.67-.99 2.73 0 .15.02.29.04.42 1.08.08 2.22-.59 2.84-1.34z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Headphones, label: 'Hi-Fi Audio' },
  { icon: Radio,      label: 'Live Sessions' },
  { icon: Disc3,      label: 'Smart Queue' },
  { icon: Mic2,       label: 'Song ID' },
];

const INPUT_BASE = {
  width: '100%', padding: '13px 16px', borderRadius: '12px', fontSize: '0.96rem',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
  color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
};

function focusOn(e) {
  e.target.style.borderColor = 'rgba(168,85,247,0.7)';
  e.target.style.background  = 'rgba(168,85,247,0.07)';
  e.target.style.boxShadow   = '0 0 0 3px rgba(168,85,247,0.13)';
}
function focusOff(e) {
  e.target.style.borderColor = 'rgba(255,255,255,0.09)';
  e.target.style.background  = 'rgba(255,255,255,0.05)';
  e.target.style.boxShadow   = 'none';
}

function Field({ label, type = 'text', value, onChange, placeholder, autoFocus, right }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
        {right}
      </div>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} required autoFocus={autoFocus}
        style={INPUT_BASE} onFocus={focusOn} onBlur={focusOff}
      />
    </div>
  );
}

function PwField({ label, value, onChange, placeholder = '••••••••', right, showPass, onToggle }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
        {right}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={showPass ? 'text' : 'password'} value={value} onChange={onChange}
          placeholder={placeholder} required
          style={{ ...INPUT_BASE, padding: '13px 46px 13px 16px' }}
          onFocus={focusOn} onBlur={focusOff}
        />
        <button
          type="button" onClick={onToggle} tabIndex={-1}
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function SubmitBtn({ label, loading }) {
  return (
    <button
      type="submit" disabled={loading}
      style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '0.97rem', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#a855f7,#6366f1)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, opacity: loading ? 0.65 : 1, boxShadow: loading ? 'none' : '0 6px 20px rgba(168,85,247,0.4)', transition: 'all 0.2s', marginTop: 4 }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(168,85,247,0.55)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 6px 20px rgba(168,85,247,0.4)'; }}
    >
      {loading ? <Loader2 size={20} style={{ animation: 'a-spin 0.8s linear infinite' }} /> : label}
    </button>
  );
}

function TextLink({ onClick, children }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', color: '#c084fc', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', padding: 0, transition: 'opacity 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >{children}</button>
  );
}

function BackBtn({ onBack }) {
  return (
    <button
      type="button" onClick={onBack}
      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.83rem', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: '1.5rem', transition: 'color 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
    >
      <ArrowLeft size={14} /> Back to Sign In
    </button>
  );
}

function IconBadge({ icon: Icon }) {
  return (
    <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
      <Icon size={22} color="#c084fc" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AUTH COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Auth() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('reset');

  const [view,        setView]        = useState(resetToken ? 'reset' : 'login');
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [rememberMe,  setRememberMe]  = useState(true);
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [mounted,     setMounted]     = useState(false);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && (window.innerWidth < 860 || 'ontouchstart' in window));

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
    const onResize = () => setIsMobile(window.innerWidth < 860 || 'ontouchstart' in window);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navigate   = useNavigate();
  const loginStore = useAuthStore(s => s.login);
  const API        = import.meta.env.VITE_API_URL || '';

  const go = v => { setView(v); setError(null); };
  const togglePass = () => setShowPass(p => !p);

  const post = async (path, body) => {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok && data.success === undefined) {
      return { success: false, message: data.message || `Server error (${r.status})` };
    }
    return data;
  };

  const handleAuth = async e => {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const isLogin = view === 'login';
      const data = await post(`/api/auth/${isLogin ? 'login' : 'register'}`,
        isLogin ? { email, password } : { name, email, password });
      if (data.success) { loginStore(data.user, data.token); navigate('/'); }
      else setError(data.message || 'Authentication failed');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleForgot = async e => {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const data = await post('/api/auth/forgot-password', { email });
      if (data.success) go('forgot-sent'); else setError(data.message);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  const handleReset = async e => {
    e.preventDefault(); setError(null);
    if (newPassword !== confirmPass) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Minimum 6 characters.'); return; }
    setLoading(true);
    try {
      const data = await post('/api/auth/reset-password', { token: resetToken, newPassword });
      if (data.success) go('reset-done'); else setError(data.message);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  const handleSocialLogin = (provider) => {
    // Quick Demo / Social Login
    const demoUser = {
      id: `social_${Date.now()}`,
      name: `${provider} Listener`,
      email: `user@${provider.toLowerCase()}.com`,
      profileImageUrl: '/dp.png'
    };
    loginStore(demoUser, 'demo-token-' + Date.now());
    navigate('/');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Merienda:wght@700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes a-bg   { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes a-vinyl { to { transform: rotate(360deg); } }
        @keyframes a-bar  { 0%,100%{transform:scaleY(0.35)} 50%{transform:scaleY(1)} }
        @keyframes a-in   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes a-spin { to { transform: rotate(360deg); } }
        @keyframes a-orb  { 0%,100%{transform:scale(1) translate(0,0);opacity:0.5} 50%{transform:scale(1.1) translate(2%,3%);opacity:0.65} }
        .a-mounted { animation: a-in 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
        .a-mobile-brand { display: none; }

        /* ── Mobile UI Redesign (Faithful to Screenshot 2) ── */
        @media (max-width: 860px) {
          .a-left { display: none !important; }
          .a-two-col { flex-direction: column !important; min-height: 100vh !important; }
          
          .auth-mobile-screen {
            position: relative;
            min-height: 100vh;
            width: 100%;
            padding: 24px 22px calc(40px + env(safe-area-inset-bottom, 0px)) 22px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #080a14 !important;
            overflow: hidden;
            box-sizing: border-box;
          }

          /* Tech Grid Texture matching Screenshot 2 */
          .auth-mobile-screen::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image: 
              linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
            background-size: 38px 38px;
            pointer-events: none;
            z-index: 1;
          }

          /* Top Right Neon Headphones Artwork */
          .auth-mobile-art-bg {
            position: absolute;
            top: 0;
            right: 0;
            width: 62vw;
            max-width: 280px;
            height: 280px;
            background-image: url('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80');
            background-size: cover;
            background-position: center;
            opacity: 0.38;
            mask-image: radial-gradient(circle at top right, black 40%, transparent 80%);
            -webkit-mask-image: radial-gradient(circle at top right, black 40%, transparent 80%);
            pointer-events: none;
            z-index: 2;
          }

          .auth-mobile-back-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
            z-index: 10;
            transition: all 0.2s;
          }

          .auth-mobile-back-btn:active {
            transform: scale(0.92);
          }

          .auth-mobile-content {
            position: relative;
            z-index: 10;
            margin: auto 0;
            width: 100%;
          }

          .auth-mobile-brand-tag {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.65);
            margin-bottom: 12px;
          }

          .auth-mobile-headline {
            font-size: clamp(1.75rem, 7vw, 2.15rem);
            font-weight: 800;
            line-height: 1.18;
            color: #fff;
            letter-spacing: -0.5px;
            margin-bottom: 24px;
            word-break: break-word;
          }

          .auth-headline-dim {
            color: rgba(255, 255, 255, 0.45);
            font-weight: 600;
          }

          /* Pill Inputs matching Screenshot 2 */
          .auth-mobile-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
            width: 100%;
          }

          .auth-pill-input-wrap {
            position: relative;
            display: flex;
            align-items: center;
            width: 100%;
            background: rgba(20, 24, 42, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 9999px;
            height: 54px;
            padding: 0 20px;
            box-sizing: border-box;
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          .auth-pill-input-wrap:focus-within {
            border-color: #a855f7;
            box-shadow: 0 0 16px rgba(168, 85, 247, 0.35);
          }

          .auth-pill-input-wrap input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #fff;
            font-size: 15px;
            font-family: inherit;
            padding-left: 12px;
          }

          .auth-pill-input-wrap input::placeholder {
            color: rgba(255, 255, 255, 0.4);
          }

          .auth-pill-icon {
            color: rgba(255, 255, 255, 0.5);
            flex-shrink: 0;
          }

          .auth-pill-eye {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.45);
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          /* Options Row (Forgot & Remember) */
          .auth-mobile-options-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2px 4px;
            font-size: 13px;
          }

          .auth-forgot-link {
            color: #f43f5e;
            font-weight: 600;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
          }

          .auth-remember-label {
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(255, 255, 255, 0.55);
            cursor: pointer;
            font-weight: 500;
          }

          .auth-remember-radio {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1.5px solid rgba(255, 255, 255, 0.25);
            background: rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .auth-remember-radio.checked {
            background: #a855f7;
            border-color: #a855f7;
            box-shadow: 0 0 10px rgba(168, 85, 247, 0.6);
          }

          /* Solid Purple Pill Button */
          .auth-mobile-submit-btn {
            width: 100%;
            height: 54px;
            border-radius: 9999px;
            background: #9333ea;
            border: none;
            color: #fff;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(147, 51, 234, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: transform 0.2s, opacity 0.2s;
            margin-top: 6px;
          }

          .auth-mobile-submit-btn:active {
            transform: scale(0.98);
          }

          /* OR divider */
          .auth-mobile-divider {
            display: flex;
            align-items: center;
            margin: 24px 0 18px 0;
            color: rgba(255, 255, 255, 0.4);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1.5px;
          }

          .auth-mobile-divider::before,
          .auth-mobile-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
          }

          .auth-mobile-divider span {
            padding: 0 16px;
          }

          /* Social circular buttons */
          .auth-social-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 24px;
          }

          .auth-social-btn {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
          }

          .auth-social-btn:active {
            transform: scale(0.92);
            background: rgba(255, 255, 255, 0.1);
          }

          /* Footer */
          .auth-mobile-footer {
            text-align: center;
            font-size: 13.5px;
            color: rgba(255, 255, 255, 0.55);
            position: relative;
            z-index: 10;
          }

          .auth-signup-lime {
            color: #a3e635;
            font-weight: 700;
            cursor: pointer;
            margin-left: 4px;
          }
        }
      `}</style>

      {/* ── MOBILE VIEW matching Screenshot 2 ── */}
      {isMobile ? (
        <div className="auth-mobile-screen">
          <div className="auth-mobile-art-bg" />

          {/* Top navigation */}
          <div>
            <button className="auth-mobile-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft size={20} />
            </button>
          </div>

          {/* Content & Form */}
          <div className="auth-mobile-content">
            <div className="auth-mobile-brand-tag">QENARA</div>

            <h1 className="auth-mobile-headline">
              {view === 'login' ? (
                <>Login <span className="auth-headline-dim">To</span><br /><span className="auth-headline-dim">Your</span> Account</>
              ) : view === 'register' ? (
                <>Create <span className="auth-headline-dim">An</span><br /><span className="auth-headline-dim">New</span> Account</>
              ) : (
                <>Reset <span className="auth-headline-dim">Your</span><br />Password</>
              )}
            </h1>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', padding: '11px 16px', borderRadius: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="auth-mobile-form">
              {view === 'register' && (
                <div className="auth-pill-input-wrap">
                  <User size={18} className="auth-pill-icon" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full Name"
                    required
                  />
                </div>
              )}

              <div className="auth-pill-input-wrap">
                <Mail size={18} className="auth-pill-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
              </div>

              {view !== 'forgot' && (
                <div className="auth-pill-input-wrap">
                  <KeyRound size={18} className="auth-pill-icon" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                  />
                  <button type="button" onClick={togglePass} className="auth-pill-eye" tabIndex={-1}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {/* Options row: Forgot Password & Remember Me */}
              {view === 'login' && (
                <div className="auth-mobile-options-row">
                  <button type="button" onClick={() => go('forgot')} className="auth-forgot-link">
                    Forgot Password?
                  </button>

                  <div className="auth-remember-label" onClick={() => setRememberMe(!rememberMe)}>
                    <div className={`auth-remember-radio ${rememberMe ? 'checked' : ''}`}>
                      {rememberMe && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <span>Remember me</span>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="auth-mobile-submit-btn">
                {loading ? <Loader2 size={20} style={{ animation: 'a-spin 0.8s linear infinite' }} /> : (view === 'login' ? 'Login' : view === 'register' ? 'Sign Up' : 'Send Link')}
              </button>
            </form>

            {/* OR Divider */}
            <div className="auth-mobile-divider">
              <span>OR</span>
            </div>

            {/* Social Logins */}
            <div className="auth-social-row">
              <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin('Facebook')} aria-label="Facebook Login">
                <FacebookIcon />
              </button>
              <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin('Google')} aria-label="Google Login">
                <GoogleIcon />
              </button>
              <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin('Apple')} aria-label="Apple Login">
                <AppleIcon />
              </button>
            </div>
          </div>

          {/* Footer toggle */}
          <div className="auth-mobile-footer">
            {view === 'login' ? (
              <>Don't have an account? <span className="auth-signup-lime" onClick={() => go('register')}>Sign up</span></>
            ) : (
              <>Already have an account? <span className="auth-signup-lime" onClick={() => go('login')}>Sign in</span></>
            )}
          </div>
        </div>
      ) : (
        /* ── DESKTOP VIEW ── */
        <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter',sans-serif", background: 'linear-gradient(-45deg,#06030f,#11061e,#0c0418,#07030f,#120520,#08030e)', backgroundSize: '400% 400%', animation: 'a-bg 18s ease infinite', position: 'relative', overflow: 'hidden' }}>

          {/* orbs */}
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '50vw', height: '50vw', background: 'radial-gradient(circle,#6d28d9 0%,transparent 65%)', borderRadius: '50%', filter: 'blur(4px)', animation: 'a-orb 20s ease-in-out infinite', zIndex: 0, opacity: 0.5 }} />
          <div style={{ position: 'absolute', bottom: '-15%', right: '-8%', width: '55vw', height: '55vw', background: 'radial-gradient(circle,#be185d 0%,transparent 65%)', borderRadius: '50%', filter: 'blur(4px)', animation: 'a-orb 26s ease-in-out infinite reverse', zIndex: 0, opacity: 0.35 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,3,15,0.65)', backdropFilter: 'blur(60px)', zIndex: 1 }} />

          {/* two-column */}
          <div className="a-two-col" style={{ display: 'flex', width: '100%', minHeight: '100vh', zIndex: 2 }}>

            {/* LEFT — brand */}
            <div className="a-left" style={{ flex: '0 0 46%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 3.5rem', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '3rem' }}>
                <img src="/mehfil-logo.png" alt="Mehfil" style={{ width: 40, height: 40, filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.7))' }} />
                <span style={{ fontFamily: "'Merienda',cursive", fontSize: '1.65rem', color: '#fff', letterSpacing: '-0.2px' }}>Mehfil</span>
              </div>

              <div style={{ position: 'relative', width: 170, height: 170, marginBottom: '2.75rem', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: '-22px', background: 'radial-gradient(circle,rgba(168,85,247,0.4) 0%,transparent 70%)', borderRadius: '50%', filter: 'blur(18px)' }} />
                <div style={{ width: 170, height: 170, borderRadius: '50%', background: 'conic-gradient(from 0deg,#1a1a2e,#16213e,#0f3460,#1a1a2e,#16213e,#1a1a2e)', border: '3px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.75)', animation: 'a-vinyl 14s linear infinite' }}>
                  {[14, 28, 42].map(i => <div key={i} style={{ position: 'absolute', inset: i, border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50%' }} />)}
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 22px rgba(236,72,153,0.65)', position: 'relative', zIndex: 1 }}>
                    <Music2 size={22} color="#fff" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              <h1 style={{ fontSize: '2.6rem', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-1.5px', textAlign: 'center', marginBottom: '1rem' }}>
                Your music,{' '}
                <span style={{ background: 'linear-gradient(90deg,#c084fc,#f472b6,#fb7185)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>your&nbsp;universe.</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.97rem', lineHeight: 1.7, textAlign: 'center', maxWidth: 320, marginBottom: '2.25rem' }}>
                AI-curated playlists, hi-fi audio, and real-time listen-together sessions.
              </p>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 28, marginBottom: '2.25rem' }}>
                {[0.6, 0.9, 0.4, 0.75, 0.55, 0.85, 0.5, 0.7, 0.45, 0.8, 0.6, 0.9].map((h, i) => (
                  <div key={i} style={{ width: 4, borderRadius: 3, background: 'linear-gradient(to top,#a855f7,#ec4899)', height: `${8 + h * 18}px`, transformOrigin: 'bottom', animation: `a-bar ${1.1 + i * 0.12}s ease-in-out ${i * 0.08}s infinite`, opacity: 0.75 }} />
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {FEATURES.map(({ icon: Icon, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                    <Icon size={13} color="#c084fc" />{label}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — form */}
            <div className="a-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 2rem' }}>
              <div className={mounted ? 'a-mounted' : ''} style={{ width: '100%', maxWidth: 400, opacity: mounted ? undefined : 0 }}>

                {/* Glass card */}
                <div className="a-card" style={{ background: 'rgba(18,12,32,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2.5rem 2.25rem', backdropFilter: 'blur(24px)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>

                  {error && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', padding: '11px 14px', borderRadius: 10, marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: '0.86rem', lineHeight: 1.5 }}>
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />{error}
                    </div>
                  )}

                  {/* LOGIN */}
                  {view === 'login' && (
                    <>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(168,85,247,0.85)', marginBottom: 8 }}>Welcome back</p>
                      <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', marginBottom: 6 }}>Sign in to Mehfil</h2>
                      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>Access your library, stats, and sessions.</p>
                      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
                        <PwField label="Password" value={password} onChange={e => setPassword(e.target.value)} showPass={showPass} onToggle={togglePass}
                          right={<TextLink onClick={() => go('forgot')}>Forgot password?</TextLink>} />
                        <SubmitBtn label="Sign In to Mehfil" loading={loading} />
                      </form>
                      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.88rem' }}>New to Mehfil? </span>
                        <TextLink onClick={() => go('register')}>Create a free account</TextLink>
                      </div>
                    </>
                  )}

                  {/* REGISTER */}
                  {view === 'register' && (
                    <>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(168,85,247,0.85)', marginBottom: 8 }}>Get started</p>
                      <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', marginBottom: 6 }}>Create your account</h2>
                      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>Build your ultimate music identity.</p>
                      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Field label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Arijit Singh" autoFocus />
                        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                        <PwField label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" showPass={showPass} onToggle={togglePass} />
                        <SubmitBtn label="Create Account" loading={loading} />
                      </form>
                      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.88rem' }}>Already have an account? </span>
                        <TextLink onClick={() => go('login')}>Sign in</TextLink>
                      </div>
                    </>
                  )}

                  {/* FORGOT */}
                  {view === 'forgot' && (
                    <>
                      <BackBtn onBack={() => go('login')} />
                      <IconBadge icon={KeyRound} />
                      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Forgot password?</h2>
                      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: '1.75rem' }}>Enter your email and we'll generate a reset link in the backend console.</p>
                      <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Field label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
                        <SubmitBtn label="Send Reset Link" loading={loading} />
                      </form>
                    </>
                  )}

                  {/* FORGOT SENT */}
                  {view === 'forgot-sent' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 40px rgba(168,85,247,0.2)' }}>
                        <Mail size={28} color="#c084fc" />
                      </div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 10 }}>Check the terminal</h2>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                        A reset URL was printed to your <strong style={{ color: 'rgba(255,255,255,0.7)' }}>backend terminal</strong>. Open it to set a new password.
                      </p>
                      <TextLink onClick={() => go('login')}>← Back to Sign In</TextLink>
                    </div>
                  )}

                  {/* RESET */}
                  {view === 'reset' && (
                    <>
                      <IconBadge icon={KeyRound} />
                      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Set new password</h2>
                      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>Choose a strong password — minimum 6 characters.</p>
                      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <PwField label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" showPass={showPass} onToggle={togglePass} />
                        <PwField label="Confirm Password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat password" showPass={showPass} onToggle={togglePass} />
                        <SubmitBtn label="Reset Password" loading={loading} />
                      </form>
                    </>
                  )}

                  {/* RESET DONE */}
                  {view === 'reset-done' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}>
                        <CheckCircle size={32} color="#4ade80" />
                      </div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 10 }}>Password updated!</h2>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '2rem' }}>Your password was changed. Sign in with your new credentials.</p>
                      <button type="button" onClick={() => go('login')}
                        style={{ padding: '13px 28px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '0.95rem', color: '#fff', cursor: 'pointer', background: 'linear-gradient(135deg,#a855f7,#6366f1)', boxShadow: '0 6px 20px rgba(168,85,247,0.4)' }}>
                        Sign In now
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
