# AI Resume + Job Matcher

Full-stack app that compares a resume with a job description using Google's Gemini API. It extracts the candidate's skills, scores how well they match the role, lists matched and missing skills, and gives specific resume improvements and learning recommendations. Every analysis is saved in MySQL.

**Tech stack:** React.js (Vite), JavaScript, Java 17, Spring Boot 3, Spring Data JPA, MySQL, Gemini API, Apache PDFBox

## Features
- Paste resume text or upload a PDF/TXT resume
- Match score (0-100) with matched skills, missing skills and an overall summary
- Personalized resume improvements and recommendations
- Saved history of past matches (reopen or delete)
- API key kept in an environment variable, never in the repo

## Project structure
```
backend/   Spring Boot REST API (controller, service, repository, model, dto)
frontend/  React + Vite UI
```

## Prerequisites
- Java 17+, Maven 3.8+
- Node.js 18+
- MySQL 8 running locally
- A Gemini API key from https://aistudio.google.com/apikey

## Run locally
### 1. Backend
```bash
cd backend
export GEMINI_API_KEY=your_key_here          # PowerShell: $env:GEMINI_API_KEY="your_key_here"
export DB_USERNAME=root DB_PASSWORD=your_mysql_password
mvn spring-boot:run
```
The `resume_matcher` database and tables are created automatically. API runs on http://localhost:8080.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

## API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resumes/extract` | Upload a PDF/TXT file (form field `file`), returns `{ "text" }` |
| POST | `/api/analyze` | Submit `{ candidateName, jobTitle, jobDescription, resumeText }`, returns the saved match |
| GET | `/api/matches` | List past matches (newest first) |
| GET | `/api/matches/{id}` | Get one match |
| DELETE | `/api/matches/{id}` | Delete a match and its resume |

## Database
- `resumes`: candidate name, resume text, AI-extracted skills
- `match_results`: linked resume, job title and description, match score, full AI analysis (JSON)

## Configuration
| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY` | none (required) | Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | local MySQL, root/root | Database connection |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
