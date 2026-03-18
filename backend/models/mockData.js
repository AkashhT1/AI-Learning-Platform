// In-memory mock data for demo / development without a database
const bcrypt = require('bcryptjs');

const mockUsers = [
  { id: 'u1', name: 'Rekha Pillai', email: 'teacher@vidyaai.com', password: bcrypt.hashSync('teacher123', 10), role: 'teacher', school: 'Govt. High School Kakinada', grade: null },
  { id: 'u2', name: 'Arjun Verma', email: 'arjun@vidyaai.com', password: bcrypt.hashSync('student123', 10), role: 'student', school: 'Govt. High School Kakinada', grade: '7A', studentId: 'S001' },
  { id: 'u3', name: 'Meena Das', email: 'meena@vidyaai.com', password: bcrypt.hashSync('student123', 10), role: 'student', school: 'Govt. High School Kakinada', grade: '6C', studentId: 'S002' },
  { id: 'u4', name: 'Rahul Kumar', email: 'rahul@vidyaai.com', password: bcrypt.hashSync('student123', 10), role: 'student', school: 'Govt. High School Kakinada', grade: '7B', studentId: 'S003' },
];

const mockStudents = [
  { id: 'S001', userId: 'u2', name: 'Arjun Verma', grade: '7A', school: 'Govt. High School Kakinada', avgScore: 48, points: 320, badges: ['first_quiz'], streak: 3 },
  { id: 'S002', userId: 'u3', name: 'Meena Das', grade: '6C', school: 'Govt. High School Kakinada', avgScore: 50, points: 410, badges: ['first_quiz', 'week_streak'], streak: 5 },
  { id: 'S003', userId: 'u4', name: 'Rahul Kumar', grade: '7B', school: 'Govt. High School Kakinada', avgScore: 96, points: 980, badges: ['first_quiz', 'week_streak', 'top_performer', 'math_master'], streak: 14 },
  { id: 'S004', userId: null, name: 'Sneha Bhat', grade: '6A', school: 'Govt. High School Kakinada', avgScore: 91, points: 920, badges: ['first_quiz', 'top_performer'], streak: 10 },
  { id: 'S005', userId: null, name: 'Priya Singh', grade: '8A', school: 'Govt. High School Kakinada', avgScore: 52, points: 280, badges: ['first_quiz'], streak: 1 },
  { id: 'S006', userId: null, name: 'Divya Menon', grade: '7A', school: 'Govt. High School Kakinada', avgScore: 80, points: 840, badges: ['first_quiz', 'week_streak'], streak: 7 },
];

const mockQuizResults = [
  { id: 'qr1', studentId: 'S001', subject: 'Mathematics', topic: 'Fractions', score: 29, attempts: 4, date: '2026-03-10' },
  { id: 'qr2', studentId: 'S001', subject: 'Mathematics', topic: 'Algebra', score: 52, attempts: 2, date: '2026-03-12' },
  { id: 'qr3', studentId: 'S001', subject: 'Science', topic: 'Cell Biology', score: 55, attempts: 2, date: '2026-03-14' },
  { id: 'qr4', studentId: 'S001', subject: 'English', topic: 'Grammar', score: 51, attempts: 3, date: '2026-03-15' },
  { id: 'qr5', studentId: 'S002', subject: 'English', topic: 'Tenses', score: 38, attempts: 6, date: '2026-03-11' },
  { id: 'qr6', studentId: 'S002', subject: 'Mathematics', topic: 'Fractions', score: 55, attempts: 2, date: '2026-03-13' },
  { id: 'qr7', studentId: 'S003', subject: 'Mathematics', topic: 'Algebra', score: 95, attempts: 1, date: '2026-03-16' },
  { id: 'qr8', studentId: 'S003', subject: 'Mathematics', topic: 'Fractions', score: 98, attempts: 1, date: '2026-03-14' },
  { id: 'qr9', studentId: 'S003', subject: 'Science', topic: 'Physics', score: 97, attempts: 1, date: '2026-03-15' },
];

const mockRecommendations = {};

module.exports = { mockUsers, mockStudents, mockQuizResults, mockRecommendations };
