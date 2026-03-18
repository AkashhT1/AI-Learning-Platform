import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Common/Layout';
import { Card, Btn, DiffBadge, GradeChip, Tag } from '../components/Common/UI';
import Loader from '../components/Common/Loader';
import { aiAPI, quizAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const NAV = [{ label: 'My Learning', items: [
  { icon: '🏠', label: 'Dashboard',  path: '/student'       },
  { icon: '🧩', label: 'Take Quiz',  path: '/student/quiz'  },
  { icon: '🗺️', label: 'Study Plan', path: '/student/study-plan' },
]}];

const SUBJECTS = [
  { name:'Mathematics',    icon:'➗', color:'#7C5CFC', light:'rgba(124,92,252,0.15)' },
  { name:'Science',        icon:'🔬', color:'#00E5C3', light:'rgba(0,229,195,0.15)'  },
  { name:'English',        icon:'📖', color:'#F040A0', light:'rgba(240,64,160,0.15)' },
  { name:'Social Studies', icon:'🗺️', color:'#FF6B35', light:'rgba(255,107,53,0.15)' },
];

const TOPICS = {
  Mathematics:    ['Fractions','Decimals','Algebra Basics','Geometry','Percentages','Ratio & Proportion','Integers','Number Patterns','Mensuration','Statistics'],
  Science:        ['Cell Biology','Photosynthesis','Electricity','Forces & Motion','Solar System','Chemical Reactions','Acids & Bases','Light & Optics','Ecosystems','Human Body'],
  English:        ['Grammar – Tenses','Reading Comprehension','Vocabulary & Synonyms','Essay Writing','Parts of Speech','Active & Passive Voice','Direct & Indirect Speech','Idioms & Phrases'],
  'Social Studies':['Indian History','Geography of India','Civics','Economics Basics','World History','Natural Resources','Climate','Ancient Civilizations'],
};

// Grade bands used for display only
function gradeBand(g) {
  const n = parseInt(String(g));
  if (n <= 5)  return { label:'Primary (1–5)',    color:'#39FF14' };
  if (n <= 8)  return { label:'Middle (6–8)',     color:'#7C5CFC' };
  return              { label:'Secondary (9–12)', color:'#FF4560' };
}

const DIFF_STYLES = {
  easy:   { color:'#39FF14', bg:'rgba(57,255,20,0.12)',   border:'rgba(57,255,20,0.3)',  barW:'22%',  emoji:'🟢', label:'Easy'   },
  medium: { color:'#FFD600', bg:'rgba(255,214,0,0.12)',   border:'rgba(255,214,0,0.3)',  barW:'55%',  emoji:'🟡', label:'Medium' },
  hard:   { color:'#FF4560', bg:'rgba(255,69,96,0.12)',   border:'rgba(255,69,96,0.3)',  barW:'92%',  emoji:'🔴', label:'Hard'   },
};

const SUBJ_COLOR = { Mathematics:'#7C5CFC', Science:'#00E5C3', English:'#F040A0', 'Social Studies':'#FF6B35' };
const SUBJ_ICON  = { Mathematics:'➗',       Science:'🔬',       English:'📖',       'Social Studies':'🗺️'     };

export default function QuizPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Selection state
  const [subject,    setSubject]    = useState('Mathematics');
  const [topic,      setTopic]      = useState('Fractions');
  const [difficulty, setDifficulty] = useState('medium');
  const [gradeInput, setGradeInput] = useState(parseInt(String(user?.grade||'7'))||7);

  // ── Quiz state
  const [step,         setStep]         = useState('select'); // select|loading|quiz|result
  const [questions,    setQuestions]    = useState([]);
  const [currentQ,     setCurrentQ]     = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [answered,     setAnswered]     = useState(false);
  const [results,      setResults]      = useState([]);
  const [startTime,    setStartTime]    = useState(null);
  const [questionStart,setQuestionStart]= useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [showHint,     setShowHint]     = useState(false);
  const attemptRef = useRef(0);

  // Reset topic when subject changes
  useEffect(() => { setTopic(TOPICS[subject][0]); }, [subject]);

  // ── Start quiz — fetch FRESH questions every single time
  const startQuiz = async () => {
    setStep('loading');
    attemptRef.current += 1;
    try {
      // Pass attempt number + timestamp as extra uniqueness signal
      const res = await aiAPI.generateQuestions({
        subject, topic,
        grade: String(gradeInput),
        difficulty,
        count: 5,
        attemptNumber: attemptRef.current,
        timestamp: Date.now(),
      });
      const qs = res.data.questions || [];
      if (qs.length === 0) throw new Error('No questions returned');
      setQuestions(qs);
      setCurrentQ(0);
      setSelected(null);
      setAnswered(false);
      setShowHint(false);
      setResults([]);
      setStartTime(Date.now());
      setQuestionStart(Date.now());
      setStep('quiz');
    } catch (err) {
      console.error(err);
      alert('Could not load questions. Please check the backend is running and try again.');
      setStep('select');
    }
  };

  // ── Select an answer
  const handleSelect = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const q = questions[currentQ];
    const correct = idx === q.correctAnswer;
    const timeMs  = Date.now() - (questionStart || Date.now());
    setResults(prev => [...prev, {
      questionId: q.id,
      question: q.question,
      isCorrect: correct,
      selectedIdx: idx,
      correctIdx: q.correctAnswer,
      timeSecs: Math.round(timeMs / 1000),
    }]);
  };

  // ── Next question or finish
  const handleNext = async () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(p => p + 1);
      setSelected(null);
      setAnswered(false);
      setShowHint(false);
      setQuestionStart(Date.now());
    } else {
      // Submit
      setSubmitting(true);
      const correct = results.filter(r => r.isCorrect).length + (selected === questions[currentQ].correctAnswer ? 1 : 0);
      const total   = questions.length;
      const score   = Math.round((correct / total) * 100);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      try {
        await quizAPI.submit({ subject, topic, score, totalQuestions:total, correctAnswers:correct, timeSpent:elapsed });
      } catch { /* best-effort */ }
      setSubmitting(false);
      setStep('result');
    }
  };

  // ── Auto-adapt difficulty after result
  const computeNextDiff = () => {
    const correct = results.filter(r=>r.isCorrect).length;
    const pct = (correct / questions.length) * 100;
    if (pct >= 80) return difficulty === 'easy' ? 'medium' : 'hard';
    if (pct < 40)  return difficulty === 'hard'  ? 'medium' : 'easy';
    return difficulty;
  };

  /* ══════════════════════════════════════════════════════
     SCREEN: Loading
  ══════════════════════════════════════════════════════ */
  if (step === 'loading') return (
    <Layout navItems={NAV}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'65vh', gap:20 }}>
        <div style={{ position:'relative', width:80, height:80 }}>
          <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'4px solid rgba(124,92,252,0.2)', borderTopColor:'#7C5CFC', animation:'spin 0.8s linear infinite' }} />
          <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'4px solid rgba(240,64,160,0.15)', borderBottomColor:'#F040A0', animation:'spin 1.2s linear infinite reverse' }} />
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🧩</div>
        </div>
        <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>Generating Questions…</h3>
        <p style={{ fontSize:13, color:'var(--text2)', fontWeight:600, textAlign:'center' }}>
          🤖 Azure OpenAI is crafting <strong style={{color:'var(--violet-lt)'}}>{difficulty.toUpperCase()}</strong> questions
          on <strong style={{color:SUBJ_COLOR[subject]}}>{topic}</strong> for Grade <strong style={{color:'#FFD600'}}>{gradeInput}</strong>
        </p>
        <p style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>Every attempt gets brand new, unique questions</p>
      </div>
    </Layout>
  );

  /* ══════════════════════════════════════════════════════
     SCREEN: Result
  ══════════════════════════════════════════════════════ */
  if (step === 'result') {
    const correct = results.filter(r=>r.isCorrect).length;
    const pct     = Math.round((correct / questions.length) * 100);
    const nextD   = computeNextDiff();
    const great   = pct >= 80;
    const ok      = pct >= 50;
    const avgTime = results.length ? Math.round(results.reduce((a,b)=>a+b.timeSecs,0)/results.length) : 0;

    return (
      <Layout navItems={NAV}>
        <div style={{ maxWidth:620, margin:'40px auto', animation:'fadeUp 0.4s ease both' }}>
          {/* Hero */}
          <div style={{
            background: great ? 'linear-gradient(135deg,rgba(57,255,20,0.1),rgba(0,229,195,0.1))' : ok ? 'linear-gradient(135deg,rgba(255,214,0,0.1),rgba(124,92,252,0.1))' : 'linear-gradient(135deg,rgba(255,69,96,0.1),rgba(255,107,53,0.1))',
            border: `1px solid ${great ? 'rgba(57,255,20,0.25)' : ok ? 'rgba(255,214,0,0.25)' : 'rgba(255,69,96,0.25)'}`,
            borderRadius:20, padding:'32px 32px 24px', textAlign:'center', marginBottom:20
          }}>
            <div style={{ fontSize:64, marginBottom:12 }}>{great?'🏆':ok?'🎉':'📚'}</div>
            <h2 style={{ fontSize:26, fontWeight:900, fontFamily:'var(--font2)', marginBottom:6 }}>
              {great?'Outstanding!':ok?'Good Effort!':'Keep Practising!'}
            </h2>
            <div style={{ fontSize:52, fontWeight:900, fontFamily:'var(--font2)', color:great?'#39FF14':ok?'#FFD600':'#FF4560', marginBottom:4 }}>
              {correct}/{questions.length}
            </div>
            <div style={{ fontSize:15, color:'var(--text2)', fontWeight:700, marginBottom:16 }}>{pct}% Score</div>

            {/* Stats row */}
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <div style={{ background:'rgba(124,92,252,0.12)', border:'1px solid rgba(124,92,252,0.2)', borderRadius:12, padding:'8px 18px' }}>
                <div style={{ fontSize:18, fontWeight:900, color:'#A98BFD' }}>{avgTime}s</div>
                <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700 }}>Avg per Q</div>
              </div>
              <div style={{ background:'rgba(0,229,195,0.12)', border:'1px solid rgba(0,229,195,0.2)', borderRadius:12, padding:'8px 18px' }}>
                <div style={{ fontSize:18, fontWeight:900, color:'#00E5C3' }}>{difficulty}</div>
                <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700 }}>Difficulty</div>
              </div>
              <div style={{ background:'rgba(255,214,0,0.12)', border:'1px solid rgba(255,214,0,0.2)', borderRadius:12, padding:'8px 18px' }}>
                <div style={{ fontSize:18, fontWeight:900, color:'#FFD600' }}>Grade {gradeInput}</div>
                <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700 }}>Level</div>
              </div>
            </div>
          </div>

          {/* Question breakdown */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:16, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text2)', marginBottom:14 }}>Question Breakdown</div>
            {questions.map((q, i) => {
              const r = results[i];
              const correct = r?.isCorrect;
              return (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 0', borderBottom: i<questions.length-1 ? '1px solid var(--border2)' : 'none' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background: correct ? 'rgba(57,255,20,0.15)' : 'rgba(255,69,96,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, fontWeight:900, color: correct ? '#39FF14' : '#FF4560' }}>
                    {correct ? '✓' : '✗'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{q.question}</div>
                    <div style={{ fontSize:11, color: correct ? '#39FF14' : '#FF8FA3', fontWeight:700 }}>
                      {correct ? '✓ Correct' : `✗ Your answer: ${q.options[r?.selectedIdx||0]} | Correct: ${q.options[q.correctAnswer]}`}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, fontWeight:600 }}>{q.explanation}</div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)', fontWeight:700, flexShrink:0 }}>{r?.timeSecs}s</div>
                </div>
              );
            })}
          </div>

          {/* AI Recommendation */}
          <div style={{ background:'rgba(124,92,252,0.08)', border:'1px solid rgba(124,92,252,0.2)', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--violet-lt)', letterSpacing:1, marginBottom:8 }}>🤖 AI RECOMMENDATION</div>
            <p style={{ fontSize:13, color:'var(--text)', fontWeight:600, lineHeight:1.6 }}>
              {great
                ? `Excellent work on ${topic}! VidyaAI is levelling up your next session to ${nextD.toUpperCase()} difficulty.`
                : ok
                ? `Good effort! Review the explanations above, then retry with ${nextD.toUpperCase()} questions.`
                : `VidyaAI suggests watching the ${topic} concept video before retrying. Try ${nextD.toUpperCase()} difficulty next.`}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <Btn onClick={()=>{ setDifficulty(nextD); setStep('select'); }} variant="primary" style={{ flex:1 }}>
              🔄 Try Again ({nextD})
            </Btn>
            <Btn onClick={()=>{ setDifficulty(nextD); startQuiz(); }} variant="cyan" style={{ flex:1 }}>
              ⚡ Instant Retry
            </Btn>
            <Btn onClick={()=>navigate('/student')} variant="outline" style={{ flex:1 }}>
              🏠 Dashboard
            </Btn>
            <Btn onClick={()=>navigate('/student/study-plan')} variant="ghost" style={{ flex:1 }}>
              🗺️ Study Plan
            </Btn>
          </div>
        </div>
      </Layout>
    );
  }

  /* ══════════════════════════════════════════════════════
     SCREEN: Select
  ══════════════════════════════════════════════════════ */
  if (step === 'select') {
    const gb = gradeBand(gradeInput);
    return (
      <Layout navItems={NAV}>
        <div style={{ marginBottom:28 }} className="anim-up">
          <h1 style={{ fontSize:28, fontWeight:900, fontFamily:'var(--font2)' }}>
            <span style={{ background:'linear-gradient(90deg,#7C5CFC,#F040A0)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Adaptive</span> Quiz 🧩
          </h1>
          <p style={{ color:'var(--text2)', fontSize:14, marginTop:4, fontWeight:600 }}>
            Every attempt gets <strong style={{color:'var(--cyan-lt)'}}>brand-new AI questions</strong> — unique to your class level and difficulty
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:760 }}>
          {/* Subject picker */}
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>📚 Subject</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {SUBJECTS.map(sub => (
                <div key={sub.name} onClick={()=>setSubject(sub.name)} style={{
                  padding:'14px 12px', borderRadius:14, cursor:'pointer', textAlign:'center',
                  border: `2px solid ${subject===sub.name ? sub.color : 'var(--border2)'}`,
                  background: subject===sub.name ? `${sub.color}18` : 'var(--card)',
                  transition:'all 0.2s', boxShadow: subject===sub.name ? `0 4px 20px ${sub.color}30` : 'none'
                }}
                onMouseEnter={e=>{ if(subject!==sub.name) e.currentTarget.style.borderColor=sub.color+'60'; }}
                onMouseLeave={e=>{ if(subject!==sub.name) e.currentTarget.style.borderColor='var(--border2)'; }}
                >
                  <div style={{ fontSize:26, marginBottom:6 }}>{sub.icon}</div>
                  <div style={{ fontSize:11, fontWeight:800, color: subject===sub.name ? sub.color : 'var(--text2)' }}>{sub.name}</div>
                </div>
              ))}
            </div>

            {/* Topic */}
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', letterSpacing:1.5, textTransform:'uppercase', margin:'16px 0 8px' }}>📌 Topic</div>
            <select value={topic} onChange={e=>setTopic(e.target.value)} style={{
              width:'100%', background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:12, padding:'11px 14px', color:'var(--text)',
              fontSize:13, fontWeight:700, outline:'none', fontFamily:'var(--font)'
            }}>
              {(TOPICS[subject]||[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Right panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Grade */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:18 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>🎓 Class / Grade</div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <input type="range" min={1} max={12} value={gradeInput} onChange={e=>setGradeInput(Number(e.target.value))}
                  style={{ flex:1, accentColor:'var(--violet)' }} />
                <div style={{ background:`${gb.color}20`, border:`1px solid ${gb.color}40`, borderRadius:10, padding:'6px 14px', textAlign:'center', minWidth:60 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:gb.color }}>{gradeInput}</div>
                </div>
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:gb.color }}>{gb.label}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:3, fontWeight:600 }}>
                Questions will be calibrated for Grade {gradeInput} NCERT curriculum
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:18 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:12 }}>⚡ Difficulty</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {['easy','medium','hard'].map(d => {
                  const ds = DIFF_STYLES[d];
                  const active = difficulty === d;
                  return (
                    <div key={d} onClick={()=>setDifficulty(d)} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:12, cursor:'pointer',
                      border: `1.5px solid ${active ? ds.color : 'var(--border2)'}`,
                      background: active ? ds.bg : 'transparent',
                      transition:'all 0.2s'
                    }}>
                      <span style={{ fontSize:18 }}>{ds.emoji}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:800, color: active ? ds.color : 'var(--text2)' }}>{ds.label}</div>
                        <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600 }}>
                          {d==='easy'?'Basic recall, single-step':d==='medium'?'Apply concepts, 2-step reasoning':'Analysis, multi-step, word problems'}
                        </div>
                      </div>
                      {active && <span style={{ color:ds.color, fontSize:14, fontWeight:900 }}>●</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info box */}
            <div style={{ background:'rgba(0,212,255,0.07)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:12, padding:'12px 16px' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#7AE8FF', marginBottom:4 }}>🤖 Powered by Azure OpenAI</div>
              <div style={{ fontSize:12, color:'var(--text2)', fontWeight:600, lineHeight:1.5 }}>
                Every attempt generates <strong style={{color:'#7AE8FF'}}>fresh questions</strong> unique to Grade {gradeInput} {difficulty} level. No two quizzes are the same!
              </div>
            </div>

            {/* Start button */}
            <Btn onClick={startQuiz} variant="primary" size="lg" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15 }}>
              🚀 Start Quiz — {subject}
            </Btn>
          </div>
        </div>
      </Layout>
    );
  }

  /* ══════════════════════════════════════════════════════
     SCREEN: Quiz in progress
  ══════════════════════════════════════════════════════ */
  const q = questions[currentQ];
  if (!q) return <Layout navItems={NAV}><Loader /></Layout>;

  const ds = DIFF_STYLES[q.difficulty || difficulty];
  const sc = SUBJ_COLOR[subject];
  const correctSoFar = results.filter(r=>r.isCorrect).length;

  return (
    <Layout navItems={NAV}>
      {/* Progress bar */}
      <div style={{ marginBottom:22 }} className="anim-up">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>{SUBJ_ICON[subject]}</span>
            <span style={{ fontSize:16, fontWeight:900, color:sc }}>{subject}</span>
            <span style={{ fontSize:13, color:'var(--text3)', fontWeight:600 }}>›</span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text2)' }}>{topic}</span>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <DiffBadge level={q.difficulty||difficulty} />
            <GradeChip grade={gradeInput} />
            <span style={{ fontSize:13, color:'var(--text2)', fontWeight:700 }}>Q {currentQ+1}/{questions.length}</span>
          </div>
        </div>

        {/* Progress track */}
        <div style={{ display:'flex', gap:4 }}>
          {questions.map((_,i) => (
            <div key={i} style={{
              flex:1, height:5, borderRadius:3,
              background: i < results.length
                ? (results[i].isCorrect ? '#39FF14' : '#FF4560')
                : i === currentQ ? sc : 'var(--bg3)',
              transition:'background 0.4s'
            }} />
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
        {/* Question card */}
        <div>
          <div style={{
            background: 'var(--card)', border: `1px solid ${sc}40`,
            borderRadius: 18, padding: 28, marginBottom: 16,
            boxShadow: `0 0 30px ${sc}18`
          }}>
            <p style={{ fontSize:17, fontWeight:800, lineHeight:1.6, color:'var(--text)', marginBottom:24 }}>
              {q.question}
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {(q.options||[]).map((opt, i) => {
                let border = 'var(--border2)';
                let bg     = 'transparent';
                let color  = 'var(--text2)';
                let shadow = 'none';

                if (answered) {
                  if (i === q.correctAnswer) {
                    border='#39FF14'; bg='rgba(57,255,20,0.1)'; color='#39FF14'; shadow='0 0 12px rgba(57,255,20,0.25)';
                  } else if (i === selected) {
                    border='#FF4560'; bg='rgba(255,69,96,0.1)'; color='#FF4560'; shadow='0 0 12px rgba(255,69,96,0.2)';
                  } else {
                    color='var(--text3)';
                  }
                } else if (selected === i) {
                  border=sc; bg=`${sc}18`; color=sc; shadow=`0 0 14px ${sc}30`;
                }

                return (
                  <div key={i} onClick={()=>handleSelect(i)} style={{
                    padding:'13px 18px', borderRadius:13, cursor: answered?'default':'pointer',
                    border:`1.5px solid ${border}`, background:bg, color, transition:'all 0.2s',
                    display:'flex', alignItems:'center', gap:12, boxShadow:shadow,
                    transform: (!answered && selected===i) ? 'translateX(4px)' : '',
                  }}
                  onMouseEnter={e=>{ if(!answered && selected!==i) e.currentTarget.style.borderColor=sc; }}
                  onMouseLeave={e=>{ if(!answered && selected!==i) e.currentTarget.style.borderColor='var(--border2)'; }}
                  >
                    <div style={{
                      width:28, height:28, borderRadius:'50%', border:`1.5px solid ${border}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:900, flexShrink:0, color, background: answered && i===q.correctAnswer ? '#39FF1420' : 'transparent'
                    }}>
                      {answered ? (i===q.correctAnswer ? '✓' : i===selected ? '✗' : String.fromCharCode(65+i)) : String.fromCharCode(65+i)}
                    </div>
                    <span style={{ fontSize:14, fontWeight:700 }}>{opt}</span>
                    {answered && i===q.correctAnswer && (
                      <span style={{ marginLeft:'auto', fontSize:12, fontWeight:800, color:'#39FF14' }}>Correct!</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hint */}
            {!answered && q.hint && (
              <div style={{ marginTop:14 }}>
                {!showHint ? (
                  <button onClick={()=>setShowHint(true)} style={{
                    background:'rgba(255,214,0,0.1)', border:'1px solid rgba(255,214,0,0.25)', borderRadius:10,
                    padding:'6px 14px', fontSize:12, color:'#FFD600', cursor:'pointer', fontWeight:700, fontFamily:'var(--font)'
                  }}>💡 Show Hint</button>
                ) : (
                  <div style={{ background:'rgba(255,214,0,0.08)', border:'1px solid rgba(255,214,0,0.2)', borderRadius:10, padding:'10px 14px', fontSize:12.5, color:'#FFE96B', fontWeight:600 }}>
                    💡 {q.hint}
                  </div>
                )}
              </div>
            )}

            {/* Explanation after answer */}
            {answered && (
              <div style={{
                marginTop:16, padding:'14px 18px', borderRadius:12,
                background: selected===q.correctAnswer ? 'rgba(57,255,20,0.07)' : 'rgba(255,69,96,0.07)',
                border: `1px solid ${selected===q.correctAnswer ? 'rgba(57,255,20,0.25)' : 'rgba(255,69,96,0.25)'}`,
                animation:'fadeUp 0.3s ease'
              }}>
                <div style={{ fontSize:13, fontWeight:800, color: selected===q.correctAnswer ? '#39FF14' : '#FF8FA3', marginBottom:5 }}>
                  {selected===q.correctAnswer ? '🎉 Correct!' : '❌ Incorrect'}
                </div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, fontWeight:600 }}>{q.explanation}</div>
              </div>
            )}

            {answered && (
              <div style={{ marginTop:18, display:'flex', justifyContent:'flex-end' }}>
                <Btn onClick={handleNext} disabled={submitting} variant={selected===q.correctAnswer?'lime':'pink'}>
                  {submitting ? '⏳ Saving…' : currentQ < questions.length-1 ? 'Next Question →' : 'See Results 🎯'}
                </Btn>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Difficulty meter */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>⚡ Difficulty Level</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
              <span style={{ color:'var(--text2)', fontWeight:700 }}>Current</span>
              <span style={{ fontWeight:900, color:ds.color }}>{ds.label}</span>
            </div>
            <div style={{ height:8, background:'var(--bg3)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:ds.barW, background:`linear-gradient(90deg,${ds.color},${ds.color}88)`, borderRadius:4, transition:'width 0.5s ease' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--text3)', fontWeight:700, marginTop:4 }}>
              <span>EASY</span><span>MEDIUM</span><span>HARD</span>
            </div>
          </div>

          {/* Live score */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>📊 Live Score</div>
            <div style={{ fontSize:28, fontWeight:900, color:sc, fontFamily:'var(--font2)', textAlign:'center', marginBottom:4 }}>
              {results.length > 0 ? `${Math.round(correctSoFar/results.length*100)}%` : '—'}
            </div>
            <div style={{ textAlign:'center', fontSize:12, color:'var(--text3)', fontWeight:700 }}>
              {correctSoFar} / {results.length} correct
            </div>
          </div>

          {/* Q log */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>📋 Question Log</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {questions.map((_,i) => (
                <div key={i} style={{
                  width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:900,
                  background: i < results.length
                    ? (results[i].isCorrect ? 'rgba(57,255,20,0.15)' : 'rgba(255,69,96,0.15)')
                    : i === currentQ ? `${sc}20` : 'var(--bg3)',
                  color: i < results.length
                    ? (results[i].isCorrect ? '#39FF14' : '#FF4560')
                    : i === currentQ ? sc : 'var(--text3)',
                  border: i === currentQ ? `2px solid ${sc}` : '1px solid transparent'
                }}>
                  {i < results.length ? (results[i].isCorrect ? '✓' : '✗') : i+1}
                </div>
              ))}
            </div>
          </div>

          {/* Grade tag */}
          <div style={{ background:'rgba(255,214,0,0.07)', border:'1px solid rgba(255,214,0,0.18)', borderRadius:12, padding:'12px 16px' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#FFD600', marginBottom:4 }}>🎓 Grade {gradeInput} Questions</div>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, lineHeight:1.5 }}>
              Calibrated for {gradeBand(gradeInput).label} NCERT curriculum
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
