const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { isMockMode } = require('../config/database');
const { mockUsers } = require('../models/mockData');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod';
const JWT_EXPIRES = '7d';

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    let user = null;

    if (isMockMode()) {
      user = mockUsers.find(u => u.email === email);
    } else {
      const { query } = require('../config/database');
      const result = await query(
        'SELECT * FROM Users WHERE email = @email AND is_active = 1',
        { email }
      );
      user = result?.recordset?.[0];
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      school: user.school,
      grade: user.grade,
      studentId: user.studentId
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school,
        grade: user.grade,
        studentId: user.studentId
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/register (Teacher registers new student)
router.post('/register', [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['student', 'teacher']),
  body('grade').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, grade, school } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    if (isMockMode()) {
      if (mockUsers.find(u => u.email === email)) {
        return res.status(409).json({ error: 'Email already registered.' });
      }
      const newUser = {
        id: `u${Date.now()}`, name, email,
        password: hashedPassword, role,
        school: school || 'Govt. School',
        grade: grade || null,
        studentId: role === 'student' ? `S${Date.now()}` : null
      };
      mockUsers.push(newUser);

      const token = jwt.sign({ ...newUser, password: undefined }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return res.status(201).json({ success: true, token, user: { ...newUser, password: undefined } });
    }

    // Real DB insert
    const { query, sql } = require('../config/database');
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await query(
      `INSERT INTO Users (id, name, email, password, role, school, grade) VALUES (@id, @name, @email, @password, @role, @school, @grade)`,
      { id, name, email, password: hashedPassword, role, school: school || '', grade: grade || null }
    );

    res.status(201).json({ success: true, message: 'Account created successfully.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// GET /api/auth/me — verify token and return user
router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
