import React, { useEffect, useState } from 'react';
import Layout from '../components/Common/Layout';
import { Card, CardTitle, StatCard, ScorePill, SubjectBar, InsightBox, Btn, Tag, GradeChip } from '../components/Common/UI';
import Loader from '../components/Common/Loader';
import { teacherAPI, aiAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const NAV = [{ label: 'Overview', items: [
  { icon: '🏠', label: 'Dashboard', path: '/teacher' },
]}];

const SUBJ = { Mathematics:['#7C5CFC','➗'], Science:['#00E5C3','🔬'], English:['#F040A0','📖'], 'Social Studies':['#FF6B35','🗺️'] };

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [genMap,   setGenMap]   = useState({});
  const [planMap,  setPlanMap]  = useState({});

  useEffect(() => {
    teacherAPI.dashboard()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const genPlan = async (sid, e) => {
    e.stopPropagation();
    setGenMap(p=>({...p,[sid]:true}));
    try {
      const r = await aiAPI.generateStudyPlan(sid);
      setPlanMap(p=>({...p,[sid]:r.data.studyPlan}));
    } catch { alert('Failed to generate plan.'); }
    finally { setGenMap(p=>({...p,[sid]:false})); }
  };

  if (loading) return <Layout navItems={NAV}><Loader /></Layout>;
  if (!data)   return <Layout navItems={NAV}><p style={{color:'var(--text2)'}}>Failed to load.</p></Layout>;

  const { classStats, students, atRisk, weakTopics, subjectAverages } = data;
  const TABS = [
    { key:'all',    label:`All (${students.length})` },
    { key:'atrisk', label:`At Risk (${classStats.atRiskCount})` },
    { key:'good',   label:'On Track' },
    { key:'top',    label:`Top (${classStats.topPerformerCount})` },
  ];
  const filtered = tab==='all' ? students : students.filter(s=>s.status===tab);

  return (
    <Layout navItems={NAV}>
      {/* Header */}
      <div style={{ marginBottom:26 }} className="anim-up">
        <h1 style={{ fontSize:28, fontWeight:900, fontFamily:'var(--font2)' }}>
          <span style={{ background:'linear-gradient(90deg,#00D4FF,#7C5CFC)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Teacher</span> Dashboard 👩‍🏫
        </h1>
        <p style={{ color:'var(--text2)', fontSize:14, marginTop:5, fontWeight:600 }}>
          {user?.name} · {user?.school || 'Govt. School'} · Class Overview
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:22 }}>
        <StatCard label="Total Students"   value={classStats.totalStudents}      color="#00D4FF" icon="👥" progress={100} />
        <StatCard label="Class Average"    value={`${classStats.classAvg}%`}     color="#7C5CFC" icon="📊" progress={classStats.classAvg} sub="This week" />
        <StatCard label="At-Risk Students" value={classStats.atRiskCount}        color="#FF4560" icon="⚠️" sub="Need attention" />
        <StatCard label="Top Performers"   value={classStats.topPerformerCount}  color="#FFD600" icon="🏆" sub="Above 80%" />
      </div>

      {atRisk.length > 0 && (
        <InsightBox color="pink">
          <strong>{atRisk.length} student{atRisk.length>1?'s':''}</strong> are at risk and need immediate attention.{' '}
          VidyaAI has identified critical gaps in <strong>{weakTopics.slice(0,2).map(t=>t.topic).join(' and ')}</strong>.
          Consider scheduling group intervention sessions this week.
        </InsightBox>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Subject averages */}
        <Card>
          <CardTitle>📈 Subject Performance</CardTitle>
          {subjectAverages.map(sub => {
            const [c, ico] = SUBJ[sub.subject] || ['#7C5CFC','📚'];
            return <SubjectBar key={sub.subject} icon={ico} name={sub.subject} sub={`${sub.totalAttempts} attempts`} score={sub.avgScore} color={c} />;
          })}
          {subjectAverages.length===0 && <p style={{fontSize:13,color:'var(--text3)',fontWeight:600}}>No quiz data yet.</p>}
        </Card>

        {/* Top learning gaps */}
        <Card>
          <CardTitle>⚠️ Top Learning Gaps</CardTitle>
          {weakTopics.slice(0,5).map((t,i)=>{
            const [c,ico] = SUBJ[t.subject]||['#FF4560','📚'];
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border2)' }}>
                <div style={{ width:34, height:34, borderRadius:9, background:`${c}18`, border:`1px solid ${c}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{ico}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:800 }}>{t.topic}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>{t.subject} · {t.studentCount} student{t.studentCount!==1?'s':''}</div>
                </div>
                <ScorePill score={t.avgScore} />
              </div>
            );
          })}
          {weakTopics.length===0 && <p style={{fontSize:13,color:'var(--text3)',fontWeight:600}}>No significant gaps detected yet.</p>}
        </Card>
      </div>

      {/* Student table */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:12 }}>
          <span style={{ fontSize:14, fontWeight:800, color:'var(--text2)' }}>👥 Student Profiles</span>
          <div style={{ display:'flex', gap:4, background:'var(--bg3)', borderRadius:12, padding:4 }}>
            {TABS.map(t=>(
              <div key={t.key} onClick={()=>setTab(t.key)} style={{
                padding:'7px 14px', borderRadius:9, fontSize:11, fontWeight:700, cursor:'pointer',
                background: tab===t.key ? 'var(--card)' : 'transparent',
                color: tab===t.key ? 'var(--text)' : 'var(--text3)',
                transition:'all 0.2s', boxShadow: tab===t.key ? '0 1px 6px rgba(0,0,0,0.3)' : 'none'
              }}>{t.label}</div>
            ))}
          </div>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Student','Class','Avg Score','Status','Points','Actions'].map(h=>(
                  <th key={h} style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1.2, padding:'8px 12px', textAlign:'left', borderBottom:'1px solid var(--border2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s=>{
                const isExpanded = expanded === s.id;
                const statusColors = { top:['#39FF14','rgba(57,255,20,0.12)'], good:['#7C5CFC','rgba(124,92,252,0.12)'], atrisk:['#FF4560','rgba(255,69,96,0.12)'] };
                const [sc, sbg] = statusColors[s.status]||statusColors.good;
                return (
                  <React.Fragment key={s.id}>
                    <tr onClick={()=>setExpanded(isExpanded?null:s.id)} style={{ cursor:'pointer' }}
                      onMouseEnter={e=>{ Array.from(e.currentTarget.cells).forEach(c=>c.style.background='rgba(124,92,252,0.04)'); }}
                      onMouseLeave={e=>{ Array.from(e.currentTarget.cells).forEach(c=>c.style.background=''); }}
                    >
                      <td style={{ padding:'12px', borderBottom:'1px solid var(--border2)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:`linear-gradient(135deg,#7C5CFC,#F040A0)`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:12, color:'#0D0B1F', flexShrink:0 }}>
                            {s.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                          </div>
                          <span style={{ fontSize:13, fontWeight:800 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px', borderBottom:'1px solid var(--border2)' }}>
                        <GradeChip grade={s.grade} />
                      </td>
                      <td style={{ padding:'12px', borderBottom:'1px solid var(--border2)' }}>
                        <ScorePill score={s.avgScore||0} />
                      </td>
                      <td style={{ padding:'12px', borderBottom:'1px solid var(--border2)' }}>
                        <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:20, background:sbg, color:sc }}>
                          {s.status==='top'?'🏆 Top':s.status==='atrisk'?'⚠️ At Risk':'✓ On Track'}
                        </span>
                      </td>
                      <td style={{ padding:'12px', borderBottom:'1px solid var(--border2)', fontSize:13, fontWeight:900, color:'#FFD600' }}>
                        {(s.points||0).toLocaleString()} ⭐
                      </td>
                      <td style={{ padding:'12px', borderBottom:'1px solid var(--border2)' }}>
                        <Btn onClick={e=>genPlan(s.id,e)} variant={genMap[s.id]?'ghost':'primary'} size="sm" disabled={genMap[s.id]}>
                          {genMap[s.id]?'⏳…':'🤖 Gen Plan'}
                        </Btn>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding:'0 12px 16px', background:'rgba(124,92,252,0.03)' }}>
                          <div style={{ background:'var(--bg2)', borderRadius:12, padding:18, marginTop:6, border:'1px solid var(--border2)' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                              <strong style={{ fontSize:14, fontWeight:800 }}>{s.name} — Full Profile</strong>
                              <div style={{ display:'flex', gap:8 }}>
                                <span style={{ fontSize:12, fontWeight:700, color:'#FFD600' }}>⭐ {(s.points||0).toLocaleString()} pts</span>
                                <span style={{ fontSize:12, fontWeight:700, color:'#FF6B35' }}>🔥 {s.streak||0} day streak</span>
                              </div>
                            </div>

                            {/* Badges */}
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                              {(s.badges||[]).map(b=>(
                                <span key={b} style={{ fontSize:10, fontWeight:800, padding:'3px 10px', background:'rgba(124,92,252,0.15)', color:'#A98BFD', borderRadius:20 }}>
                                  {b.replace(/_/g,' ')}
                                </span>
                              ))}
                            </div>

                            {/* Generated plan */}
                            {planMap[s.id] && (
                              <div style={{ background:'rgba(0,229,195,0.06)', border:'1px solid rgba(0,229,195,0.18)', borderRadius:10, padding:14, marginTop:6 }}>
                                <div style={{ fontSize:11, fontWeight:800, color:'#00E5C3', marginBottom:8 }}>🤖 AI-GENERATED STUDY PLAN</div>
                                <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}><strong>Goal:</strong> {planMap[s.id].weeklyGoal}</div>
                                <div style={{ fontSize:12, color:'var(--text2)', fontWeight:600, marginBottom:8 }}>{planMap[s.id].summary}</div>
                                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                  {(planMap[s.id].days||[]).map(d=>(
                                    <span key={d.day} style={{ fontSize:11, padding:'3px 9px', background:'var(--bg3)', borderRadius:8, color:'var(--text2)', fontWeight:700 }}>
                                      Day {d.day}: {d.focus}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filtered.length===0 && <p style={{textAlign:'center',padding:'24px 0',fontSize:13,color:'var(--text3)',fontWeight:600}}>No students in this category.</p>}
        </div>
      </Card>
    </Layout>
  );
}
