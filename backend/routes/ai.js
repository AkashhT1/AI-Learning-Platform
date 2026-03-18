const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateStudyPlan, generateQuizQuestions, analyzePerformance } = require('../services/openaiService');
const { isMockMode } = require('../config/database');
const { mockStudents, mockQuizResults, mockRecommendations } = require('../models/mockData');

// POST /api/ai/study-plan — generate personalized study plan
router.post('/study-plan', authenticate, async (req, res) => {
  try {
    const { studentId } = req.body;
    const targetId = studentId || req.user.studentId;

    if (!targetId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    // Get student data
    let student, quizResults;
    if (isMockMode()) {
      student = mockStudents.find(s => s.id === targetId);
      quizResults = mockQuizResults.filter(q => q.studentId === targetId);
    } else {
      const { query } = require('../config/database');
      const sRes = await query('SELECT * FROM Students WHERE id = @id', { id: targetId });
      const qRes = await query('SELECT * FROM QuizResults WHERE student_id = @id ORDER BY date DESC', { id: targetId });
      student = sRes?.recordset?.[0];
      quizResults = qRes?.recordset || [];
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Build scores object from quiz results
    const scores = {};
    const subjectScores = {};
    quizResults.forEach(r => {
      if (!subjectScores[r.subject]) subjectScores[r.subject] = [];
      subjectScores[r.subject].push(r.score);
    });
    Object.entries(subjectScores).forEach(([subject, scoreArr]) => {
      scores[subject] = Math.round(scoreArr.reduce((a, b) => a + b, 0) / scoreArr.length);
    });

    const weakTopics = quizResults
      .filter(r => r.score < 60)
      .sort((a, b) => a.score - b.score)
      .map(r => r.topic);

    const studyPlan = await generateStudyPlan({
      name: student.name,
      grade: student.grade,
      scores: Object.keys(scores).length ? scores : { Mathematics: 50, Science: 60, English: 55 },
      weakTopics: [...new Set(weakTopics)].slice(0, 3)
    });

    // Cache recommendation
    if (isMockMode()) {
      mockRecommendations[targetId] = { studentId: targetId, plan: studyPlan, createdAt: new Date().toISOString() };
    } else {
      const { query } = require('../config/database');
      const { v4: uuidv4 } = require('uuid');
      await query(
        'INSERT INTO Recommendations (id, student_id, ai_plan, created_at) VALUES (@id, @studentId, @plan, GETDATE())',
        { id: uuidv4(), studentId: targetId, plan: JSON.stringify(studyPlan) }
      );
    }

    res.json({ success: true, studentId: targetId, studyPlan });
  } catch (err) {
    console.error('Study plan error:', err);
    res.status(500).json({ error: 'Failed to generate study plan' });
  }
});

// POST /api/ai/quiz-questions — generate adaptive quiz questions
router.post('/quiz-questions', authenticate, async (req, res) => {
  try {
    const { topic, subject, grade, difficulty, count } = req.body;

    if (!topic || !subject) {
      return res.status(400).json({ error: 'topic and subject are required' });
    }

    // Use the student's actual grade from their profile, falling back to request body
    const studentGrade = grade || req.user.grade || '7';

    const result = await generateQuizQuestions(
      topic,
      subject,
      studentGrade,
      difficulty || 'medium',
      count || 5
    );

    res.json({ success: true, ...result, meta: { topic, subject, grade: studentGrade, difficulty: difficulty || 'medium' } });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: 'Failed to generate quiz questions' });
  }
});

// POST /api/ai/analyze — analyze student performance
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { studentId } = req.body;
    const targetId = studentId || req.user.studentId;

    let student, quizResults;
    if (isMockMode()) {
      student = mockStudents.find(s => s.id === targetId);
      quizResults = mockQuizResults.filter(q => q.studentId === targetId);
    } else {
      const { query } = require('../config/database');
      const sRes = await query('SELECT * FROM Students WHERE id = @id', { id: targetId });
      const qRes = await query('SELECT * FROM QuizResults WHERE student_id = @id', { id: targetId });
      student = sRes?.recordset?.[0];
      quizResults = qRes?.recordset || [];
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const analysis = await analyzePerformance(student.name, quizResults);
    res.json({ success: true, studentId: targetId, analysis });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze performance' });
  }
});

// GET /api/ai/recommendation/:studentId — get cached recommendation
router.get('/recommendation/:studentId', authenticate, async (req, res) => {
  const { studentId } = req.params;
  try {
    if (isMockMode()) {
      const rec = mockRecommendations[studentId];
      if (!rec) return res.status(404).json({ error: 'No recommendation found. Generate one first.' });
      return res.json({ success: true, ...rec });
    }

    const { query } = require('../config/database');
    const result = await query(
      'SELECT TOP 1 * FROM Recommendations WHERE student_id = @id ORDER BY created_at DESC',
      { id: studentId }
    );
    const rec = result?.recordset?.[0];
    if (!rec) return res.status(404).json({ error: 'No recommendation found.' });
    res.json({ success: true, studentId, plan: JSON.parse(rec.ai_plan), createdAt: rec.created_at });
  } catch (err) {
    console.error('Recommendation fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch recommendation' });
  }
});

module.exports = router;
