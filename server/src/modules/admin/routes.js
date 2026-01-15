import { Router } from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { query } from "../../db.js";
import { gradeFromPercentage } from "../../utils/gradeScale.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(auth, requireRole("ADMIN"));

/** Admin dashboard overview */
router.get("/dashboard", async (req, res, next) => {
  try {
    const hods = await query(`
      SELECT u.id, u.name, u.email, h.department
      FROM hods h
      JOIN users u ON u.id = h.user_id
      WHERE u.is_active=true
      ORDER BY u.name
    `);
    const faculty = await query(`
      SELECT u.id, u.name, u.email, f.department
      FROM faculty f
      JOIN users u ON u.id = f.user_id
      WHERE u.is_active=true
      ORDER BY u.name
    `);
    const studentsCount = await query(`SELECT COUNT(*)::int AS count FROM students`);
    const batches = await query(`
      SELECT id, batch_year, program
      FROM batches
      ORDER BY batch_year DESC, program
    `);

    res.json({
      hods: hods.rows,
      faculty: faculty.rows,
      studentsCount: studentsCount.rows[0]?.count || 0,
      batches: batches.rows
    });
  } catch (e) { next(e); }
});

/** Students by batch */
router.get("/batches/:batchId/students", async (req, res, next) => {
  try {
    const batchId = Number(req.params.batchId);
    if (!batchId) return res.status(400).json({ message: "batchId required" });

    const { rows } = await query(`
      SELECT s.student_id, u.name, u.email, s.section, s.current_semester_no
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.batch_id=$1
      ORDER BY s.student_id
    `, [batchId]);

    res.json({ students: rows });
  } catch (e) { next(e); }
});

router.delete("/batches/:batchId/students/:studentId", async (req, res, next) => {
  try {
    const batchId = Number(req.params.batchId);
    const studentId = String(req.params.studentId || "");
    if (!batchId || !studentId) return res.status(400).json({ message: "batchId and studentId required" });

    const stu = await query(
      `SELECT user_id FROM students WHERE batch_id=$1 AND student_id=$2`,
      [batchId, studentId]
    );
    const userId = stu.rows[0]?.user_id;
    if (!userId) return res.status(404).json({ message: "Student not found in batch" });

    await query("DELETE FROM alerts WHERE student_user_id=$1", [userId]);
    await query("DELETE FROM clo_marks WHERE student_user_id=$1", [userId]);
    await query("DELETE FROM item_marks WHERE student_user_id=$1", [userId]);
    await query("DELETE FROM clo_attainment WHERE student_user_id=$1", [userId]);
    await query("DELETE FROM ga_attainment WHERE student_user_id=$1", [userId]);
    await query("DELETE FROM course_grades WHERE student_user_id=$1", [userId]);
    await query("DELETE FROM enrollments WHERE student_user_id=$1 AND batch_id=$2", [userId, batchId]);
    await query("DELETE FROM students WHERE user_id=$1 AND batch_id=$2", [userId, batchId]);
    await query("DELETE FROM users WHERE id=$1", [userId]);

    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete("/batches/:batchId", async (req, res, next) => {
  try {
    const batchId = Number(req.params.batchId);
    if (!batchId) return res.status(400).json({ message: "batchId required" });

    const batchRes = await query("SELECT batch_year FROM batches WHERE id=$1", [batchId]);
    const batchYear = batchRes.rows[0]?.batch_year;
    if (!batchYear) return res.status(404).json({ message: "Batch not found" });

    await query("DELETE FROM alerts WHERE batch_year=$1", [batchYear]);
    await query("DELETE FROM clo_attainment WHERE batch_id=$1", [batchId]);
    await query("DELETE FROM ga_attainment WHERE batch_id=$1", [batchId]);
    await query("DELETE FROM course_grades WHERE batch_id=$1", [batchId]);
    await query("DELETE FROM enrollments WHERE batch_id=$1", [batchId]);
    await query("DELETE FROM course_assignments WHERE batch_id=$1", [batchId]);
    await query("DELETE FROM batch_courses WHERE batch_id=$1", [batchId]);
    await query(
      `DELETE FROM users
       WHERE id IN (SELECT user_id FROM students WHERE batch_id=$1)`,
      [batchId]
    );
    await query("DELETE FROM students WHERE batch_id=$1", [batchId]);
    await query("DELETE FROM batches WHERE id=$1", [batchId]);

    res.json({ ok: true });
  } catch (e) { next(e); }
});

/** List courses by semester */
router.get("/courses", async (req, res, next) => {
  try {
    const semesterNo = Number(req.query.semesterNo);
    if (!semesterNo || semesterNo < 1) return res.status(400).json({ message: "semesterNo required" });

    const { rows } = await query(
      `SELECT code, title, is_lab, semester_no
       FROM courses
       WHERE semester_no=$1
       ORDER BY code`,
      [semesterNo]
    );
    res.json({ courses: rows });
  } catch (e) { next(e); }
});

/** Add course (create if needed) and map to batch semester */
router.post("/courses/add", async (req, res, next) => {
  try {
    const schema = z.object({
      batch_year: z.coerce.number().int(),
      semester_no: z.coerce.number().int().min(1).max(8),
      course_code: z.string().min(3),
      course_title: z.string().min(3),
      is_lab: z.coerce.boolean().optional()
    });
    const body = schema.parse(req.body);

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
    const batchId = b.rows[0]?.id;
    if (!batchId) return res.status(404).json({ message: "Batch not found" });

    const courseRes = await query(
      `INSERT INTO courses (code, title, is_lab, semester_no, credit_hours)
       VALUES ($1,$2,$3,$4,3)
       ON CONFLICT (code) DO UPDATE
       SET title=EXCLUDED.title, is_lab=EXCLUDED.is_lab, semester_no=EXCLUDED.semester_no
       RETURNING code, title, is_lab, semester_no`,
      [body.course_code, body.course_title, body.is_lab || false, body.semester_no]
    );

    await query(
      `INSERT INTO batch_courses (batch_id, semester_no, course_code)
       VALUES ($1,$2,$3)
       ON CONFLICT (batch_id, semester_no, course_code) DO NOTHING`,
      [batchId, body.semester_no, body.course_code]
    );

    res.json({ ok: true, course: courseRes.rows[0] });
  } catch (e) { next(e); }
});

/** Create user (ADMIN adds HOD/FACULTY/STUDENT basic). Student profile created separately in bulk or single. */
router.post("/users", async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(["HOD","FACULTY","STUDENT","ADMIN"]),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      department: z.string().min(2).optional(),
      student_id: z.string().min(3).optional(),
      batch_year: z.coerce.number().int().optional(),
      section: z.string().optional(),
      current_semester_no: z.coerce.number().int().min(1).optional(),
    });
    const body = schema.parse(req.body);

    if ((body.role === "HOD" || body.role === "FACULTY") && !body.department) {
      return res.status(400).json({ message: "department is required" });
    }
    if (body.role === "STUDENT" && (!body.student_id || !body.batch_year)) {
      return res.status(400).json({ message: "student_id and batch_year are required" });
    }

    const roleRes = await query("SELECT id FROM roles WHERE name=$1", [body.role]);
    const roleId = roleRes.rows[0]?.id;
    if (!roleId) return res.status(400).json({ message: "Invalid role" });

    const hash = await bcrypt.hash(body.password, 10);
    const ins = await query(
      `INSERT INTO users (role_id, name, email, password_hash)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email`,
      [roleId, body.name, body.email, hash]
    );

    if (body.role === "HOD") {
      await query(
        `INSERT INTO hods (user_id, department)
         VALUES ($1,$2)
         ON CONFLICT (user_id) DO UPDATE SET department=EXCLUDED.department`,
        [ins.rows[0].id, body.department]
      );
    }
    if (body.role === "FACULTY") {
      await query(
        `INSERT INTO faculty (user_id, department)
         VALUES ($1,$2)
         ON CONFLICT (user_id) DO UPDATE SET department=EXCLUDED.department`,
        [ins.rows[0].id, body.department]
      );
    }
    if (body.role === "STUDENT") {
      const b = await query(
        `INSERT INTO batches (batch_year, program)
         VALUES ($1, 'BSCS')
         ON CONFLICT (batch_year, program) DO UPDATE SET program=EXCLUDED.program
         RETURNING id`,
        [body.batch_year]
      );
      const batchId = b.rows[0].id;
      const sem = body.current_semester_no || 1;

      await query(
        `INSERT INTO batch_courses (batch_id, semester_no, course_code)
         SELECT $1, $2, c.code
         FROM courses c
         WHERE c.semester_no=$2
         ON CONFLICT DO NOTHING`,
        [batchId, sem]
      );

      await query(
        `INSERT INTO students (user_id, student_id, batch_id, current_semester_no, section)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (user_id) DO UPDATE
         SET student_id=EXCLUDED.student_id, batch_id=EXCLUDED.batch_id, current_semester_no=EXCLUDED.current_semester_no, section=EXCLUDED.section`,
        [ins.rows[0].id, body.student_id, batchId, sem, body.section || null]
      );

      const semCourses = await query(
        "SELECT course_code FROM batch_courses WHERE batch_id=$1 AND semester_no=$2",
        [batchId, sem]
      );
      for (const c of semCourses.rows) {
        await query(
          `INSERT INTO enrollments (student_user_id, course_code, semester_no, batch_id, status)
           VALUES ($1,$2,$3,$4,'ENROLLED')
           ON CONFLICT DO NOTHING`,
          [ins.rows[0].id, c.course_code, sem, batchId]
        );
      }
    }

    res.json({ user: ins.rows[0] });
  } catch (e) { next(e); }
});

router.delete("/users/:id", async (req,res,next)=> {
  try{
    await query("UPDATE users SET is_active=false WHERE id=$1", [req.params.id]);
    res.json({ ok:true });
  } catch(e){ next(e); }
});

/** Add course to batch semester */
router.post("/batch-courses", async (req,res,next)=> {
  try{
    const schema = z.object({
      batch_year: z.coerce.number().int(),
      semester_no: z.coerce.number().int().min(1),
      course_code: z.string().min(3)
    });
    const body = schema.parse(req.body);

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
    const batchId = b.rows[0]?.id;
    if (!batchId) return res.status(404).json({ message: "Batch not found" });

    const course = await query(`SELECT code FROM courses WHERE code=$1`, [body.course_code]);
    if (!course.rows[0]) return res.status(404).json({ message: "Course not found" });

    const ins = await query(
      `INSERT INTO batch_courses (batch_id, semester_no, course_code)
       VALUES ($1,$2,$3)
       ON CONFLICT (batch_id, semester_no, course_code) DO NOTHING
       RETURNING *`,
      [batchId, body.semester_no, body.course_code]
    );
    res.json({ ok:true, batch_course: ins.rows[0] || null });
  } catch(e){ next(e); }
});

/** Remove course from batch semester */
router.delete("/batch-courses", async (req,res,next)=> {
  try{
    const schema = z.object({
      batch_year: z.coerce.number().int(),
      semester_no: z.coerce.number().int().min(1),
      course_code: z.string().min(3)
    });
    const body = schema.parse(req.body);

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
    const batchId = b.rows[0]?.id;
    if (!batchId) return res.status(404).json({ message: "Batch not found" });

    await query(
      `DELETE FROM batch_courses WHERE batch_id=$1 AND semester_no=$2 AND course_code=$3`,
      [batchId, body.semester_no, body.course_code]
    );
    res.json({ ok:true });
  } catch(e){ next(e); }
});

/** Create batch */
router.post("/batches", async (req,res,next)=> {
  try{
    const schema = z.object({ batch_year: z.number().int(), program: z.string().optional() });
    const { batch_year, program } = schema.parse(req.body);
    const r = await query(
      `INSERT INTO batches (batch_year, program) VALUES ($1, COALESCE($2,'BSCS'))
       ON CONFLICT (batch_year, program) DO UPDATE SET program=EXCLUDED.program
       RETURNING *`,
      [batch_year, program || "BSCS"]
    );
    res.json({ batch: r.rows[0] });
  } catch(e){ next(e); }
});

/** Bulk upload students CSV */
router.post("/students/bulk", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file is required" });
    const csv = req.file.buffer.toString("utf-8");
    const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });

    // Ensure STUDENT role
    const roleRes = await query("SELECT id FROM roles WHERE name='STUDENT'");
    const roleId = roleRes.rows[0].id;

    const created = [];
    for (const row of records) {
      const normalize = (obj) => {
        const out = {};
        for (const [key, value] of Object.entries(obj)) {
          const normKey = String(key).trim().toLowerCase().replace(/\s+/g, "_");
          out[normKey] = value;
        }
        return out;
      };
      const normalized = normalize(row);
      if (normalized.student_id == null && normalized.studentid != null) {
        normalized.student_id = normalized.studentid;
      }
      if (normalized.batch_year == null && normalized.batchyear != null) {
        normalized.batch_year = normalized.batchyear;
      }
      if (normalized.password == null && normalized.pass != null) {
        normalized.password = normalized.pass;
      }

      const schema = z.object({
        student_id: z.string().min(1),
        name: z.string().min(2),
        email: z.string().email(),
        batch_year: z.coerce.number().int(),
        section: z.string().optional(),
        password: z.string().min(6)
      });
      const r = schema.parse(normalized);

      // Batch
      const b = await query(
        `INSERT INTO batches (batch_year, program) VALUES ($1,'BSCS')
         ON CONFLICT (batch_year, program) DO UPDATE SET program=EXCLUDED.program
         RETURNING id, batch_year`,
        [r.batch_year]
      );
      const batchId = b.rows[0].id;

      const hash = await bcrypt.hash(r.password, 10);

      const u = await query(
        `INSERT INTO users (role_id, name, email, password_hash)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [roleId, r.name, r.email, hash]
      );
      const userId = u.rows[0].id;

      await query(
        `INSERT INTO batch_courses (batch_id, semester_no, course_code)
         SELECT $1, 1, c.code
         FROM courses c
         WHERE c.semester_no=1
         ON CONFLICT DO NOTHING`,
        [batchId]
      );

      await query(
        `INSERT INTO students (user_id, student_id, batch_id, current_semester_no, section)
         VALUES ($1,$2,$3,1,$4)
         ON CONFLICT (user_id) DO UPDATE SET student_id=EXCLUDED.student_id, batch_id=EXCLUDED.batch_id, section=EXCLUDED.section`,
        [userId, r.student_id, batchId, r.section || null]
      );

      const semCourses = await query(
        "SELECT course_code FROM batch_courses WHERE batch_id=$1 AND semester_no=1",
        [batchId]
      );
      for (const c of semCourses.rows) {
        await query(
          `INSERT INTO enrollments (student_user_id, course_code, semester_no, batch_id, status)
           VALUES ($1,$2,1,$3,'ENROLLED')
           ON CONFLICT DO NOTHING`,
          [userId, c.course_code, batchId]
        );
      }

      created.push({ student_id: r.student_id, email: r.email });
    }

    res.json({ ok: true, count: created.length, created });
  } catch (e) { next(e); }
});

/** Promote semester based on CGPA threshold */
router.post("/semester/promote", async (req, res, next) => {
  try {
    const batchYear = Number(req.query.batchYear);
    const semesterNo = Number(req.query.semesterNo);
    const cgpaThreshold = req.query.cgpaThreshold ? Number(req.query.cgpaThreshold) : 2.0;
    if (!batchYear || !semesterNo || semesterNo < 1) return res.status(400).json({ message: "batchYear and semesterNo required" });

    const b = await query("SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'", [batchYear]);
    const batchId = b.rows[0]?.id;
    if (!batchId) return res.status(404).json({ message: "Batch not found" });

    // For each student in batch, compute CGPA from course_grades, promote if >= threshold and currently in semesterNo
    const studs = await query(`SELECT user_id FROM students WHERE batch_id=$1 AND current_semester_no=$2`, [batchId, semesterNo]);
    let promoted = 0;

    for (const s of studs.rows) {
      const cg = await query(`
        SELECT SUM(cg.grade_points * c.credit_hours) AS num,
               SUM(c.credit_hours) AS den
        FROM course_grades cg
        JOIN courses c ON c.code = cg.course_code
        WHERE cg.student_user_id=$1 AND cg.batch_id=$2
      `, [s.user_id, batchId]);
      const num = Number(cg.rows[0]?.num || 0);
      const den = Number(cg.rows[0]?.den || 0);
      const cgpa = den === 0 ? 0 : (num/den);

      if (cgpa >= cgpaThreshold) {
        await query(`UPDATE students SET current_semester_no = current_semester_no + 1 WHERE user_id=$1`, [s.user_id]);
        promoted += 1;
        // Auto enroll next semester courses from batch_courses
        const nextSem = semesterNo + 1;
        const nextCourses = await query(`SELECT course_code FROM batch_courses WHERE batch_id=$1 AND semester_no=$2`, [batchId, nextSem]);
        for (const c of nextCourses.rows) {
          await query(
            `INSERT INTO enrollments (student_user_id, course_code, semester_no, batch_id, status)
             VALUES ($1,$2,$3,$4,'ENROLLED')
             ON CONFLICT DO NOTHING`,
            [s.user_id, c.course_code, nextSem, batchId]
          );
        }
      }
    }

    res.json({ ok: true, promoted, cgpaThreshold, batchYear, semesterNo });
  } catch (e) { next(e); }
});

export default router;
