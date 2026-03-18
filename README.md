# 📚 VidyaAI — AI-Powered Personalized Learning Platform

> SDG 4 – Quality Education | Azure OpenAI · React · Node.js
> Grade-aware · Difficulty-differentiated · Unique questions every attempt

---

## 🚀 Quick Start (Windows — 3 steps)

**Step 1:** Open the `AI-Learning-Platform` folder in VS Code
**Step 2:** Open terminal (`Ctrl + backtick`)
**Step 3:** Run these commands:

```powershell
cd backend
npm install
npm run dev
```

Open a second terminal:
```powershell
cd frontend
npm install
npm start
```

OR simply double-click **START.bat** — it does everything automatically!

---

## 🎮 Demo Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Teacher | teacher@vidyaai.com | teacher123 |
| Student (struggling) | arjun@vidyaai.com | student123 |
| Student (top) | rahul@vidyaai.com | student123 |

No Azure keys needed — full demo works with built-in data.

---

## ✨ What's New (v2)

- Unique questions every attempt (random seed + temperature 1.0)
- Grade-aware topics: Primary / Middle / Secondary
- Difficulty truly different: Easy = recall, Medium = apply, Hard = analyze
- 50+ question mock bank with shuffle (works offline)
- New vibrant color theme: Violet · Coral · Cyan · Lime · Pink
- New fonts: Nunito + Baloo 2

---

## ⚙️ Azure OpenAI Setup

Edit `backend/.env` (copy from `.env.example`):

```
AZURE_OPENAI_API_KEY=your_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```
