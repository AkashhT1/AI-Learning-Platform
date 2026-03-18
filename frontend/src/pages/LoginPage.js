import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  { label: '👩‍🏫 Teacher — Rekha Pillai', email: 'teacher@vidyaai.com', password: 'teacher123', tag: 'Teacher' },
  { label: '📚 Student — Arjun (Struggling, Class 7)', email: 'arjun@vidyaai.com', password: 'student123', tag: 'Class 7A' },
  { label: '🏆 Student — Rahul (Top Performer, Class 7)', email: 'rahul@vidyaai.com', password: 'student123', tag: 'Class 7B' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async (em, pw) => {
    setError(''); setLoading(true);
    try {
      const u = await login(em, pw);
      navigate(u.role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch {
      setError('Login failed. Is the backend running on port 5000?');
    } finally { setLoading(false); }
  };

  const inp = {
    width:'100%', background:'rgba(124,92,252,0.07)',
    border:'1px solid rgba(124,92,252,0.2)', borderRadius:12,
    padding:'11px 16px', color:'var(--text)', fontSize:14, fontWeight:600,
    outline:'none', marginBottom:14, fontFamily:'var(--font)',
    transition:'border 0.2s'
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative' }}>
      {/* Floating orbs */}
      <div style={{ position:'fixed', top:'15%', left:'10%', width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,92,252,0.18),transparent 70%)', pointerEvents:'none', animation:'float 6s ease-in-out infinite' }} />
      <div style={{ position:'fixed', bottom:'20%', right:'12%', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(240,64,160,0.15),transparent 70%)', pointerEvents:'none', animation:'float 8s ease-in-out infinite reverse' }} />
      <div style={{ position:'fixed', top:'50%', right:'20%', width:130, height:130, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,0.12),transparent 70%)', pointerEvents:'none', animation:'float 5s ease-in-out infinite' }} />

      <div style={{ width:'100%', maxWidth:460, animation:'fadeUp 0.5s ease both' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{
            width:64, height:64, borderRadius:18, margin:'0 auto 14px',
            background:'linear-gradient(135deg,#7C5CFC,#F040A0)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
            boxShadow:'0 8px 30px rgba(124,92,252,0.5)',
            animation:'anim-float 3s ease-in-out infinite'
          }}>📚</div>
          <h1 style={{ fontSize:34, fontWeight:900, fontFamily:'var(--font2)' }}>
            <span>Vidya</span>
            <span style={{ background:'linear-gradient(90deg,#7C5CFC,#F040A0,#00D4FF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>AI</span>
          </h1>
          <p style={{ color:'var(--text2)', fontSize:13, marginTop:6, fontWeight:600 }}>
            🎓 AI-Powered Learning for Every Student · SDG 4
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(24,22,58,0.9)', border:'1px solid rgba(124,92,252,0.2)',
          borderRadius:20, padding:32, backdropFilter:'blur(20px)',
          boxShadow:'0 20px 60px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:22, color:'var(--text)' }}>Sign in to your account</h2>

          {error && (
            <div style={{ background:'rgba(255,69,96,0.12)', border:'1px solid rgba(255,69,96,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#FF8FA3', marginBottom:16, fontWeight:600 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={e => { e.preventDefault(); doLogin(email, password); }}>
            <label style={{ fontSize:11, fontWeight:800, color:'var(--text3)', letterSpacing:1 }}>EMAIL</label><br />
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="your@school.edu" required style={inp}
              onFocus={e=>e.target.style.borderColor='#7C5CFC'} onBlur={e=>e.target.style.borderColor='rgba(124,92,252,0.2)'} />

            <label style={{ fontSize:11, fontWeight:800, color:'var(--text3)', letterSpacing:1 }}>PASSWORD</label><br />
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" required style={{...inp, marginBottom:22}}
              onFocus={e=>e.target.style.borderColor='#7C5CFC'} onBlur={e=>e.target.style.borderColor='rgba(124,92,252,0.2)'} />

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'13px', fontSize:15, fontWeight:800,
              background:'linear-gradient(135deg,#7C5CFC,#F040A0)', color:'#fff',
              border:'none', borderRadius:12, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, boxShadow:'0 6px 24px rgba(124,92,252,0.45)',
              fontFamily:'var(--font)', transition:'all 0.2s'
            }}>
              {loading ? '⏳ Signing in…' : '🚀 Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ flex:1, height:1, background:'rgba(124,92,252,0.15)' }} />
              <span style={{ fontSize:10, color:'var(--text3)', fontWeight:800, letterSpacing:1.5 }}>DEMO ACCOUNTS</span>
              <div style={{ flex:1, height:1, background:'rgba(124,92,252,0.15)' }} />
            </div>
            {DEMO.map((acc, i) => (
              <button key={i} onClick={()=>doLogin(acc.email,acc.password)} disabled={loading}
                style={{
                  width:'100%', marginBottom:8, padding:'11px 16px',
                  background: i===0 ? 'rgba(0,212,255,0.08)' : i===1 ? 'rgba(255,107,53,0.08)' : 'rgba(57,255,20,0.08)',
                  border: `1px solid ${i===0 ? 'rgba(0,212,255,0.2)' : i===1 ? 'rgba(255,107,53,0.2)' : 'rgba(57,255,20,0.2)'}`,
                  borderRadius:12, color: i===0 ? '#7AE8FF' : i===1 ? '#FF9E78' : '#8BFF6C',
                  fontSize:13, fontWeight:700, cursor:'pointer', textAlign:'left',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  fontFamily:'var(--font)', transition:'all 0.2s'
                }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateX(4px)'}
                onMouseLeave={e=>e.currentTarget.style.transform=''}
              >
                <span>{acc.label}</span>
                <span style={{ fontSize:10, opacity:0.7, fontWeight:700 }}>{acc.tag}</span>
              </button>
            ))}
          </div>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--text3)', marginTop:18, fontWeight:600 }}>
          Built with ☁️ Azure OpenAI · Microsoft for SDG 4
        </p>
      </div>
    </div>
  );
}
