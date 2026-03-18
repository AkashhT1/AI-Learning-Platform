import React from 'react';

/* ── Loader ────────────────────────────────── */
export function Loader({ fullscreen, size = 36 }) {
  const ring = (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `3px solid rgba(124,92,252,0.18)`,
        borderTopColor: '#7C5CFC',
        animation: 'spin 0.75s linear infinite'
      }} />
      <div style={{
        position: 'absolute', inset: 4, borderRadius: '50%',
        border: `3px solid rgba(240,64,160,0.12)`,
        borderBottomColor: '#F040A0',
        animation: 'spin 1.1s linear infinite reverse'
      }} />
    </div>
  );
  if (fullscreen) return (
    <div style={{ position:'fixed', inset:0, background:'#0D0B1F', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, zIndex:9999 }}>
      {ring}
      <p style={{ color:'#A89ECE', fontSize:14, fontWeight:600 }}>Loading VidyaAI…</p>
    </div>
  );
  return <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>{ring}</div>;
}

/* ── Card ──────────────────────────────────── */
export function Card({ children, style={}, glow }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border2)',
      borderRadius: 'var(--r)',
      padding: 22,
      transition: 'box-shadow 0.3s',
      boxShadow: glow ? '0 0 28px rgba(124,92,252,0.25)' : 'none',
      ...style
    }}>{children}</div>
  );
}

export function CardTitle({ children, action, onAction }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
      <span style={{ fontSize:14, fontWeight:800, color:'var(--text2)', letterSpacing:0.2 }}>{children}</span>
      {action && <span onClick={onAction} style={{ fontSize:11, color:'var(--violet-lt)', cursor:'pointer', fontWeight:700 }}>{action}</span>}
    </div>
  );
}

/* ── StatCard ──────────────────────────────── */
export function StatCard({ label, value, sub, color='var(--violet)', icon, progress }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border2)', borderRadius:'var(--r)', padding:20,
      position:'relative', overflow:'hidden', transition:'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 30px ${color}33`; }}
    onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
    >
      {/* Glow blob top-right */}
      <div style={{ position:'absolute', top:-20, right:-20, width:70, height:70, borderRadius:'50%', background:color, opacity:0.12, filter:'blur(20px)' }} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1.2 }}>{label}</span>
        {icon && <span style={{ fontSize:20 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:30, fontWeight:900, color, letterSpacing:-1, fontFamily:'var(--font2)' }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'var(--text3)', marginTop:4, fontWeight:600 }}>{sub}</div>}
      {progress !== undefined && (
        <div style={{ height:4, background:'var(--bg3)', borderRadius:2, marginTop:14, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${Math.min(progress,100)}%`, background:`linear-gradient(90deg,${color},${color}99)`, borderRadius:2, transition:'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
        </div>
      )}
    </div>
  );
}

/* ── ScorePill ─────────────────────────────── */
export function ScorePill({ score }) {
  const [bg, fg] = score >= 80 ? ['rgba(57,255,20,0.15)', '#39FF14']
    : score >= 55 ? ['rgba(255,214,0,0.15)', '#FFD600']
    : ['rgba(255,69,96,0.18)', '#FF4560'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', fontSize:12, fontWeight:800, padding:'3px 11px', borderRadius:20, background:bg, color:fg }}>
      {score}%
    </span>
  );
}

/* ── Tag ───────────────────────────────────── */
export function Tag({ children, color='violet' }) {
  const map = {
    violet: ['rgba(124,92,252,0.15)','#A98BFD'],
    green:  ['rgba(57,255,20,0.13)', '#39FF14'],
    pink:   ['rgba(240,64,160,0.15)','#FF79C6'],
    orange: ['rgba(255,107,53,0.15)','#FF9E78'],
    yellow: ['rgba(255,214,0,0.15)', '#FFD600'],
    cyan:   ['rgba(0,212,255,0.14)', '#7AE8FF'],
    red:    ['rgba(255,69,96,0.15)', '#FF8FA3'],
    teal:   ['rgba(0,229,195,0.14)', '#00E5C3'],
  };
  const [bg, fg] = map[color] || map.violet;
  return (
    <span style={{ fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:20, background:bg, color:fg, letterSpacing:0.3 }}>
      {children}
    </span>
  );
}

/* ── Btn ───────────────────────────────────── */
export function Btn({ children, onClick, variant='primary', style={}, disabled=false, size='md' }) {
  const pad = size === 'sm' ? '6px 14px' : size === 'lg' ? '13px 28px' : '9px 20px';
  const fs  = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;
  const variants = {
    primary: { background:'linear-gradient(135deg,#7C5CFC,#A040E0)', color:'#fff', border:'none', boxShadow:'0 4px 18px rgba(124,92,252,0.4)' },
    pink:    { background:'linear-gradient(135deg,#F040A0,#FF79C6)', color:'#fff', border:'none', boxShadow:'0 4px 18px rgba(240,64,160,0.4)' },
    cyan:    { background:'linear-gradient(135deg,#00D4FF,#0090D0)', color:'#0D0B1F', border:'none', boxShadow:'0 4px 18px rgba(0,212,255,0.35)' },
    lime:    { background:'linear-gradient(135deg,#39FF14,#1ECC00)', color:'#0D0B1F', border:'none', boxShadow:'0 4px 18px rgba(57,255,20,0.35)' },
    orange:  { background:'linear-gradient(135deg,#FF6B35,#FF9E78)', color:'#fff', border:'none', boxShadow:'0 4px 18px rgba(255,107,53,0.4)' },
    outline: { background:'transparent', color:'var(--text2)', border:'1px solid var(--border)', boxShadow:'none' },
    ghost:   { background:'rgba(124,92,252,0.1)', color:'var(--violet-lt)', border:'1px solid rgba(124,92,252,0.2)', boxShadow:'none' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        padding: pad, borderRadius: 'var(--r2)', fontSize: fs, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s', fontFamily: 'var(--font)', display:'inline-flex',
        alignItems:'center', gap:6, ...v, ...style
      }}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=''; }}
    >
      {children}
    </button>
  );
}

/* ── SubjectBar ────────────────────────────── */
export function SubjectBar({ icon, name, sub, score, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid var(--border2)' }}>
      <div style={{ width:36, height:36, borderRadius:10, background:`${color}20`, border:`1px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:800 }}>{name}</div>
        {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:1, fontWeight:600 }}>{sub}</div>}
      </div>
      <div style={{ width:110, height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${score}%`, background:`linear-gradient(90deg,${color},${color}99)`, borderRadius:3, transition:'width 1s ease' }} />
      </div>
      <div style={{ fontSize:13, fontWeight:800, minWidth:38, textAlign:'right', color }}>{score}%</div>
    </div>
  );
}

/* ── InsightBox ────────────────────────────── */
export function InsightBox({ children, onAction, actionLabel, color='violet' }) {
  const cols = {
    violet: { border:'rgba(124,92,252,0.35)', bg:'rgba(124,92,252,0.09)', dot:'#7C5CFC' },
    pink:   { border:'rgba(240,64,160,0.35)', bg:'rgba(240,64,160,0.09)', dot:'#F040A0' },
    cyan:   { border:'rgba(0,212,255,0.35)',  bg:'rgba(0,212,255,0.09)',  dot:'#00D4FF' },
  };
  const c = cols[color] || cols.violet;
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:'var(--r)', padding:'18px 20px', marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:c.dot, display:'inline-block', animation:'pulse 2s infinite' }} />
        <span style={{ fontSize:10, fontWeight:800, color:c.dot, textTransform:'uppercase', letterSpacing:1.5 }}>🤖 AI Insight</span>
      </div>
      <div style={{ fontSize:13.5, lineHeight:1.65, color:'var(--text)' }}>{children}</div>
      {actionLabel && <div onClick={onAction} style={{ marginTop:10, fontSize:12, color:'var(--teal)', cursor:'pointer', fontWeight:700 }}>{actionLabel}</div>}
    </div>
  );
}

/* ── DiffBadge ─────────────────────────────── */
export function DiffBadge({ level }) {
  const map = { easy:['var(--easy-c)','rgba(57,255,20,0.15)','🟢'], medium:['var(--medium-c)','rgba(255,214,0,0.15)','🟡'], hard:['var(--hard-c)','rgba(255,69,96,0.18)','🔴'] };
  const [fg, bg, ico] = map[level] || map.medium;
  return <span style={{ fontSize:11, fontWeight:800, padding:'4px 12px', borderRadius:20, background:bg, color:fg, letterSpacing:0.3 }}>{ico} {level.toUpperCase()}</span>;
}

/* ── GradeChip ─────────────────────────────── */
export function GradeChip({ grade }) {
  const n = parseInt(String(grade));
  const [bg, fg] = n <= 5 ? ['rgba(57,255,20,0.15)','#39FF14']
    : n <= 8 ? ['rgba(124,92,252,0.15)','#A98BFD']
    : ['rgba(255,69,96,0.15)','#FF8FA3'];
  return <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:20, background:bg, color:fg }}>Class {grade}</span>;
}
