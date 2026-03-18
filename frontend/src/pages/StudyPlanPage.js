import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Common/Layout';
import { Card, Btn, InsightBox } from '../components/Common/UI';
import Loader from '../components/Common/Loader';
import { aiAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const NAV = [{ label: 'My Learning', items: [
  { icon: '🏠', label: 'Dashboard',  path: '/student'            },
  { icon: '🧩', label: 'Take Quiz',  path: '/student/quiz'       },
  { icon: '🗺️', label: 'Study Plan', path: '/student/study-plan' },
]}];

// One vivid color per day
const DAY_PALETTE = [
  { main: '#8B5CF6', light: 'rgba(139,92,246,0.14)', text: '#A78BFA' },  // Day 1 — violet
  { main: '#F97316', light: 'rgba(249,115,22,0.14)',  text: '#FB923C' },  // Day 2 — coral
  { main: '#06B6D4', light: 'rgba(6,182,212,0.14)',   text: '#22D3EE' },  // Day 3 — cyan
  { main: '#EC4899', light: 'rgba(236,72,153,0.14)',  text: '#F472B6' },  // Day 4 — pink
  { main: '#84CC16', light: 'rgba(132,204,22,0.14)',  text: '#A3E635' },  // Day 5 — lime
];

function dayColor(i) { return DAY_PALETTE[i % DAY_PALETTE.length]; }

export default function StudyPlanPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [plan,      setPlan]       = useState(null);
  const [loading,   setLoading]    = useState(true);
  const [generating,setGenerating] = useState(false);
  const [activeDay, setActiveDay]  = useState(0);

  useEffect(() => {
    aiAPI.getRecommendation(user.studentId)
      .then(res => setPlan(res.data.plan))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, [user.studentId]);

  const genPlan = async () => {
    setGenerating(true);
    try {
      const r = await aiAPI.generateStudyPlan(user.studentId);
      setPlan(r.data.studyPlan);
      setActiveDay(0);
    } catch { alert('Failed to generate plan. Please try again.'); }
    finally { setGenerating(false); }
  };

  if (loading) return <Layout navItems={NAV}><Loader /></Layout>;

  /* ── EMPTY STATE ───────────────────────────────────────────────────────── */
  if (!plan) return (
    <Layout navItems={NAV}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, fontFamily: "'Baloo 2',cursive" }}>🗺️ My Study Plan</h1>
        <p style={{ color: '#A0A8CC', fontSize: 14, marginTop: 4 }}>AI-generated personalized learning path</p>
      </div>

      <Card style={{ maxWidth: 500, margin: '50px auto', textAlign: 'center', padding: 44 }}>
        <div style={{ fontSize: 58, marginBottom: 16 }}>🗺️</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10, fontFamily: "'Baloo 2',cursive" }}>No Study Plan Yet</h2>
        <p style={{ color: '#A0A8CC', fontSize: 14, marginBottom: 28, lineHeight: 1.65 }}>
          Take a few quizzes first, then VidyaAI will generate a personalized
          5-day study plan targeting your weak areas.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn onClick={genPlan} disabled={generating}>
            {generating ? '⏳ Generating…' : '🤖 Generate My Plan'}
          </Btn>
          <Btn variant="outline" onClick={() => navigate('/student/quiz')}>
            🧩 Take a Quiz First
          </Btn>
        </div>
      </Card>
    </Layout>
  );

  /* ── PLAN VIEW ─────────────────────────────────────────────────────────── */
  const days = plan.days || [];
  const cd   = days[activeDay];
  const dc   = dayColor(activeDay);

  return (
    <Layout navItems={NAV}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, fontFamily: "'Baloo 2',cursive" }}>🗺️ My Study Plan</h1>
          <p style={{ color: '#A0A8CC', fontSize: 14, marginTop: 4 }}>Personalized by Azure OpenAI · 5-Day Plan</p>
        </div>
        <Btn onClick={genPlan} disabled={generating} variant="outline">
          {generating ? '⏳ Regenerating…' : '🔄 Regenerate Plan'}
        </Btn>
      </div>

      {/* AI summary insight */}
      <InsightBox>
        <strong>🎯 Weekly Goal:</strong> {plan.weeklyGoal || 'Complete all 5 days and take the mastery quiz.'}<br />
        <span style={{ color: '#A0A8CC', fontSize: 13 }}>{plan.summary}</span>
      </InsightBox>

      {/* Progress strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {days.map((day, i) => {
          const c = dayColor(i);
          const active = activeDay === i;
          return (
            <div
              key={i}
              onClick={() => setActiveDay(i)}
              style={{
                flex: 1, padding: '10px 6px', textAlign: 'center', borderRadius: 12,
                cursor: 'pointer', transition: 'all 0.2s',
                background: active ? c.light : '#181B33',
                border: `1.5px solid ${active ? c.main : 'rgba(139,92,246,0.10)'}`,
                boxShadow: active ? `0 4px 14px ${c.main}28` : 'none',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>
                {['📖','✏️','🧮','🔬','🏆'][i] || '📚'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: active ? c.main : '#545880' }}>
                Day {day.day}
              </div>
              <div style={{ fontSize: 10, color: active ? c.text : '#545880', marginTop: 2 }}>
                {day.focus?.split(' ').slice(0, 2).join(' ')}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 20 }}>
        {/* Active day detail */}
        {cd && (
          <div key={activeDay} style={{ animation: 'fadeInUp 0.3s ease' }}>
            <div style={{
              background: '#181B33',
              border: `1.5px solid ${dc.main}44`,
              borderRadius: 16, padding: 26, marginBottom: 16,
              boxShadow: `0 0 30px ${dc.main}18`,
            }}>
              {/* Day header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: dc.light, color: dc.main }}>
                      Day {cd.day}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', color: '#FCD34D' }}>
                      ⏱ {cd.duration}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'rgba(6,182,212,0.15)', color: '#22D3EE' }}>
                      {cd.subject}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Baloo 2',cursive", color: '#F0F0FF' }}>
                    {cd.focus}
                  </h2>
                </div>
                <Btn onClick={() => navigate('/student/quiz')} variant="primary">
                  🧩 Practice Now
                </Btn>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Activities */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#545880', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
                    📋 Activities
                  </div>
                  {(cd.activities || []).map((act, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13.5, color: '#F0F0FF', fontWeight: 500, lineHeight: 1.5, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        background: dc.light, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 10, fontWeight: 900, color: dc.main
                      }}>
                        {i + 1}
                      </div>
                      {act}
                    </div>
                  ))}
                </div>

                {/* Resources */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#545880', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
                    📚 Resources
                  </div>
                  {(cd.resources || []).map((res, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#A0A8CC', fontWeight: 600, marginBottom: 9, display: 'flex', gap: 8, lineHeight: 1.4 }}>
                      <span style={{ color: dc.main, flexShrink: 0 }}>▸</span> {res}
                    </div>
                  ))}
                  <div style={{
                    marginTop: 14, background: dc.light,
                    border: `1px solid ${dc.main}30`,
                    borderRadius: 12, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: dc.main, fontFamily: "'Baloo 2',cursive" }}>
                      {cd.practiceQuestions}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: dc.text }}>practice questions</div>
                      <div style={{ fontSize: 10, color: '#545880' }}>assigned for today</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Day navigation */}
            <div style={{ display: 'flex', gap: 10 }}>
              {activeDay > 0 && (
                <Btn variant="outline" onClick={() => setActiveDay(activeDay - 1)}>← Previous Day</Btn>
              )}
              {activeDay < days.length - 1 && (
                <Btn onClick={() => setActiveDay(activeDay + 1)}>
                  Next Day →
                </Btn>
              )}
              {activeDay === days.length - 1 && (
                <Btn variant="success" onClick={() => navigate('/student/quiz')}>
                  🏆 Take Mastery Quiz
                </Btn>
              )}
            </div>
          </div>
        )}

        {/* Right panel — Progress + Tips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Overall progress */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#545880', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>
              📈 Plan Progress
            </div>
            {days.map((day, i) => {
              const c = dayColor(i);
              return (
                <div
                  key={i}
                  onClick={() => setActiveDay(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', cursor: 'pointer',
                    borderBottom: i < days.length - 1 ? '1px solid rgba(139,92,246,0.08)' : 'none'
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: activeDay >= i ? c.light : '#1C2040',
                    border: `1.5px solid ${activeDay >= i ? c.main : 'rgba(139,92,246,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 900, color: activeDay >= i ? c.main : '#545880',
                    ...(activeDay === i && { boxShadow: `0 0 8px ${c.main}55`, animation: 'glow 2s infinite' })
                  }}>
                    {activeDay > i ? '✓' : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: activeDay >= i ? '#F0F0FF' : '#545880' }}>
                      Day {day.day}: {day.focus}
                    </div>
                    <div style={{ fontSize: 10, color: '#545880', marginTop: 1 }}>
                      {day.duration} · {day.subject}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Encouragement */}
          {plan.encouragement && (
            <div style={{
              background: 'linear-gradient(135deg,rgba(132,204,22,0.12),rgba(6,182,212,0.08))',
              border: '1px solid rgba(132,204,22,0.25)',
              borderRadius: 14, padding: 16
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#84CC16', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
                💬 AI Message For You
              </div>
              <p style={{ fontSize: 13.5, color: '#A3E635', fontWeight: 600, lineHeight: 1.6 }}>
                {plan.encouragement}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tips section */}
      {plan.tips?.length > 0 && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#A0A8CC', marginBottom: 16 }}>💡 AI Study Tips</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            {plan.tips.map((tip, i) => {
              const c = dayColor(i);
              return (
                <div key={i} style={{
                  background: c.light, border: `1px solid ${c.main}30`,
                  borderRadius: 12, padding: '12px 14px',
                  display: 'flex', gap: 10, alignItems: 'flex-start'
                }}>
                  <span style={{ color: c.main, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>▸</span>
                  <span style={{ fontSize: 13, color: '#F0F0FF', fontWeight: 500, lineHeight: 1.55 }}>{tip}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </Layout>
  );
}
