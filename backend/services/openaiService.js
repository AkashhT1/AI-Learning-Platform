const { AzureOpenAI } = require('openai');

let client = null;

// Track recently used question ids per session key to avoid repeats
const recentQuestions = {};

function getClient() {
  if (client) return client;
  if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    return null;
  }
  client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    endpoint: process.env.AZURE_OPENAI_ENDPOINT
  });
  return client;
}

// Parse grade number from strings like "7A", "8B", "6", 7
function parseGradeNum(grade) {
  const n = parseInt(String(grade).replace(/\D/g, ''));
  return isNaN(n) ? 7 : Math.max(1, Math.min(12, n));
}

/**
 * Generate a personalized study plan for a student
 * @param {Object} studentData - { name, grade, scores: {subject: score}, weakTopics: [] }
 */
async function generateStudyPlan(studentData) {
  const aiClient = getClient();
  if (!aiClient) return getMockStudyPlan(studentData);

  const { name, grade, scores, weakTopics } = studentData;

  const scoresText = Object.entries(scores)
    .map(([subject, score]) => `${subject}: ${score}%`)
    .join('\n');

  const weakText = weakTopics.length > 0
    ? weakTopics.join(', ')
    : 'General review needed';

  const prompt = `You are VidyaAI, an expert AI tutor for Indian government school students.

Student Profile:
- Name: ${name}
- Grade: ${grade}
- School Type: Government School

Recent Performance:
${scoresText}

Identified Weak Areas: ${weakText}

Create a detailed, practical 5-day personalized study plan. Format your response as JSON with this exact structure:
{
  "summary": "One sentence summary of student's situation",
  "weeklyGoal": "What the student should achieve this week",
  "days": [
    {
      "day": 1,
      "focus": "Topic name",
      "subject": "Subject",
      "duration": "30 mins",
      "activities": ["Activity 1", "Activity 2"],
      "practiceQuestions": 5,
      "resources": ["Resource 1"]
    }
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"],
  "encouragement": "Motivational message for the student"
}

Keep language simple and encouraging. Focus on foundational gaps first.`;

  try {
    const response = await aiClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are VidyaAI, a helpful AI tutor for Indian government school students. Always respond with valid JSON only, no markdown.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (err) {
    console.error('Azure OpenAI error:', err.message);
    return getMockStudyPlan(studentData);
  }
}

/**
 * Generate adaptive quiz questions — unique every attempt, grade-aware, difficulty-differentiated
 * Uses a random seed phrase so Azure OpenAI generates completely fresh questions each call
 */
async function generateQuizQuestions(topic, subject, grade, difficulty = 'medium', count = 5) {
  const aiClient = getClient();
  const gradeNum = parseGradeNum(grade);

  if (!aiClient) return getMockQuizQuestions(topic, subject, difficulty, gradeNum);

  // Difficulty descriptions for the prompt
  const diffDesc = {
    easy: `Basic recall and identification. Single-step. Use simple language suitable for a Grade ${gradeNum} beginner.`,
    medium: `Application and understanding. Two-step reasoning. Use standard Grade ${gradeNum} NCERT terminology.`,
    hard: `Analysis, evaluation, multi-step problems. Challenge a top Grade ${gradeNum} student. May include data interpretation or word problems.`
  };

  // Grade band context
  let gradeBand = gradeNum <= 5 ? 'Primary (Grade 1–5)' : gradeNum <= 8 ? 'Middle School (Grade 6–8)' : 'Secondary (Grade 9–12)';

  // Random seed to guarantee different questions every call
  const seed = Math.random().toString(36).slice(2, 10);

  const prompt = `You are an expert Indian school teacher creating a quiz. Generate EXACTLY ${count} unique multiple-choice questions.

PARAMETERS:
- Subject: ${subject}
- Topic: ${topic}
- Grade: ${gradeNum} (${gradeBand}, NCERT Indian curriculum)
- Difficulty: ${difficulty.toUpperCase()} — ${diffDesc[difficulty]}
- Session seed (for uniqueness): ${seed}

DIFFICULTY RULES:
- EASY: Single fact/definition questions. Options are clearly distinct. Only one obviously correct answer.
- MEDIUM: Requires applying a concept or formula. Distractors are plausible.
- HARD: Multi-step reasoning, word problems, or conceptual traps. Distractors are very plausible.

GRADE RULES:
- Grade 1–5: Very simple language, real-life examples, no jargon
- Grade 6–8: Standard NCERT language, moderate complexity
- Grade 9–12: Technical vocabulary, advanced problem solving

IMPORTANT: Generate FRESH questions different from any common textbook examples. Use the seed to vary your output.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correctAnswer": 0,
      "explanation": "Clear explanation of why A is correct and why others are wrong",
      "hint": "A helpful hint without giving the answer away",
      "difficulty": "${difficulty}",
      "grade": ${gradeNum}
    }
  ]
}`;

  try {
    const response = await aiClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a highly skilled Indian school question paper setter following NCERT curriculum. Always return valid JSON only, no markdown, no explanation outside JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2500,
      temperature: 1.0,      // max creativity = unique every time
      top_p: 0.95,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    // Ensure each question has the right metadata
    parsed.questions = (parsed.questions || []).map((q, i) => ({
      ...q,
      id: i + 1,
      difficulty,
      grade: gradeNum
    }));
    return parsed;
  } catch (err) {
    console.error('Azure OpenAI error:', err.message);
    return getMockQuizQuestions(topic, subject, difficulty, gradeNum);
  }
}

/**
 * Analyze quiz performance and identify gaps
 */
async function analyzePerformance(studentName, quizResults) {
  const aiClient = getClient();
  if (!aiClient) return getMockAnalysis(studentName, quizResults);

  const resultsText = quizResults
    .map(r => `${r.subject} - ${r.topic}: ${r.score}% (${r.attempts} attempts)`)
    .join('\n');

  const prompt = `Analyze this student's performance and identify learning gaps:

Student: ${studentName}
Quiz Results:
${resultsText}

Respond with JSON:
{
  "overallLevel": "struggling|developing|proficient|advanced",
  "strengthAreas": ["subject/topic"],
  "weakAreas": [{"topic": "topic", "subject": "subject", "severity": "critical|moderate|minor", "suggestion": "what to do"}],
  "learningStyle": "visual|auditory|reading|kinesthetic",
  "nextSteps": ["action 1", "action 2"],
  "teacherNote": "Note for the teacher about this student"
}`;

  try {
    const response = await aiClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an educational analyst. Return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('Azure OpenAI error:', err.message);
    return getMockAnalysis(studentName, quizResults);
  }
}

// ── Mock fallbacks (used when Azure OpenAI is not configured) ──────────────

function getMockStudyPlan(studentData) {
  const { name, weakTopics } = studentData;
  return {
    summary: `${name} needs focused practice on foundational concepts before advancing.`,
    weeklyGoal: `Master ${weakTopics[0] || 'core topics'} and improve overall score by 15%.`,
    days: [
      { day: 1, focus: weakTopics[0] || 'Fractions', subject: 'Mathematics', duration: '30 mins', activities: ['Watch explanation video', 'Solve 5 example problems'], practiceQuestions: 10, resources: ['NCERT Chapter 7', 'VidyaAI Visual Module'] },
      { day: 2, focus: 'Practice & Review', subject: 'Mathematics', duration: '25 mins', activities: ['Attempt adaptive quiz', 'Review wrong answers'], practiceQuestions: 15, resources: ['VidyaAI Quiz Bank'] },
      { day: 3, focus: weakTopics[1] || 'Algebra Basics', subject: 'Mathematics', duration: '35 mins', activities: ['Read concept notes', 'Solve word problems'], practiceQuestions: 10, resources: ['NCERT Chapter 11'] },
      { day: 4, focus: 'Mixed Practice', subject: 'Mathematics', duration: '30 mins', activities: ['Mixed topic quiz', 'Peer discussion'], practiceQuestions: 20, resources: ['VidyaAI Practice Set'] },
      { day: 5, focus: 'Revision & Assessment', subject: 'Mathematics', duration: '40 mins', activities: ['Full topic revision', 'Mastery test'], practiceQuestions: 25, resources: ['VidyaAI Mastery Quiz'] }
    ],
    tips: ['Practice a little every day rather than cramming', 'Draw diagrams to visualize math problems', 'Ask your teacher if you are stuck'],
    encouragement: `Keep going ${name}! Every expert was once a beginner. You can do this! 🌟`
  };
}

// ── MOCK QUESTION BANKS ───────────────────────────────────────────────────
// Large pools per subject × difficulty × grade-band so every attempt feels fresh

const MOCK_BANKS = {
  Mathematics: {
    easy: {
      low: [ // Grade 1–5
        { question: 'What is 12 + 15?', options: ['A) 25', 'B) 27', 'C) 28', 'D) 30'], correctAnswer: 1, explanation: '12 + 15 = 27', hint: 'Count up from 12' },
        { question: 'How many sides does a triangle have?', options: ['A) 2', 'B) 3', 'C) 4', 'D) 5'], correctAnswer: 1, explanation: 'A triangle has 3 sides', hint: 'Tri means three' },
        { question: 'What is 5 × 4?', options: ['A) 9', 'B) 16', 'C) 20', 'D) 25'], correctAnswer: 2, explanation: '5 × 4 = 20', hint: 'Count 5 four times' },
        { question: 'What is half of 18?', options: ['A) 8', 'B) 9', 'C) 10', 'D) 12'], correctAnswer: 1, explanation: '18 ÷ 2 = 9', hint: 'Divide by 2' },
        { question: 'Which number is smallest: 45, 54, 9, 99?', options: ['A) 45', 'B) 54', 'C) 9', 'D) 99'], correctAnswer: 2, explanation: '9 is the smallest', hint: 'Compare the tens digit first' },
        { question: 'What is 100 − 37?', options: ['A) 63', 'B) 73', 'C) 57', 'D) 67'], correctAnswer: 0, explanation: '100 − 37 = 63', hint: 'Borrow from the hundreds' },
        { question: '3/6 simplified is:', options: ['A) 1/3', 'B) 2/3', 'C) 1/2', 'D) 3/4'], correctAnswer: 2, explanation: '3/6 = 1/2 (divide both by 3)', hint: 'Find the common factor' },
      ],
      mid: [ // Grade 6–8
        { question: 'What is ½ + ¼?', options: ['A) ¾', 'B) 1', 'C) ½', 'D) ²⁄₃'], correctAnswer: 0, explanation: 'Common denominator 4: 2/4 + 1/4 = 3/4', hint: 'Make denominators the same' },
        { question: 'What is 15% of 200?', options: ['A) 20', 'B) 25', 'C) 30', 'D) 35'], correctAnswer: 2, explanation: '15/100 × 200 = 30', hint: 'Divide by 100 then multiply' },
        { question: 'The perimeter of a square with side 9cm is:', options: ['A) 18cm', 'B) 36cm', 'C) 27cm', 'D) 81cm'], correctAnswer: 1, explanation: '4 × 9 = 36cm', hint: 'A square has 4 equal sides' },
        { question: 'What is the LCM of 4 and 6?', options: ['A) 10', 'B) 12', 'C) 18', 'D) 24'], correctAnswer: 1, explanation: 'LCM(4,6) = 12. Multiples: 4,8,12 and 6,12', hint: 'List multiples of each' },
        { question: 'Simplify: ⁶⁄₈', options: ['A) ¾', 'B) ²⁄₃', 'C) ½', 'D) ⁵⁄₆'], correctAnswer: 0, explanation: '6/8 = 3/4 (divide both by 2)', hint: 'Find the HCF of 6 and 8' },
        { question: 'What is 0.75 as a fraction?', options: ['A) 3/5', 'B) 7/10', 'C) 3/4', 'D) 7/8'], correctAnswer: 2, explanation: '0.75 = 75/100 = 3/4', hint: '75 hundredths' },
        { question: 'Area of a rectangle 8cm × 5cm is:', options: ['A) 13cm²', 'B) 26cm²', 'C) 40cm²', 'D) 35cm²'], correctAnswer: 2, explanation: 'Area = length × breadth = 8 × 5 = 40cm²', hint: 'Multiply the two dimensions' },
      ],
      high: [ // Grade 9–12
        { question: 'The value of sin 30° is:', options: ['A) √3/2', 'B) 1/2', 'C) 1/√2', 'D) 1'], correctAnswer: 1, explanation: 'sin 30° = 1/2 (standard value)', hint: 'Use the standard trigonometric table' },
        { question: 'The slope of a line parallel to y = 3x + 2 is:', options: ['A) 2', 'B) 1/3', 'C) -3', 'D) 3'], correctAnswer: 3, explanation: 'Parallel lines have the same slope. Slope = 3', hint: 'Compare y = mx + c form' },
        { question: 'What is the HCF of 36 and 48?', options: ['A) 6', 'B) 12', 'C) 18', 'D) 24'], correctAnswer: 1, explanation: 'Factors of 36: 1,2,3,4,6,9,12,18,36. Factors of 48: 1,2,3,4,6,8,12,16,24,48. HCF = 12', hint: 'List all factors of each' },
      ]
    },
    medium: {
      low: [
        { question: 'A box has 24 apples. If ⅓ are removed, how many remain?', options: ['A) 8', 'B) 16', 'C) 12', 'D) 18'], correctAnswer: 1, explanation: '⅓ of 24 = 8. 24 − 8 = 16 remain', hint: 'First find ⅓ of 24' },
        { question: 'Round 347 to the nearest hundred:', options: ['A) 300', 'B) 350', 'C) 400', 'D) 340'], correctAnswer: 0, explanation: '347 is closer to 300 than 400', hint: 'Look at the tens digit' },
        { question: 'A clock shows 3:45. How many minutes to 4:00?', options: ['A) 10', 'B) 15', 'C) 20', 'D) 25'], correctAnswer: 1, explanation: '4:00 − 3:45 = 15 minutes', hint: 'Count from 3:45 to 4:00' },
        { question: 'What is 25% of 80?', options: ['A) 15', 'B) 20', 'C) 25', 'D) 30'], correctAnswer: 1, explanation: '25/100 × 80 = 20', hint: '25% = 1/4' },
      ],
      mid: [
        { question: 'If 3x + 7 = 22, find x:', options: ['A) 3', 'B) 5', 'C) 7', 'D) 4'], correctAnswer: 1, explanation: '3x = 15, x = 5', hint: 'Isolate x by subtracting 7 first' },
        { question: 'A train travels 60 km/h for 2.5 hrs. Distance covered:', options: ['A) 120km', 'B) 150km', 'C) 180km', 'D) 135km'], correctAnswer: 1, explanation: 'D = S × T = 60 × 2.5 = 150km', hint: 'Distance = Speed × Time' },
        { question: 'Find the median of: 5, 3, 8, 1, 7', options: ['A) 3', 'B) 5', 'C) 7', 'D) 8'], correctAnswer: 1, explanation: 'Sorted: 1,3,5,7,8. Middle value = 5', hint: 'Sort first, then find the middle' },
        { question: 'A shopkeeper buys at ₹80, sells at ₹100. Profit %:', options: ['A) 20%', 'B) 25%', 'C) 15%', 'D) 30%'], correctAnswer: 1, explanation: 'Profit = 20. Profit% = 20/80 × 100 = 25%', hint: 'Profit% = Profit/CP × 100' },
        { question: 'What is the value of 2³ × 2²?', options: ['A) 16', 'B) 32', 'C) 64', 'D) 25'], correctAnswer: 1, explanation: '2³ × 2² = 2^(3+2) = 2⁵ = 32', hint: 'When bases are same, add exponents' },
        { question: 'Angles of a triangle are in ratio 1:2:3. Largest angle:', options: ['A) 60°', 'B) 90°', 'C) 120°', 'D) 30°'], correctAnswer: 1, explanation: 'Sum = 180°. Parts = 30°,60°,90°. Largest = 90°', hint: 'Total parts = 1+2+3 = 6' },
      ],
      high: [
        { question: 'If log₁₀ 1000 = x, find x:', options: ['A) 2', 'B) 3', 'C) 4', 'D) 100'], correctAnswer: 1, explanation: '10³ = 1000, so log₁₀ 1000 = 3', hint: 'How many times must 10 be multiplied?' },
        { question: 'Roots of x² − 5x + 6 = 0 are:', options: ['A) 2,3', 'B) 1,6', 'C) -2,-3', 'D) 2,-3'], correctAnswer: 0, explanation: '(x−2)(x−3) = 0, so x = 2 or x = 3', hint: 'Find two numbers that multiply to 6 and add to 5' },
        { question: 'The distance between (0,0) and (3,4) is:', options: ['A) 7', 'B) 5', 'C) 6', 'D) 12'], correctAnswer: 1, explanation: 'd = √(3² + 4²) = √(9+16) = √25 = 5', hint: 'Use the distance formula' },
      ]
    },
    hard: {
      low: [
        { question: 'A number is doubled then 8 is added giving 24. The number is:', options: ['A) 6', 'B) 8', 'C) 10', 'D) 12'], correctAnswer: 1, explanation: '2x + 8 = 24 → 2x = 16 → x = 8', hint: 'Write an equation: 2n + 8 = 24' },
        { question: 'Meena has ₹50. She spends ⅖ on pencils. How much is left?', options: ['A) ₹20', 'B) ₹30', 'C) ₹25', 'D) ₹35'], correctAnswer: 1, explanation: '⅖ × 50 = 20 spent. 50 − 20 = ₹30 left', hint: 'First find ⅖ of 50' },
      ],
      mid: [
        { question: 'The sum of 3 consecutive even numbers is 78. The largest is:', options: ['A) 24', 'B) 26', 'C) 28', 'D) 30'], correctAnswer: 2, explanation: 'Let n-2, n, n+2. Sum = 3n = 78, n = 26. Largest = 28', hint: 'Let middle number = n, others = n−2, n+2' },
        { question: 'A cistern fills in 12 hrs and drains in 18 hrs. Time to fill when both open:', options: ['A) 24 hrs', 'B) 36 hrs', 'C) 30 hrs', 'D) 15 hrs'], correctAnswer: 1, explanation: 'Net rate = 1/12 − 1/18 = 1/36. Time = 36 hrs', hint: 'Net rate = filling rate − draining rate' },
        { question: 'If the ratio of boys to girls is 3:5 and total students = 40, how many boys?', options: ['A) 12', 'B) 15', 'C) 18', 'D) 20'], correctAnswer: 1, explanation: 'Boys = 3/(3+5) × 40 = 3/8 × 40 = 15', hint: 'Boys = 3 parts out of 8 total parts' },
        { question: 'Simple interest on ₹1200 at 5% p.a. for 3 years:', options: ['A) ₹160', 'B) ₹180', 'C) ₹200', 'D) ₹220'], correctAnswer: 1, explanation: 'SI = P×R×T/100 = 1200×5×3/100 = ₹180', hint: 'SI = PRT/100' },
        { question: 'In an AP: 2, 5, 8... the 10th term is:', options: ['A) 27', 'B) 29', 'C) 31', 'D) 33'], correctAnswer: 1, explanation: 'a=2, d=3. T₁₀ = 2 + 9×3 = 2 + 27 = 29', hint: 'Tₙ = a + (n−1)d' },
      ],
      high: [
        { question: 'The probability of getting a prime number when a die is rolled:', options: ['A) 1/3', 'B) 1/2', 'C) 2/3', 'D) 5/6'], correctAnswer: 1, explanation: 'Primes on a die: 2,3,5 → 3 outcomes. P = 3/6 = 1/2', hint: 'List all prime numbers from 1–6' },
        { question: 'If tan θ = 3/4, find sin θ (in a right triangle):', options: ['A) 3/5', 'B) 4/5', 'C) 3/4', 'D) 4/3'], correctAnswer: 0, explanation: 'Hyp = √(9+16)=5. sin θ = 3/5', hint: 'Draw the right triangle using tan = opp/adj' },
        { question: 'How many ways can 4 books be arranged on a shelf?', options: ['A) 4', 'B) 12', 'C) 16', 'D) 24'], correctAnswer: 3, explanation: '4! = 4×3×2×1 = 24', hint: 'Use permutation: n! for arranging n items' },
      ]
    }
  },
  Science: {
    easy: {
      low: [
        { question: 'Plants make their own food using:', options: ['A) Minerals', 'B) Sunlight', 'C) Photosynthesis', 'D) Water only'], correctAnswer: 2, explanation: 'Photosynthesis is the process by which plants make food using sunlight, water, and CO₂', hint: 'Think about what happens in leaves' },
        { question: 'Which organ pumps blood in our body?', options: ['A) Lungs', 'B) Kidney', 'C) Heart', 'D) Brain'], correctAnswer: 2, explanation: 'The heart pumps blood to all parts of the body', hint: 'It beats continuously' },
        { question: 'Water boils at:', options: ['A) 50°C', 'B) 75°C', 'C) 100°C', 'D) 120°C'], correctAnswer: 2, explanation: 'Water boils at 100°C at standard atmospheric pressure', hint: 'Standard boiling point' },
        { question: 'Which gas do plants absorb during photosynthesis?', options: ['A) Oxygen', 'B) Nitrogen', 'C) Carbon Dioxide', 'D) Hydrogen'], correctAnswer: 2, explanation: 'Plants absorb CO₂ and release O₂ during photosynthesis', hint: 'The gas we exhale' },
        { question: 'A magnet has ___ poles:', options: ['A) One', 'B) Two', 'C) Three', 'D) Four'], correctAnswer: 1, explanation: 'Every magnet has a North and South pole', hint: 'North and South...' },
        { question: 'The loudness of sound is measured in:', options: ['A) Hertz', 'B) Decibels', 'C) Metres', 'D) Watts'], correctAnswer: 1, explanation: 'Sound loudness is measured in decibels (dB)', hint: 'dB is the unit' },
      ],
      mid: [
        { question: 'The "powerhouse of the cell" is:', options: ['A) Nucleus', 'B) Mitochondria', 'C) Ribosome', 'D) Vacuole'], correctAnswer: 1, explanation: 'Mitochondria produces ATP through cellular respiration', hint: 'Power = energy production' },
        { question: 'Newton\'s first law is also called:', options: ['A) Law of Gravity', 'B) Law of Inertia', 'C) Law of Acceleration', 'D) Law of Action-Reaction'], correctAnswer: 1, explanation: 'Objects remain at rest or in motion unless acted upon — this is inertia', hint: 'Inertia = tendency to resist change' },
        { question: 'Formula of water is:', options: ['A) CO₂', 'B) H₂O₂', 'C) H₂O', 'D) HO'], correctAnswer: 2, explanation: 'Water = 2 Hydrogen + 1 Oxygen = H₂O', hint: 'H for hydrogen, O for oxygen' },
        { question: 'The closest planet to the Sun is:', options: ['A) Venus', 'B) Earth', 'C) Mars', 'D) Mercury'], correctAnswer: 3, explanation: 'Mercury is the innermost planet of our solar system', hint: 'Think of the smallest, innermost planet' },
      ],
      high: [
        { question: 'An atom is electrically neutral because:', options: ['A) No electrons', 'B) Equal protons and electrons', 'C) No neutrons', 'D) All particles are equal'], correctAnswer: 1, explanation: 'Equal number of protons(+) and electrons(−) cancel out', hint: 'Positive and negative charges balance' },
        { question: 'Ohm\'s law states V = IR. If V = 12V and R = 4Ω, I equals:', options: ['A) 2A', 'B) 3A', 'C) 4A', 'D) 48A'], correctAnswer: 1, explanation: 'I = V/R = 12/4 = 3A', hint: 'Rearrange V = IR to find I' },
      ]
    },
    medium: {
      low: [
        { question: 'During photosynthesis, plants release which gas?', options: ['A) Carbon dioxide', 'B) Nitrogen', 'C) Oxygen', 'D) Hydrogen'], correctAnswer: 2, explanation: 'Plants take in CO₂ and water, and release oxygen as a byproduct', hint: 'The gas we breathe in' },
        { question: 'What happens to light when it passes from air to water?', options: ['A) Reflects', 'B) Stops', 'C) Bends (refracts)', 'D) Splits into colors'], correctAnswer: 2, explanation: 'Light bends (refracts) when passing from one medium to another', hint: 'Think of a straw in a glass of water' },
      ],
      mid: [
        { question: 'Rusting of iron is an example of:', options: ['A) Physical change', 'B) Chemical change', 'C) Reversible change', 'D) Phase change'], correctAnswer: 1, explanation: 'Rusting is a chemical change — iron reacts with oxygen and moisture', hint: 'Can you turn rust back to iron easily?' },
        { question: 'If current doubles in a circuit, resistance stays constant. Power:', options: ['A) Doubles', 'B) Halves', 'C) Quadruples', 'D) Stays same'], correctAnswer: 2, explanation: 'P = I²R. If I doubles, P = (2I)²R = 4I²R — quadruples', hint: 'Power = I²R' },
        { question: 'The pH of a neutral solution is:', options: ['A) 0', 'B) 7', 'C) 14', 'D) 5'], correctAnswer: 1, explanation: 'pH 7 is neutral. Below 7 = acidic, above 7 = basic', hint: 'The middle of the pH scale' },
        { question: 'Convex lens creates which type of image when object is beyond 2F:', options: ['A) Virtual, erect', 'B) Real, inverted, diminished', 'C) Real, erect', 'D) Virtual, magnified'], correctAnswer: 1, explanation: 'Object beyond 2F: image is real, inverted, and diminished', hint: 'Object far away from lens = smaller image' },
      ],
      high: [
        { question: 'In a nuclear reaction, mass defect is converted to energy by:', options: ['A) E=mc', 'B) E=mc²', 'C) E=mv²', 'D) E=½mv²'], correctAnswer: 1, explanation: 'Einstein\'s E=mc² describes mass-energy equivalence', hint: 'Einstein\'s famous equation' },
        { question: 'A gene is a segment of:', options: ['A) Protein', 'B) RNA', 'C) DNA', 'D) Chromosome'], correctAnswer: 2, explanation: 'A gene is a specific sequence of DNA that codes for a protein', hint: 'The fundamental unit of heredity is made of...' },
      ]
    },
    hard: {
      low: [
        { question: 'A plant kept in a dark room will eventually:', options: ['A) Grow faster', 'B) Turn yellow (etiolation)', 'C) Die immediately', 'D) Stay green'], correctAnswer: 1, explanation: 'Without light, chlorophyll breaks down causing etiolation (yellowing)', hint: 'Plants need light for chlorophyll production' },
      ],
      mid: [
        { question: 'Two resistors 6Ω and 3Ω in parallel. Equivalent resistance:', options: ['A) 9Ω', 'B) 3Ω', 'C) 2Ω', 'D) 18Ω'], correctAnswer: 2, explanation: '1/R = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2. R = 2Ω', hint: '1/Rₚ = 1/R₁ + 1/R₂' },
        { question: 'If a ball is thrown upward at 20 m/s, time to reach max height (g=10):', options: ['A) 1s', 'B) 2s', 'C) 4s', 'D) 20s'], correctAnswer: 1, explanation: 'v = u − gt. At max height v=0. t = u/g = 20/10 = 2s', hint: 'At max height, velocity = 0' },
        { question: 'Which type of bond holds the two DNA strands together?', options: ['A) Ionic bonds', 'B) Covalent bonds', 'C) Hydrogen bonds', 'D) Metallic bonds'], correctAnswer: 2, explanation: 'The two DNA strands are held by hydrogen bonds between complementary base pairs', hint: 'Weak bonds that allow easy separation during replication' },
        { question: 'Enthalpy change in exothermic reaction is:', options: ['A) Positive', 'B) Zero', 'C) Negative', 'D) Undefined'], correctAnswer: 2, explanation: 'Exothermic reactions release energy, so ΔH < 0 (negative)', hint: 'Energy is released, so products have less energy than reactants' },
      ],
      high: [
        { question: 'In photoelectric effect, increasing light intensity:', options: ['A) Increases photon energy', 'B) Increases kinetic energy of electrons', 'C) Increases number of emitted electrons', 'D) Increases threshold frequency'], correctAnswer: 2, explanation: 'Intensity = number of photons. More photons = more electrons emitted, but same KE per electron', hint: 'Intensity affects the number, not the energy of photons' },
        { question: 'Mendel\'s Law of Independent Assortment applies when genes are:', options: ['A) On same chromosome', 'B) On different chromosomes', 'C) Dominant only', 'D) Recessive only'], correctAnswer: 1, explanation: 'Genes on different chromosomes assort independently during gamete formation', hint: 'Think about which chromosomes separate independently' },
      ]
    }
  },
  English: {
    easy: {
      low: [
        { question: 'Which is a noun in "The cat sat on the mat"?', options: ['A) sat', 'B) on', 'C) the', 'D) cat'], correctAnswer: 3, explanation: '"cat" is a noun — it names a thing', hint: 'A noun is a name of a person, place, or thing' },
        { question: '"She ___ to school every day." (Simple Present)', options: ['A) go', 'B) goes', 'C) went', 'D) going'], correctAnswer: 1, explanation: 'With she/he/it, add -s: "goes"', hint: 'Third person singular needs -s' },
        { question: 'Opposite of "hot" is:', options: ['A) warm', 'B) cool', 'C) cold', 'D) mild'], correctAnswer: 2, explanation: '"cold" is the opposite/antonym of "hot"', hint: 'Think of the most extreme opposite' },
        { question: 'Which is a proper noun?', options: ['A) city', 'B) river', 'C) Ganga', 'D) mountain'], correctAnswer: 2, explanation: '"Ganga" is a proper noun — it names a specific river', hint: 'Proper nouns are always capitalized' },
        { question: 'The plural of "child" is:', options: ['A) childs', 'B) childes', 'C) children', 'D) childrens'], correctAnswer: 2, explanation: 'The irregular plural of child is children', hint: 'Irregular plural — not just adding -s' },
      ],
      mid: [
        { question: '"They ___ playing cricket." Which tense?', options: ['A) Simple present', 'B) Present continuous', 'C) Past perfect', 'D) Future tense'], correctAnswer: 1, explanation: 'is/are + verb+ing = Present Continuous tense', hint: 'The -ing form gives a clue' },
        { question: 'Find the adverb: "She runs quickly."', options: ['A) She', 'B) runs', 'C) quickly', 'D) and'], correctAnswer: 2, explanation: '"quickly" modifies the verb "runs" — it is an adverb', hint: 'Adverbs often end in -ly' },
        { question: 'Which sentence uses the correct form? "I ___ the answer."', options: ['A) knowed', 'B) know', 'C) knowing', 'D) knews'], correctAnswer: 1, explanation: '"know" is the correct simple present form for I/we/you/they', hint: 'Simple present for first person' },
        { question: 'An autobiography is written by:', options: ['A) Someone else about a person', 'B) The person about themselves', 'C) A fictional character', 'D) A journalist'], correctAnswer: 1, explanation: 'Auto = self. Autobiography = book written by the person themselves', hint: '"Auto" means self' },
      ],
      high: [
        { question: '"To kick the bucket" means:', options: ['A) To play football', 'B) To die', 'C) To clean up', 'D) To travel'], correctAnswer: 1, explanation: '"To kick the bucket" is an idiom meaning to die', hint: 'This is an idiom, not literal meaning' },
        { question: 'A paragraph\'s main idea is stated in the:', options: ['A) Last sentence', 'B) Middle sentence', 'C) Topic sentence', 'D) Concluding sentence'], correctAnswer: 2, explanation: 'The topic sentence states the main idea of a paragraph, usually at the beginning', hint: 'The sentence that introduces the topic' },
      ]
    },
    medium: {
      low: [
        { question: 'Change to past tense: "I eat rice."', options: ['A) I eaten rice', 'B) I ate rice', 'C) I eated rice', 'D) I eating rice'], correctAnswer: 1, explanation: '"eat" is an irregular verb. Past tense = "ate"', hint: '"eat" is irregular — it does not just add -ed' },
        { question: '"The dog wagged its tail." "its" refers to:', options: ['A) The dog', 'B) The tail', 'C) The owner', 'D) Nothing'], correctAnswer: 0, explanation: '"its" is a possessive pronoun referring back to "the dog"', hint: 'Who does the tail belong to?' },
      ],
      mid: [
        { question: '"He has been studying for 3 hours." Which tense?', options: ['A) Simple past', 'B) Past perfect', 'C) Present perfect continuous', 'D) Future continuous'], correctAnswer: 2, explanation: 'has/have + been + verb+ing = Present Perfect Continuous', hint: 'has been + verb-ing' },
        { question: 'The figure of speech "The moon is a silver coin" is:', options: ['A) Simile', 'B) Personification', 'C) Metaphor', 'D) Alliteration'], correctAnswer: 2, explanation: 'Direct comparison without "like" or "as" = Metaphor', hint: 'Is "like" or "as" used here?' },
        { question: 'Choose the correct passive voice: "Someone broke the window."', options: ['A) The window was broke', 'B) The window was broken', 'C) The window is broken', 'D) The window broke'], correctAnswer: 1, explanation: 'Passive: The window was broken (past participle of break = broken)', hint: 'Passive voice: object + was/were + past participle' },
        { question: 'In "She is the tallest girl in class", "tallest" is:', options: ['A) Positive degree', 'B) Comparative degree', 'C) Superlative degree', 'D) Adjective'], correctAnswer: 2, explanation: '"tallest" uses -est suffix = superlative degree (comparing to all others)', hint: '-est suffix indicates the superlative' },
      ],
      high: [
        { question: 'The mood conveyed by "O Death, where is thy sting?" is:', options: ['A) Fear', 'B) Defiance', 'C) Happiness', 'D) Sorrow'], correctAnswer: 1, explanation: 'The speaker challenges Death — the mood is defiance or triumph', hint: 'The speaker is questioning/challenging Death' },
        { question: 'In dramatic irony:', options: ['A) The audience knows what characters don\'t', 'B) Only the speaker knows a secret', 'C) Everyone is surprised', 'D) The author knows nothing'], correctAnswer: 0, explanation: 'Dramatic irony = audience has knowledge that characters in the story lack', hint: 'Think about who knows what' },
      ]
    },
    hard: {
      mid: [
        { question: '"No sooner ___ he arrived ___ it started raining."', options: ['A) had/than', 'B) did/then', 'C) has/than', 'D) had/then'], correctAnswer: 0, explanation: '"No sooner had...than" is a fixed correlative conjunction pair', hint: '"No sooner...than" is a fixed pair' },
        { question: 'Identify the type: "The man who came here was my uncle."', options: ['A) Compound sentence', 'B) Simple sentence', 'C) Complex sentence', 'D) Compound-complex'], correctAnswer: 2, explanation: 'One main clause + one subordinate clause (who came here) = Complex sentence', hint: 'Is there a subordinate clause (who/which/that)?' },
        { question: '"Writing is to pen as painting is to ___":', options: ['A) canvas', 'B) brush', 'C) artist', 'D) colour'], correctAnswer: 1, explanation: 'Writing uses a pen; painting uses a brush — tool-to-activity analogy', hint: 'What tool is used for painting?' },
        { question: 'Hemingway\'s "The Old Man and the Sea" is an example of:', options: ['A) Romanticism', 'B) Magical Realism', 'C) Modernist fiction', 'D) Gothic literature'], correctAnswer: 2, explanation: 'Hemingway\'s minimalist, iceberg style is characteristic of Modernist fiction', hint: 'Think of the era and Hemingway\'s writing style' },
      ],
      high: [
        { question: 'A "foil" character in literature serves to:', options: ['A) Confuse the reader', 'B) Contrast with the protagonist', 'C) Replace the antagonist', 'D) Narrate the story'], correctAnswer: 1, explanation: 'A foil character highlights the protagonist\'s traits by contrast', hint: 'Think about what "foil" means — something that makes another thing stand out' },
      ]
    }
  },
  'Social Studies': {
    easy: {
      low: [
        { question: 'The capital of India is:', options: ['A) Mumbai', 'B) Kolkata', 'C) New Delhi', 'D) Chennai'], correctAnswer: 2, explanation: 'New Delhi is the capital of India', hint: 'India\'s seat of government' },
        { question: 'The longest river in India is:', options: ['A) Ganga', 'B) Brahmaputra', 'C) Godavari', 'D) Yamuna'], correctAnswer: 0, explanation: 'The Ganga is the longest river in India at about 2,525 km', hint: 'Also called the "Holy River"' },
        { question: 'How many states does India have (2024)?', options: ['A) 25', 'B) 28', 'C) 30', 'D) 32'], correctAnswer: 1, explanation: 'India has 28 states and 8 Union Territories', hint: 'After Telangana formation in 2014' },
        { question: 'The Preamble of India begins with:', options: ['A) "We the citizens"', 'B) "We the people"', 'C) "By order of the government"', 'D) "In the name of God"'], correctAnswer: 1, explanation: 'The Preamble begins with "We, the People of India"', hint: 'Who does the Constitution belong to?' },
        { question: 'Which mountain range separates India from China?', options: ['A) Vindhyas', 'B) Sahyadri', 'C) Himalayas', 'D) Aravallis'], correctAnswer: 2, explanation: 'The Himalayan range forms the northern border between India and China', hint: 'World\'s highest mountain range' },
      ],
      mid: [
        { question: 'Who wrote the Indian national anthem?', options: ['A) Bankim Chandra', 'B) Rabindranath Tagore', 'C) Sarojini Naidu', 'D) Subhash Bose'], correctAnswer: 1, explanation: '"Jana Gana Mana" was written by Rabindranath Tagore', hint: 'Nobel Prize winner from Bengal' },
        { question: 'The Rowlatt Act (1919) was opposed because it:', options: ['A) Raised taxes', 'B) Allowed detention without trial', 'C) Banned political parties', 'D) Imposed press censorship'], correctAnswer: 1, explanation: 'The Rowlatt Act allowed detention of Indians without trial, sparking mass protests', hint: 'It violated basic rights of citizens' },
        { question: 'In which year did India become a Republic?', options: ['A) 1947', 'B) 1948', 'C) 1950', 'D) 1952'], correctAnswer: 2, explanation: 'India became a Republic on 26 January 1950 when the Constitution came into effect', hint: 'Republic Day is celebrated on...' },
        { question: 'Tropical rainforests are found in regions with:', options: ['A) Low rainfall', 'B) Very high rainfall year-round', 'C) Seasonal rainfall', 'D) Cold temperatures'], correctAnswer: 1, explanation: 'Tropical rainforests need over 200cm of rainfall distributed throughout the year', hint: 'Think of Amazon or Western Ghats forests' },
      ],
      high: [
        { question: 'The Dandi March was significant because it:', options: ['A) Led to independence directly', 'B) Challenged the salt tax showing civil disobedience', 'C) Was a military campaign', 'D) Established the Congress party'], correctAnswer: 1, explanation: 'The Dandi March challenged the British salt monopoly and demonstrated peaceful civil disobedience globally', hint: 'What did Gandhi pick up at the end of the march?' },
        { question: 'GDP measures:', options: ['A) Total imports only', 'B) Total value of goods and services produced', 'C) Government spending only', 'D) Foreign exchange reserves'], correctAnswer: 1, explanation: 'GDP = total market value of all goods and services produced within a country in a year', hint: 'G = Gross, D = Domestic, P = Product' },
      ]
    },
    medium: {
      mid: [
        { question: 'Federalism means power is divided between:', options: ['A) President and PM', 'B) Central and State governments', 'C) Judiciary and Legislature', 'D) Military and civilians'], correctAnswer: 1, explanation: 'Federalism is the division of power between central and state governments', hint: 'Think about Centre vs States' },
        { question: 'The Green Revolution in India primarily helped increase production of:', options: ['A) Vegetables', 'B) Fruits', 'C) Food grains (wheat, rice)', 'D) Cotton'], correctAnswer: 2, explanation: 'Green Revolution (1960s) used HYV seeds to massively increase wheat and rice production', hint: 'Which crops feed India\'s population?' },
        { question: 'Which Article of Indian Constitution abolishes untouchability?', options: ['A) Article 14', 'B) Article 17', 'C) Article 21', 'D) Article 25'], correctAnswer: 1, explanation: 'Article 17 of the Indian Constitution abolishes untouchability', hint: 'An article ensuring social equality' },
        { question: '"Laissez-faire" economic policy means:', options: ['A) Heavy government intervention', 'B) Minimal government intervention in economy', 'C) Nationalization of industries', 'D) Controlled trade'], correctAnswer: 1, explanation: 'Laissez-faire = let it be. Minimum government interference in free market', hint: 'French phrase meaning "let it be"' },
      ],
      high: [
        { question: 'The Marshall Plan (1948) was primarily designed to:', options: ['A) Rebuild post-war European economies', 'B) Fund the Cold War', 'C) Create NATO', 'D) Aid India\'s independence'], correctAnswer: 0, explanation: 'The Marshall Plan was a US program providing $13 billion to rebuild war-torn European economies', hint: 'Post-WWII economic recovery in Europe' },
        { question: 'Judicial review in India allows the Supreme Court to:', options: ['A) Make new laws', 'B) Declare laws unconstitutional', 'C) Override Parliament always', 'D) Appoint the PM'], correctAnswer: 1, explanation: 'Judicial review empowers the SC to strike down laws that violate the Constitution', hint: 'The Court checks if laws follow the Constitution' },
      ]
    },
    hard: {
      mid: [
        { question: 'The Non-Aligned Movement (NAM) during Cold War meant India:', options: ['A) Sided with USSR', 'B) Sided with USA', 'C) Refused to join either bloc', 'D) Remained isolated'], correctAnswer: 2, explanation: 'NAM, founded by Nehru, Nasser, and Tito, kept countries independent from both US and Soviet blocs', hint: 'India\'s independent foreign policy stance' },
        { question: 'Stagflation combines:', options: ['A) High growth and inflation', 'B) Stagnant growth and high inflation', 'C) Low prices and high employment', 'D) Deflation and growth'], correctAnswer: 1, explanation: 'Stagflation = economic stagnation + high inflation simultaneously — difficult to solve', hint: 'Stagnation + inflation combined' },
      ],
      high: [
        { question: 'Bretton Woods Conference (1944) established:', options: ['A) United Nations', 'B) NATO', 'C) IMF and World Bank', 'D) European Union'], correctAnswer: 2, explanation: 'Bretton Woods created the IMF and World Bank to manage post-WWII global monetary system', hint: 'International financial institutions created after WWII' },
        { question: 'The "demographic dividend" India is expected to benefit from refers to:', options: ['A) High birth rate', 'B) Large working-age population', 'C) Low death rate', 'D) High elderly population'], correctAnswer: 1, explanation: 'Demographic dividend = economic growth from having a large proportion of working-age (productive) population', hint: 'Think about working age vs dependent population ratio' },
      ]
    }
  }
};

function getMockQuizQuestions(topic, subject, difficulty, gradeNum = 7) {
  const gradeKey = gradeNum <= 5 ? 'low' : gradeNum <= 8 ? 'mid' : 'high';
  const subjectBank = MOCK_BANKS[subject] || MOCK_BANKS['Mathematics'];
  const diffBank = subjectBank[difficulty] || subjectBank['medium'];
  const gradePool = diffBank[gradeKey] || diffBank['mid'] || Object.values(diffBank)[0] || [];

  if (gradePool.length === 0) {
    // Fallback to any available pool
    const allQ = Object.values(diffBank).flat();
    return { questions: shuffle(allQ).slice(0, 5).map((q, i) => ({ ...q, id: i + 1, difficulty, grade: gradeNum })) };
  }

  // Shuffle and pick 5 so every attempt is different
  const picked = shuffle(gradePool).slice(0, 5);
  return {
    questions: picked.map((q, i) => ({ ...q, id: i + 1, difficulty, grade: gradeNum }))
  };
}

// Fisher-Yates shuffle for true randomness
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getMockAnalysis(studentName, quizResults) {
  const avgScore = quizResults.length > 0
    ? Math.round(quizResults.reduce((s, r) => s + r.score, 0) / quizResults.length)
    : 50;

  const level = avgScore >= 80 ? 'proficient' : avgScore >= 60 ? 'developing' : 'struggling';
  const weak = quizResults.filter(r => r.score < 60).map(r => ({
    topic: r.topic, subject: r.subject,
    severity: r.score < 40 ? 'critical' : 'moderate',
    suggestion: `Focus on ${r.topic} basics and practice daily`
  }));
  const strong = quizResults.filter(r => r.score >= 75).map(r => `${r.subject} - ${r.topic}`);

  return {
    overallLevel: level,
    strengthAreas: strong.length ? strong : ['Needs more data'],
    weakAreas: weak.length ? weak : [{ topic: 'Mixed topics', subject: 'General', severity: 'minor', suggestion: 'Keep practising' }],
    learningStyle: 'visual',
    nextSteps: [
      `Complete the personalized study plan for ${weak[0]?.topic || 'weak areas'}`,
      'Take 2 practice quizzes per day',
      'Review explanations for wrong answers'
    ],
    teacherNote: `${studentName} is at ${level} level (avg ${avgScore}%). ${weak.length > 0 ? `Needs attention in: ${weak.map(w => w.topic).join(', ')}.` : 'Doing well overall.'}`
  };
}

module.exports = { generateStudyPlan, generateQuizQuestions, analyzePerformance };
