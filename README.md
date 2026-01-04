# Assessment Portal (OBE) — React + Node/Express + PostgreSQL

This is a **working starter project** for your Assessment Portal with 4 roles:
- **ADMIN**
- **HOD**
- **FACULTY**
- **STUDENT**

It supports **proper OBE** (Option B):
- CLO creation per course
- CLO → GA mapping (GA fixed 10)
- Assessment plan with components (MID, FINAL, QUIZ, ASSIGNMENT, VIVA, OEL)
- Component **items/questions** mapped to CLO
- **Item-level marks** entry (manual + CSV)
- CLO attainment % → GA attainment % → automatic **HOD alerts** if GA < 50%
- **Standard grade scale** to compute GPA/CGPA + endpoint to promote students by CGPA

> This is a starter meant to be extended. Core backend logic is implemented. Frontend UI is functional (login, role-based drawer, key pages), but you can enhance styling and validations.

---

## Tech
- Frontend: React (Vite) + React Router + MUI
- Backend: Node.js + Express (ESM) + pg
- Auth: JWT + bcrypt
- DB: PostgreSQL (docker-compose provided)

---

## Quick Start (Recommended: Docker Postgres)

### 1) Start PostgreSQL
```bash
cd server
docker compose up -d
```

### 2) Backend setup
```bash
cd server
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Backend runs at: `http://localhost:5000`

### 3) Frontend setup
```bash
cd client
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Default Accounts (seeded)
Password for all seeded users: **Pass@1234**

- Admin: `admin@cs.edu`
- HOD: `hod@cs.edu`
- Faculty: `faculty@cs.edu`
- Student: `student@cs.edu`

---

## CSV Formats

### A) Student Bulk Upload (Admin)
Upload to: `POST /api/admin/students/bulk` (multipart/form-data `file`)
```csv
student_id,name,email,batch_year,section
2026-CS-001,Ali Khan,ali001@uni.edu,2026,A
2026-CS-002,Sara Shah,sara002@uni.edu,2026,A
```

### B) Item Marks Upload (Faculty)
Upload to: `POST /api/faculty/marks/upload-csv` (multipart/form-data `file`)
```csv
student_id,course_code,batch_year,semester_no,component_type,item_no,obtained
2026-CS-001,CMC111,2026,1,MID,1,8
2026-CS-001,CMC111,2026,1,MID,2,6
```

---

## Standard Grade Scale (used for GPA/CGPA)
- A  (85–100) 4.00
- A- (80–84)  3.70
- B+ (75–79)  3.30
- B  (70–74)  3.00
- B- (65–69)  2.70
- C+ (60–64)  2.30
- C  (55–59)  2.00
- D  (50–54)  1.00
- F  (<50)    0.00

Promotion endpoint expects a threshold (default 2.00):
`POST /api/admin/semester/promote?batchYear=2026&semesterNo=1&cgpaThreshold=2.0`

---

## Notes
- CS department only (single HOD in seed). You can add departments later if needed.
- OEL is blocked automatically for theory courses.
- Alerts are generated when **GA% < 50** for any mapped GA in a course.

Enjoy!
