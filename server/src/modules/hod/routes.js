import { Router } from "express";
import { z } from "zod";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { query } from "../../db.js";

const router = Router();
router.use(auth, requireRole("HOD"));

router.get("/batches", async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT id, batch_year, program
      FROM batches
      ORDER BY batch_year DESC, program
    `);
    res.json({ batches: rows });
  } catch (e) { next(e); }
});

router.get("/summary", async (req, res, next) => {
  try {
    const deptRes = await query(
      `SELECT department FROM hods WHERE user_id=$1`,
      [req.user.userId]
    );
    const department = deptRes.rows[0]?.department || "CS";

    const facultyRes = await query(
      `SELECT COUNT(*)::int AS count
       FROM faculty f
       JOIN users u ON u.id = f.user_id
       WHERE f.department=$1 AND u.is_active=true`,
      [department]
    );

    res.json({ department, facultyCount: facultyRes.rows[0]?.count || 0 });
  } catch (e) { next(e); }
});

router.get("/faculty", async (req, res, next) => {
  try {
    const deptRes = await query(
      `SELECT department FROM hods WHERE user_id=$1`,
      [req.user.userId]
    );
    const department = deptRes.rows[0]?.department || "CS";

    const { rows } = await query(
      `SELECT u.id, u.name, u.email, f.department
       FROM faculty f
       JOIN users u ON u.id = f.user_id
       WHERE f.department=$1 AND u.is_active=true
       ORDER BY u.name`,
      [department]
    );
    res.json({ department, faculty: rows });
  } catch (e) { next(e); }
});

router.get("/faculty/:userId/courses", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const deptRes = await query(
      `SELECT department FROM hods WHERE user_id=$1`,
      [req.user.userId]
    );
    const department = deptRes.rows[0]?.department || "CS";

    const facRes = await query(
      `SELECT u.id
       FROM faculty f
       JOIN users u ON u.id = f.user_id
       WHERE u.id=$1 AND f.department=$2 AND u.is_active=true`,
      [userId, department]
    );
    if (!facRes.rows[0]) return res.status(404).json({ message: "Faculty not found" });

    const { rows } = await query(
      `SELECT ca.course_code, c.title, b.batch_year, ca.semester_no
       FROM course_assignments ca
       JOIN courses c ON c.code = ca.course_code
       JOIN batches b ON b.id = ca.batch_id
       WHERE ca.faculty_user_id=$1
       ORDER BY b.batch_year, ca.semester_no, ca.course_code`,
      [userId]
    );
    res.json({ courses: rows });
  } catch (e) { next(e); }
});

router.get("/batches/:batchId/students", async (req, res, next) => {
  try {
    const batchId = Number(req.params.batchId);
    const semesterNo = req.query.semesterNo ? Number(req.query.semesterNo) : null;
    if (!batchId) return res.status(400).json({ message: "batchId required" });
    if (semesterNo !== null && semesterNo < 1) return res.status(400).json({ message: "semesterNo must be 1 or higher" });

    const { rows } = await query(`
      SELECT s.student_id, u.name, u.email, s.section, s.current_semester_no
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.batch_id=$1
        AND ($2::int IS NULL OR s.current_semester_no=$2)
      ORDER BY s.student_id
    `, [batchId, semesterNo]);

    res.json({ students: rows });
  } catch (e) { next(e); }
});

router.get("/batches/:batchId/students/:studentId/results", async (req, res, next) => {
  try {
    const batchId = Number(req.params.batchId);
    const studentId = String(req.params.studentId || "");
    const semesterNo = Number(req.query.semesterNo);
    if (!batchId || !studentId || !semesterNo || semesterNo < 1) {
      return res.status(400).json({ message: "batchId, studentId, semesterNo required" });
    }

    const stu = await query(
      `SELECT s.user_id
       FROM students s
       WHERE s.batch_id=$1 AND s.student_id=$2`,
      [batchId, studentId]
    );
    const studentUserId = stu.rows[0]?.user_id;
    if (!studentUserId) return res.status(404).json({ message: "Student not found in batch" });

    const { rows } = await query(`
      SELECT e.course_code, c.title,
             cg.percentage, cg.letter_grade, cg.grade_points
      FROM enrollments e
      JOIN courses c ON c.code = e.course_code
      LEFT JOIN course_grades cg
        ON cg.student_user_id = e.student_user_id
       AND cg.course_code = e.course_code
       AND cg.batch_id = e.batch_id
       AND cg.semester_no = e.semester_no
      WHERE e.student_user_id=$1 AND e.batch_id=$2 AND e.semester_no=$3
      ORDER BY e.course_code
    `, [studentUserId, batchId, semesterNo]);

    res.json({ results: rows });
  } catch (e) { next(e); }
});

router.post("/assign-course", async (req, res, next) => {
  try {
    const schema = z.object({
      faculty_user_id: z.string().uuid(),
      batch_year: z.number().int(),
      semester_no: z.number().int().min(1),
      course_code: z.string().min(3)
    });
    const body = schema.parse(req.body);

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
    const batchId = b.rows[0]?.id;
    if (!batchId) return res.status(404).json({ message: "Batch not found" });

    const ins = await query(
      `INSERT INTO course_assignments (hod_user_id, faculty_user_id, batch_id, semester_no, course_code)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (faculty_user_id, batch_id, semester_no, course_code) DO NOTHING
       RETURNING *`,
      [req.user.userId, body.faculty_user_id, batchId, body.semester_no, body.course_code]
    );

    res.json({ ok: true, assignment: ins.rows[0] });
  } catch (e) { next(e); }
});

router.get("/alerts", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM alerts WHERE hod_user_id=$1 ORDER BY created_at DESC LIMIT 200`,
      [req.user.userId]
    );
    res.json({ alerts: rows });
  } catch (e) { next(e); }
});

router.patch("/alerts/:id/resolve", async (req,res,next)=> {
  try{
    await query(`UPDATE alerts SET is_resolved=true WHERE id=$1 AND hod_user_id=$2`, [req.params.id, req.user.userId]);
    res.json({ ok:true });
  } catch(e){ next(e); }
});

router.delete("/faculty/:userId", async (req,res,next)=> {
  try{
    // HOD can disable faculty account
    await query(`UPDATE users SET is_active=false WHERE id=$1`, [req.params.userId]);
    res.json({ ok:true });
  } catch(e){ next(e); }
});

router.get("/course/:courseCode/students", async (req,res,next)=> {
  try{
    const courseCode = req.params.courseCode;
    const batchYear = Number(req.query.batchYear);
    const semesterNo = Number(req.query.semesterNo);
    if(!batchYear || !semesterNo || semesterNo < 1) return res.status(400).json({ message:"batchYear & semesterNo required" });

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [batchYear]);
    const batchId = b.rows[0]?.id;
    if(!batchId) return res.status(404).json({ message:"Batch not found" });

    const { rows } = await query(`
      SELECT s.student_id, u.name, u.email
      FROM enrollments e
      JOIN users u ON u.id = e.student_user_id
      JOIN students s ON s.user_id = u.id
      WHERE e.course_code=$1 AND e.batch_id=$2 AND e.semester_no=$3
      ORDER BY s.student_id
    `, [courseCode, batchId, semesterNo]);

    res.json({ students: rows });
  } catch(e){ next(e); }
});

export default router;
