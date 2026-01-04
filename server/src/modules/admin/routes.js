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

/** Create user (ADMIN adds HOD/FACULTY/STUDENT basic). Student profile created separately in bulk or single. */
router.post("/users", async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(["HOD","FACULTY","STUDENT","ADMIN"]),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    });
    const body = schema.parse(req.body);

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
    res.json({ user: ins.rows[0] });
  } catch (e) { next(e); }
});

router.delete("/users/:id", async (req,res,next)=> {
  try{
    await query("UPDATE users SET is_active=false WHERE id=$1", [req.params.id]);
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
      const schema = z.object({
        student_id: z.string().min(3),
        name: z.string().min(2),
        email: z.string().email(),
        batch_year: z.coerce.number().int(),
        section: z.string().optional()
      });
      const r = schema.parse(row);

      // Batch
      const b = await query(
        `INSERT INTO batches (batch_year, program) VALUES ($1,'BSCS')
         ON CONFLICT (batch_year, program) DO UPDATE SET program=EXCLUDED.program
         RETURNING id, batch_year`,
        [r.batch_year]
      );
      const batchId = b.rows[0].id;

      // User (default password)
      const defaultPwd = "Pass@1234";
      const hash = await bcrypt.hash(defaultPwd, 10);

      const u = await query(
        `INSERT INTO users (role_id, name, email, password_hash)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [roleId, r.name, r.email, hash]
      );
      const userId = u.rows[0].id;

      await query(
        `INSERT INTO students (user_id, student_id, batch_id, current_semester_no, section)
         VALUES ($1,$2,$3,1,$4)
         ON CONFLICT (user_id) DO UPDATE SET student_id=EXCLUDED.student_id, batch_id=EXCLUDED.batch_id, section=EXCLUDED.section`,
        [userId, r.student_id, batchId, r.section || null]
      );

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
    if (!batchYear || !semesterNo) return res.status(400).json({ message: "batchYear and semesterNo required" });

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
