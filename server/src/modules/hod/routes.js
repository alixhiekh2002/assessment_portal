import { Router } from "express";
import { z } from "zod";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { query } from "../../db.js";

const router = Router();
router.use(auth, requireRole("HOD"));

router.post("/assign-course", async (req, res, next) => {
  try {
    const schema = z.object({
      faculty_user_id: z.string().uuid(),
      batch_year: z.number().int(),
      semester_no: z.number().int(),
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
    if(!batchYear || !semesterNo) return res.status(400).json({ message:"batchYear & semesterNo required" });

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
