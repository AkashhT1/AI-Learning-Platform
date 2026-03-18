import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SUBJECT_COLORS = ['#7C5CFC','#F040A0','#00D4FF','#39FF14','#FF6B35','#FFD600','#00E5C3'];

function getColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[h];
}

export default function Layout({ children, navItems }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const avatarColor = getColor(user?.name || 'U');

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 244,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #13102A 0%, #0D0B1F 100%)',
        borderRight: '1px solid rgba(124,92,252,0.12)',
        display: 'flex', flexDirection: 'column',
        padding: '0', flexShrink: 0,
        position: 'sticky', top: 0,
      }}>
        {/* Logo */}
        <div style={{ padding:'22px 22px 20px', borderBottom:'1px solid rgba(124,92,252,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:40, height:40, borderRadius:12,
              background:'linear-gradient(135deg,#7C5CFC,#F040A0)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, boxShadow:'0 4px 16px rgba(124,92,252,0.5)',
              animation:'glowpulse 3s ease-in-out infinite'
            }}>📚</div>
            <div>
              <div style={{ fontSize:20, fontWeight:900, fontFamily:'var(--font2)', letterSpacing:-0.5 }}>
                <span style={{ color:'#EEF0FF' }}>Vidya</span><span style={{ background:'linear-gradient(90deg,#7C5CFC,#F040A0)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>AI</span>
              </div>
              <div style={{ fontSize:9, color:'#5E5590', fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>SDG 4 · Quality Education</div>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <div style={{ flex:1, padding:'12px 0', overflowY:'auto' }}>
          {navItems.map((section, si) => (
            <div key={si}>
              <div style={{ fontSize:9, fontWeight:800, color:'#5E5590', textTransform:'uppercase', letterSpacing:2, padding:'12px 22px 6px' }}>
                {section.label}
              </div>
              {section.items.map((item, ii) => {
                const active = location.pathname === item.path;
                return (
                  <div key={ii} onClick={() => navigate(item.path)} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'10px 22px', cursor:'pointer', transition:'all 0.2s',
                    background: active ? 'rgba(124,92,252,0.15)' : 'transparent',
                    borderLeft: `3px solid ${active ? '#7C5CFC' : 'transparent'}`,
                    borderRadius: active ? '0 12px 12px 0' : '0',
                    margin: '1px 0',
                    color: active ? '#A98BFD' : '#A89ECE',
                  }}
                  onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='rgba(124,92,252,0.07)'; }}
                  onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}
                  >
                    <span style={{ fontSize:17, width:22, textAlign:'center' }}>{item.icon}</span>
                    <span style={{ fontSize:13.5, fontWeight:active?800:600 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{ marginLeft:'auto', background:'linear-gradient(135deg,#FF4560,#F040A0)', color:'#fff', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:20 }}>
                        {item.badge}
                      </span>
                    )}
                    {active && <span style={{ marginLeft:'auto', fontSize:10 }}>●</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer / Profile */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid rgba(124,92,252,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:38, height:38, borderRadius:'50%',
              background:`linear-gradient(135deg,${avatarColor},${avatarColor}88)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:900, fontSize:13, color:'#0D0B1F', flexShrink:0,
              border:`2px solid ${avatarColor}60`, boxShadow:`0 0 12px ${avatarColor}40`
            }}>{initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:800, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize:10, color:'var(--text3)', fontWeight:600 }}>
                {user?.role === 'teacher' ? '👩‍🏫 Teacher' : `🎓 Class ${user?.grade}`}
              </p>
            </div>
            <button onClick={logout} title="Logout" style={{
              background:'rgba(255,69,96,0.12)', border:'1px solid rgba(255,69,96,0.2)',
              borderRadius:8, color:'var(--red-lt)', fontSize:13, cursor:'pointer', padding:'5px 8px',
              transition:'all 0.2s', fontFamily:'var(--font)'
            }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,69,96,0.25)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,69,96,0.12)'}
            >⏏</button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex:1, overflowY:'auto', padding:'32px 36px', minWidth:0 }}>
        {children}
      </main>
    </div>
  );
}
