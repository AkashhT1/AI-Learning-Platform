import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('vidyaai_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vidyaai_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const studentAPI = {
  me: () => api.get('/students/me'),
  dashboard: () => api.get('/students/dashboard'),
};

export const teacherAPI = {
  dashboard: () => api.get('/teacher/dashboard'),
  studentDetail: (id) => api.get(`/teacher/student/${id}`),
};

export const quizAPI = {
  submit: (data) => api.post('/quiz/submit', data),
  history: (studentId) => api.get(`/quiz/history/${studentId}`),
};

export const aiAPI = {
  generateStudyPlan: (studentId) => api.post('/ai/study-plan', { studentId }),
  generateQuestions: (data) => api.post('/ai/quiz-questions', data),
  analyze: (studentId) => api.post('/ai/analyze', { studentId }),
  getRecommendation: (studentId) => api.get(`/ai/recommendation/${studentId}`),
};

export default api;
