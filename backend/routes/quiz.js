const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isMockMode } = require('../config/database');
const { mockStudents, mockQuizResults } = require('../models/mockData');

// GET /api/quiz/questions/:subject/:topic — get questions for a quiz
router.get('/questions/:subject/:topic', authenticate, async (req, res) => {
  const { subject, topic } = req.params;
  const { difficulty = 'medium' } = req.query;
  // Delegate to AI route for dynamic generation
  res.redirect(307, `/api/ai/quiz-questions`);
});

// POST /api/quiz/submit — submit quiz results and update student data
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { subject, topic, score, totalQuestions, correctAnswers, timeSpent } = req.body;
    const studentId = req.user.studentId;

    if (!studentId) {
      return res.status(403).json({ error: 'Only students can submit quizzes.' });
    }

    const result = {
      id: `qr${Date.now()}`,
      studentId,
      subject,
      topic,
      score: Math.round(score),
      totalQuestions,
      correctAnswers,
      timeSpent,
      date: new Date().toISOString().split('T')[0]
    };

    if (isMockMode()) {
      mockQuizResults.push(result);
      // Update student avg score
      const student = mockStudents.find(s => s.id === studentId);
      if (student) {
        const allScores = mockQuizResults.filter(q => q.studentId === studentId).map(q => q.score);
        student.avgScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
        // Award points
        const pts = Math.round(score / 10) * 5;
        student.points = (student.points || 0) + pts;
        // Award badges
        if (score >= 90 && !student.badges.includes('top_performer')) student.badges.push('top_performer');
        if (mockQuizResults.filter(q => q.studentId === studentId).length >= 5 && !student.badges.includes('quiz_master')) {
          student.badges.push('quiz_master');
        }
      }
    } else {
      const { query } = require('../config/database');
      const { v4: uuidv4 } = require('uuid');
      await query(
        `INSERT INTO QuizResults (id, student_id, subject, topic, score, total_questions, correct_answers, time_spent, date)
         VALUES (@id, @studentId, @subject, @topic, @score, @totalQ, @correct, @time, GETDATE())`,
        { id: uuidv4(), studentId, subject, topic, score: result.score, totalQ: totalQuestions, correct: correctAnswers, time: timeSpent }
      );

      // Update student avg
      await query(
        `UPDATE Students SET avg_score = (SELECT AVG(CAST(score AS FLOAT)) FROM QuizResults WHERE student_id = @studentId) WHERE id = @studentId`,
        { studentId }
      );
    }

    // Determine next adaptive difficulty
    const nextDifficulty = score >= 80 ? 'hard' : score >= 55 ? 'medium' : 'easy';
    const pointsEarned = Math.round(score / 10) * 5;

    res.json({
      success: true,
      result,
      pointsEarned,
      nextDifficulty,
      message: score >= 80
        ? '🌟 Excellent! Moving to harder questions.'
        : score >= 55
        ? '✓ Good effort! Keep practising.'
        : '📚 Keep going! Review the explanations and try again.'
    });
  } catch (err) {
    console.error('Quiz submit error:', err);
    res.status(500).json({ error: 'Failed to submit quiz results.' });
  }
});

// GET /api/quiz/history/:studentId — get quiz history
router.get('/history/:studentId', authenticate, async (req, res) => {
  const { studentId } = req.params;
  try {
    let results;
    if (isMockMode()) {
      results = mockQuizResults.filter(q => q.studentId === studentId);
    } else {
      const { query } = require('../config/database');
      const res2 = await query(
        'SELECT * FROM QuizResults WHERE student_id = @id ORDER BY date DESC',
        { id: studentId }
      );
      results = res2?.recordset || [];
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz history.' });
  }
});

module.exports = router;
