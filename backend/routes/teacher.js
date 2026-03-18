const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { isMockMode } = require('../config/database');
const { mockStudents, mockQuizResults } = require('../models/mockData');

// GET /api/teacher/dashboard — full class analytics
router.get('/dashboard', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    let students, quizResults;

    if (isMockMode()) {
      students = mockStudents;
      quizResults = mockQuizResults;
    } else {
      const { query } = require('../config/database');
      const sRes = await query('SELECT * FROM Students ORDER BY avg_score DESC');
      const qRes = await query('SELECT * FROM QuizResults ORDER BY date DESC');
      students = sRes?.recordset || [];
      quizResults = qRes?.recordset || [];
    }

    const classAvg = students.length
      ? Math.round(students.reduce((a, s) => a + (s.avgScore || 0), 0) / students.length)
      : 0;

    const atRisk = students.filter(s => (s.avgScore || 0) < 55);
    const topPerformers = students.filter(s => (s.avgScore || 0) >= 80);

    // Subject averages from quiz results
    const subjectMap = {};
    quizResults.forEach(r => {
      if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
      subjectMap[r.subject].push(r.score);
    });
    const subjectAverages = Object.entries(subjectMap).map(([subject, scores]) => ({
      subject,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      totalAttempts: scores.length
    }));

    // Weak topics across class
    const topicMap = {};
    quizResults.forEach(r => {
      const key = `${r.subject}::${r.topic}`;
      if (!topicMap[key]) topicMap[key] = { subject: r.subject, topic: r.topic, scores: [], students: new Set() };
      topicMap[key].scores.push(r.score);
      topicMap[key].students.add(r.studentId);
    });
    const weakTopics = Object.values(topicMap)
      .map(t => ({ ...t, avgScore: Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length), studentCount: t.students.size }))
      .filter(t => t.avgScore < 65)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 8)
      .map(({ scores, students, ...rest }) => rest);

    res.json({
      success: true,
      classStats: { totalStudents: students.length, classAvg, atRiskCount: atRisk.length, topPerformerCount: topPerformers.length },
      students: students.map(s => ({ ...s, status: s.avgScore >= 80 ? 'top' : s.avgScore >= 55 ? 'good' : 'atrisk' })),
      atRisk,
      topPerformers,
      subjectAverages,
      weakTopics,
      recentActivity: quizResults.slice(0, 20)
    });
  } catch (err) {
    console.error('Teacher dashboard error:', err);
    res.status(500).json({ error: 'Failed to load teacher dashboard.' });
  }
});

// GET /api/teacher/student/:studentId — detailed student report
router.get('/student/:studentId', authenticate, requireRole('teacher'), async (req, res) => {
  const { studentId } = req.params;
  try {
    let student, quizResults;
    if (isMockMode()) {
      student = mockStudents.find(s => s.id === studentId);
      quizResults = mockQuizResults.filter(q => q.studentId === studentId);
    } else {
      const { query } = require('../config/database');
      const sRes = await query('SELECT * FROM Students WHERE id = @id', { id: studentId });
      const qRes = await query('SELECT * FROM QuizResults WHERE student_id = @id ORDER BY date DESC', { id: studentId });
      student = sRes?.recordset?.[0];
      quizResults = qRes?.recordset || [];
    }

    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const { mockRecommendations } = require('../models/mockData');
    const recommendation = mockRecommendations[studentId] || null;

    res.json({ success: true, student, quizResults, recommendation });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student details.' });
  }
});

module.exports = router;
