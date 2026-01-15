# Assessment Portal (OBE) — React + Node/Express + PostgreSQL

This is a **working starter project** for your Assessment Portal
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
```bash
cd client
npm install
npm run dev
```

```

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


---

## Notes
- CS department only (single HOD in seed). You can add departments later if needed.
- OEL is blocked automatically for theory courses.
- Alerts are generated when **GA% < 50** for any mapped GA in a course.

Enjoy!
