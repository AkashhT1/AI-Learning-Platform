import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Common/Layout';
import { Card, CardTitle, StatCard, ScorePill, SubjectBar, InsightBox, Btn, Tag, GradeChip } from '../components/Common/UI';
import Loader from '../components/Common/Loader';
import { studentAPI, aiAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const NAV = [{ label: 'My Learning', items: [
  { icon: '🏠', label: 'Dashboard',  path: '/student' },
  { icon: '🧩', label: 'Take Quiz',  path: '/student/quiz' },
  { icon: '🗺️', label: 'Study Plan', path: '/student/study-plan' },
]}];

const SUBJECTS = [
  { icon: '➗', name: 'Mathematics',   color: 'var(--math)' },
  { icon: '🔬', name: 'Science',       color: 'var(--sci)'  },
  { icon: '📖', name: 'English',       color: 'var(--eng)'  },
  { icon: '🗺️', name: 'Social Studies',color: 'var(--social)'},
];

const BADGE_META = {
  first_quiz:   { label: 'First Quiz',    icon: '🎯', color: '#7C5CFC' },
  week_streak:  { label: '7-Day Streak',  icon: '🔥', color: '#FF6B35' },
  top_performer:{ label: 'Top Performer', icon: '🏆', color: '#FFD600' },
  math_master:  { label: 'Math Master',   icon: '➗', color: '#00D4FF' },
  quiz_master:  { label: 'Quiz Master',   icon: '🧩', color: '#F040A0' },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    studentAPI.dashboard()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handleGenPlan = async () => {
    setGenLoading(true);
    try { await aiAPI.generateStudyPlan(user.studentId); navigate('/student/study-plan'); }
    catch { alert('Failed to generate plan. Please try again.'); }
    finally { setGenLoading(false); }
  };

  if (loading) return <Layout navItems={NAV}><Loader /></Layout>;

  const s = data?.student;
  const weak   = data?.weakTopics   || [];
  const strong = data?.strongTopics || [];
  const history = data?.quizHistory  || [];
  const badges  = s?.badges || [];

  return (
    <Layout navItems={NAV}>
      {/* Header */}
      <div style={{ marginBottom:28 }} className="anim-up">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:28, fontWeight:900, fontFamily:'var(--font2)', letterSpacing:-0.5 }}>
              Hello, <span style={{ background:'linear-gradient(90deg,#7C5CFC,#F040A0)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{(user?.name||'').split(' ')[0]}</span>! 👋
            </h1>
            <div style={{ display:'flex', gap:8, marginTop:6, alignItems:'center' }}>
              <GradeChip grade={s?.grade || user?.grade || '?'} />
              <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>{s?.school || 'Govt. School'}</span>
            </div>
          </div>
          {s?.streak > 0 && (
            <div style={{ background:'rgba(255,107,53,0.15)', border:'1px solid rgba(255,107,53,0.3)', borderRadius:14, padding:'10px 18px', textAlign:'center' }}>
              <div style={{ fontSize:28 }}>🔥</div>
              <div style={{ fontSize:13, fontWeight:900, color:'#FF9E78' }}>{s.streak}-Day</div>
              <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700 }}>Streak</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:22 }}>
        <StatCard label="Average Score"   value={`${s?.avgScore||0}%`}              color="#7C5CFC" icon="📊" progress={s?.avgScore||0} />
        <StatCard label="Total Points"    value={(s?.points||0).toLocaleString()}   color="#FFD600" icon="⭐" sub={`${data?.totalQuizzes||0} quizzes done`} />
        <StatCard label="Day Streak"      value={`${s?.streak||0} 🔥`}             color="#FF6B35" icon="📅" />
        <StatCard label="Quizzes Done"    value={data?.totalQuizzes||0}             color="#00E5C3" icon="🧩" progress={Math.min((data?.totalQuizzes||0)*5,100)} />
      </div>

      {/* AI Insight */}
      {weak.length > 0 && (
        <InsightBox actionLabel="→ Get my personalized study plan" onAction={handleGenPlan} color="violet">
          VidyaAI detected that you need extra practice on{' '}
          <strong>{weak.slice(0,2).map(t=>t.topic).join(' and ')}</strong>.
          {genLoading ? ' Generating your plan…' : ' Click below for your AI-powered 5-day plan!'}
        </InsightBox>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Subject performance */}
        <Card>
          <CardTitle action="Take Quiz →" onAction={()=>navigate('/student/quiz')}>📈 Subject Performance</CardTitle>
          {SUBJECTS.map(sub => {
            const res = history.filter(q => q.subject === sub.name);
            const avg = res.length ? Math.round(res.reduce((a,b)=>a+b.score,0)/res.length) : 0;
            return <SubjectBar key={sub.name} icon={sub.icon} name={sub.name} sub={res.length ? `${res.length} attempt${res.length>1?'s':''}` : 'No attempts yet'} score={avg} color={sub.color} />;
          })}
        </Card>

        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Weak areas */}
          <Card style={{ flex:1 }}>
            <CardTitle>⚠️ Needs Practice</CardTitle>
            {weak.length === 0
              ? <p style={{ fontSize:13, color:'var(--text3)', fontWeight:600 }}>Keep taking quizzes to identify weak areas!</p>
              : weak.map((t,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border2)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:800 }}>{t.topic}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>{t.subject}</div>
                  </div>
                  <ScorePill score={t.score} />
                </div>
              ))}
          </Card>

          {/* Strong areas */}
          <Card style={{ flex:1 }}>
            <CardTitle>⭐ Strong Areas</CardTitle>
            {strong.length === 0
              ? <p style={{ fontSize:13, color:'var(--text3)', fontWeight:600 }}>Score 80%+ to unlock strong areas!</p>
              : strong.map((t,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border2)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:800 }}>{t.topic}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>{t.subject}</div>
                  </div>
                  <ScorePill score={t.score} />
                </div>
              ))}
          </Card>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Quiz history */}
        <Card>
          <CardTitle action="New Quiz →" onAction={()=>navigate('/student/quiz')}>🕐 Recent Quizzes</CardTitle>
          {history.length === 0 ? (
            <div style={{ textAlign:'center', padding:'28px 0' }}>
              <div style={{ fontSize:42, marginBottom:10, animation:'anim-float 3s ease-in-out infinite' }}>🧩</div>
              <p style={{ fontSize:13, color:'var(--text2)', fontWeight:600, marginBottom:16 }}>No quizzes yet!<br/>Start your first adaptive quiz.</p>
              <Btn onClick={()=>navigate('/student/quiz')}>Take a Quiz</Btn>
            </div>
          ) : history.slice(0,8).map((q,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:'1px solid var(--border2)' }}>
              <span style={{ fontSize:18 }}>{q.subject==='Mathematics'?'➗':q.subject==='Science'?'🔬':q.subject==='English'?'📖':'🗺️'}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:800 }}>{q.topic}</div>
                <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>{q.subject} · {q.date}</div>
              </div>
              <ScorePill score={q.score} />
            </div>
          ))}
        </Card>

        {/* Badges */}
        <Card>
          <CardTitle>🏅 My Badges</CardTitle>
          {badges.length === 0
            ? <p style={{ fontSize:13, color:'var(--text3)', fontWeight:600 }}>Complete quizzes to earn badges!</p>
            : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16 }}>
                {badges.map((b,i) => {
                  const meta = BADGE_META[b] || { label:b, icon:'🎖️', color:'#7C5CFC' };
                  return (
                    <div key={i} style={{
                      background:`${meta.color}18`, border:`1px solid ${meta.color}40`,
                      borderRadius:12, padding:'10px 14px', textAlign:'center', minWidth:84,
                      transition:'transform 0.2s'
                    }}
                    onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
                    onMouseLeave={e=>e.currentTarget.style.transform=''}
                    >
                      <div style={{ fontSize:26, marginBottom:4 }}>{meta.icon}</div>
                      <div style={{ fontSize:10, fontWeight:800, color:meta.color }}>{meta.label}</div>
                    </div>
                  );
                })}
              </div>
            )
          }
          <div style={{ marginTop:12, borderTop:'1px solid var(--border2)', paddingTop:16 }}>
            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>navigate('/student/quiz')} style={{ flex:1 }}>🧩 Quiz</Btn>
              <Btn onClick={handleGenPlan} variant="pink" style={{ flex:1 }} disabled={genLoading}>
                {genLoading ? '⏳…' : '🗺️ Plan'}
              </Btn>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
