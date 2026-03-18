const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { isMockMode } = require('../config/database');
const { mockStudents, mockQuizResults } = require('../models/mockData');

// GET /api/students/me — get logged-in student's profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const studentId = req.user.studentId;
    if (!studentId) return res.status(403).json({ error: 'Not a student account.' });

    let student;
    if (isMockMode()) {
      student = mockStudents.find(s => s.id === studentId);
    } else {
      const { query } = require('../config/database');
      const result = await query('SELECT * FROM Students WHERE id = @id', { id: studentId });
      student = result?.recordset?.[0];
    }

    if (!student) return res.status(404).json({ error: 'Student profile not found.' });

    const quizResults = isMockMode()
      ? mockQuizResults.filter(q => q.studentId === studentId)
      : [];

    // Build subject scores
    const subjectMap = {};
    quizResults.forEach(r => {
      if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
      subjectMap[r.subject].push(r.score);
    });
    const subjectScores = Object.entries(subjectMap).map(([subject, scores]) => ({
      subject,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      attempts: scores.length
    }));

    res.json({ success: true, student: { ...student, subjectScores } });
  } catch (err) {
    console.error('Student me error:', err);
    res.status(500).json({ error: 'Failed to fetch student profile.' });
  }
});

// GET /api/students/dashboard — student's personal dashboard data
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const studentId = req.user.studentId;
    if (!studentId) return res.status(403).json({ error: 'Not a student account.' });

    let student, quizResults;
    if (isMockMode()) {
      student = mockStudents.find(s => s.id === studentId);
      quizResults = mockQuizResults.filter(q => q.studentId === studentId);
    } else {
      const { query } = require('../config/database');
      const sRes = await query('SELECT * FROM Students WHERE id = @id', { id: studentId });
      const qRes = await query('SELECT TOP 20 * FROM QuizResults WHERE student_id = @id ORDER BY date DESC', { id: studentId });
      student = sRes?.recordset?.[0];
      quizResults = qRes?.recordset || [];
    }

    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const weakTopics = quizResults
      .filter(r => r.score < 60)
      .map(r => ({ subject: r.subject, topic: r.topic, score: r.score }))
      .slice(0, 5);

    const strongTopics = quizResults
      .filter(r => r.score >= 80)
      .map(r => ({ subject: r.subject, topic: r.topic, score: r.score }))
      .slice(0, 5);

    res.json({
      success: true,
      student,
      quizHistory: quizResults.slice(0, 10),
      weakTopics,
      strongTopics,
      totalQuizzes: quizResults.length,
      avgScore: student.avgScore
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard.' });
  }
});

module.exports = router;
