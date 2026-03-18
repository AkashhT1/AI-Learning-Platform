-- ============================================
-- VidyaAI Database Schema for Azure SQL
-- Run this script in Azure SQL Query Editor
-- ============================================

-- Users table (for authentication)
CREATE TABLE Users (
    id            NVARCHAR(50)  PRIMARY KEY,
    name          NVARCHAR(100) NOT NULL,
    email         NVARCHAR(100) NOT NULL UNIQUE,
    password      NVARCHAR(255) NOT NULL,
    role          NVARCHAR(20)  NOT NULL CHECK (role IN ('student','teacher','admin')),
    school        NVARCHAR(200),
    grade         NVARCHAR(10),
    is_active     BIT           DEFAULT 1,
    created_at    DATETIME      DEFAULT GETDATE()
);

-- Students table (extended profile)
CREATE TABLE Students (
    id            NVARCHAR(50)  PRIMARY KEY,
    user_id       NVARCHAR(50)  REFERENCES Users(id),
    name          NVARCHAR(100) NOT NULL,
    grade         NVARCHAR(10)  NOT NULL,
    school        NVARCHAR(200),
    avg_score     FLOAT         DEFAULT 0,
    points        INT           DEFAULT 0,
    streak        INT           DEFAULT 0,
    badges        NVARCHAR(500) DEFAULT '[]',
    created_at    DATETIME      DEFAULT GETDATE()
);

-- Quiz Results
CREATE TABLE QuizResults (
    id              NVARCHAR(50)  PRIMARY KEY,
    student_id      NVARCHAR(50)  REFERENCES Students(id),
    subject         NVARCHAR(100) NOT NULL,
    topic           NVARCHAR(100) NOT NULL,
    score           INT           NOT NULL CHECK (score BETWEEN 0 AND 100),
    total_questions INT           DEFAULT 5,
    correct_answers INT           DEFAULT 0,
    time_spent      INT,           -- seconds
    difficulty      NVARCHAR(20)  DEFAULT 'medium',
    date            DATETIME      DEFAULT GETDATE()
);

-- AI Recommendations (cached study plans)
CREATE TABLE Recommendations (
    id           NVARCHAR(50)  PRIMARY KEY,
    student_id   NVARCHAR(50)  REFERENCES Students(id),
    ai_plan      NVARCHAR(MAX) NOT NULL,  -- JSON
    created_at   DATETIME      DEFAULT GETDATE()
);

-- Learning Modules
CREATE TABLE Modules (
    id          NVARCHAR(50)  PRIMARY KEY,
    subject     NVARCHAR(100) NOT NULL,
    topic       NVARCHAR(100) NOT NULL,
    title       NVARCHAR(200) NOT NULL,
    description NVARCHAR(500),
    grade       NVARCHAR(10),
    difficulty  NVARCHAR(20),
    content_url NVARCHAR(500),
    duration    INT            -- minutes
);

-- Student Module Progress
CREATE TABLE ModuleProgress (
    id           NVARCHAR(50) PRIMARY KEY,
    student_id   NVARCHAR(50) REFERENCES Students(id),
    module_id    NVARCHAR(50) REFERENCES Modules(id),
    status       NVARCHAR(20) DEFAULT 'not_started',  -- not_started, in_progress, completed
    progress_pct INT          DEFAULT 0,
    completed_at DATETIME
);

-- ── Indexes for performance
CREATE INDEX IX_QuizResults_StudentId ON QuizResults(student_id);
CREATE INDEX IX_QuizResults_Date ON QuizResults(date DESC);
CREATE INDEX IX_Recommendations_StudentId ON Recommendations(student_id);
CREATE INDEX IX_ModuleProgress_StudentId ON ModuleProgress(student_id);

-- ── Sample data
INSERT INTO Users (id, name, email, password, role, school, grade) VALUES
('u1', 'Rekha Pillai', 'teacher@vidyaai.com', '$2a$10$example_hash', 'teacher', 'Govt. High School Kakinada', NULL),
('u2', 'Arjun Verma',  'arjun@vidyaai.com',   '$2a$10$example_hash', 'student', 'Govt. High School Kakinada', '7A'),
('u3', 'Rahul Kumar',  'rahul@vidyaai.com',   '$2a$10$example_hash', 'student', 'Govt. High School Kakinada', '7B');

INSERT INTO Students (id, user_id, name, grade, school, avg_score, points) VALUES
('S001', 'u2', 'Arjun Verma', '7A', 'Govt. High School Kakinada', 48, 320),
('S003', 'u3', 'Rahul Kumar', '7B', 'Govt. High School Kakinada', 96, 980);

INSERT INTO QuizResults (id, student_id, subject, topic, score, date) VALUES
('qr1', 'S001', 'Mathematics', 'Fractions', 29, '2026-03-10'),
('qr2', 'S001', 'Mathematics', 'Algebra',   52, '2026-03-12'),
('qr3', 'S003', 'Mathematics', 'Algebra',   95, '2026-03-16'),
('qr4', 'S003', 'Mathematics', 'Fractions', 98, '2026-03-14');
