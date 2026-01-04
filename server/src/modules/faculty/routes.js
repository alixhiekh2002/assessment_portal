import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { query } from "../../db.js";
import { recomputeCLOAttainment, recomputeGAAttainmentAndAlerts } from "../../utils/attainment.js";
import { gradeFromPercentage } from "../../utils/gradeScale.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(auth, requireRole("FACULTY"));

router.get("/my-courses", async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        ca.course_code,
        c.title,
        c.is_lab,
        ca.batch_id,
        b.batch_year,
        ca.semester_no,
        COALESCE(
          string_agg(DISTINCT s.section, ', ') FILTER (WHERE s.section IS NOT NULL),
          ''
        ) AS sections
      FROM course_assignments ca
      JOIN courses c ON c.code = ca.course_code
      JOIN batches b ON b.id = ca.batch_id
      LEFT JOIN enrollments e
        ON e.course_code = ca.course_code
       AND e.batch_id = ca.batch_id
       AND e.semester_no = ca.semester_no
      LEFT JOIN students s ON s.user_id = e.student_user_id
      WHERE ca.faculty_user_id=$1
      GROUP BY ca.course_code, c.title, c.is_lab, ca.batch_id, b.batch_year, ca.semester_no
      ORDER BY b.batch_year, ca.semester_no, ca.course_code
    `, [req.user.userId]);
    res.json({ courses: rows });
  } catch (e) { next(e); }
});

/** Add CLO */
router.post("/courses/:courseCode/clos", async (req,res,next)=> {
  try{
    const courseCode = req.params.courseCode;
    const schema = z.object({ clo_no: z.number().int().min(1), title: z.string().min(3) });
    const body = schema.parse(req.body);

    const ins = await query(`
      INSERT INTO clos (course_code, title, clo_no, created_by)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (course_code, clo_no) DO UPDATE SET title=EXCLUDED.title
      RETURNING *`,
      [courseCode, body.title, body.clo_no, req.user.userId]
    );
    res.json({ clo: ins.rows[0] });
  } catch(e){ next(e); }
});

/** List CLOs for a course */
router.get("/courses/:courseCode/clos", async (req, res, next) => {
  try {
    const courseCode = req.params.courseCode;
    const { rows } = await query(
      `SELECT id, clo_no, title
       FROM clos
       WHERE course_code=$1
       ORDER BY clo_no`,
      [courseCode]
    );
    res.json({ clos: rows });
  } catch (e) { next(e); }
});

/** Map CLO -> GA */
router.post("/clos/:cloId/map-ga", async (req,res,next)=> {
  try{
    const cloId = Number(req.params.cloId);
    const schema = z.object({
      ga_code: z.enum(["GA1","GA2","GA3","GA4","GA5","GA6","GA7","GA8","GA9","GA10"]),
      weight: z.number().optional()
    });
    const body = schema.parse(req.body);

    const ins = await query(`
      INSERT INTO clo_ga_map (clo_id, ga_code, weight)
      VALUES ($1,$2,COALESCE($3,1.0))
      ON CONFLICT (clo_id, ga_code) DO UPDATE SET weight=EXCLUDED.weight
      RETURNING *`,
      [cloId, body.ga_code, body.weight ?? 1.0]
    );
    res.json({ map: ins.rows[0] });
  } catch(e){ next(e); }
});

/** Create or fetch assessment plan */
router.post("/assessment-plan", async (req,res,next)=> {
  try{
    const schema = z.object({
      course_code: z.string(),
      batch_year: z.number().int(),
      semester_no: z.number().int().min(1)
    });
    const body = schema.parse(req.body);

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
    const batchId = b.rows[0]?.id;
    if(!batchId) return res.status(404).json({ message:"Batch not found" });

    const course = await query(`SELECT is_lab FROM courses WHERE code=$1`, [body.course_code]);
    if(!course.rows[0]) return res.status(404).json({ message:"Course not found" });

    const plan = await query(`
      INSERT INTO assessment_plans (course_code, batch_id, semester_no, created_by)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (course_code, batch_id, semester_no)
      DO UPDATE SET created_by=EXCLUDED.created_by
      RETURNING *`,
      [body.course_code, batchId, body.semester_no, req.user.userId]
    );

    res.json({ ok:true, plan: plan.rows[0] });
  } catch(e){ next(e); }
});

/** Get assessment plan rows */
router.get("/assessment-plan", async (req,res,next)=> {
  try{
    const courseCode = String(req.query.courseCode || "");
    const batchYear = Number(req.query.batchYear);
    const semesterNo = Number(req.query.semesterNo);
    if(!courseCode || !batchYear || !semesterNo || semesterNo < 1) return res.status(400).json({ message:"courseCode,batchYear,semesterNo required" });

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [batchYear]);
    const batchId = b.rows[0]?.id;
    if(!batchId) return res.status(404).json({ message:"Batch not found" });

    const plan = await query(
      `SELECT id FROM assessment_plans WHERE course_code=$1 AND batch_id=$2 AND semester_no=$3`,
      [courseCode, batchId, semesterNo]
    );
    const planId = plan.rows[0]?.id;
    if (!planId) return res.json({ plan: null, rows: [] });

    const rows = await query(`
      SELECT apr.id, apr.component_type, apr.max_marks,
             c.id as clo_id, c.clo_no, c.title
      FROM assessment_plan_rows apr
      JOIN clos c ON c.id = apr.clo_id
      WHERE apr.plan_id=$1
      ORDER BY apr.component_type, c.clo_no
    `, [planId]);

    res.json({ plan: { id: planId }, rows: rows.rows });
  } catch(e){ next(e); }
});

/** Add assessment plan row (component + CLO + max) */
router.post("/assessment-plan/rows", async (req,res,next)=> {
  try{
    const schema = z.object({
      course_code: z.string(),
      batch_year: z.number().int(),
      semester_no: z.number().int().min(1),
      component_type: z.enum(["MID","FINAL","QUIZ","ASSIGNMENT","VIVA","OEL"]),
      clo_id: z.number().int(),
      max_marks: z.number().int().positive()
    });
    const body = schema.parse(req.body);

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
    const batchId = b.rows[0]?.id;
    if(!batchId) return res.status(404).json({ message:"Batch not found" });

    const course = await query(`SELECT is_lab FROM courses WHERE code=$1`, [body.course_code]);
    if(!course.rows[0]) return res.status(404).json({ message:"Course not found" });

    if (!course.rows[0].is_lab && body.component_type === "OEL") {
      return res.status(400).json({ message:"OEL is allowed only for LAB courses." });
    }

    const plan = await query(`
      INSERT INTO assessment_plans (course_code, batch_id, semester_no, created_by)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (course_code, batch_id, semester_no)
      DO UPDATE SET created_by=EXCLUDED.created_by
      RETURNING *`,
      [body.course_code, batchId, body.semester_no, req.user.userId]
    );

    const ins = await query(`
      INSERT INTO assessment_plan_rows (plan_id, component_type, clo_id, max_marks)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (plan_id, component_type, clo_id)
      DO UPDATE SET max_marks=EXCLUDED.max_marks
      RETURNING *`,
      [plan.rows[0].id, body.component_type, body.clo_id, body.max_marks]
    );

    res.json({ row: ins.rows[0] });
  } catch(e){ next(e); }
});

/** Update assessment plan row */
router.patch("/assessment-plan/rows/:rowId", async (req,res,next)=> {
  try{
    const rowId = Number(req.params.rowId);
    const schema = z.object({ max_marks: z.number().int().positive() });
    const body = schema.parse(req.body);

    const upd = await query(
      `UPDATE assessment_plan_rows SET max_marks=$1 WHERE id=$2 RETURNING *`,
      [body.max_marks, rowId]
    );
    if (!upd.rows[0]) return res.status(404).json({ message:"Row not found" });
    res.json({ row: upd.rows[0] });
  } catch(e){ next(e); }
});

/** Delete assessment plan row */
router.delete("/assessment-plan/rows/:rowId", async (req,res,next)=> {
  try{
    const rowId = Number(req.params.rowId);
    await query(`DELETE FROM assessment_plan_rows WHERE id=$1`, [rowId]);
    res.json({ ok:true });
  } catch(e){ next(e); }
});

/** List students in a course offering */
router.get("/course-students", async (req,res,next)=> {
  try{
    const courseCode = String(req.query.courseCode || "");
    const batchYear = Number(req.query.batchYear);
    const semesterNo = Number(req.query.semesterNo);
    if(!courseCode || !batchYear || !semesterNo || semesterNo < 1) return res.status(400).json({ message:"courseCode,batchYear,semesterNo required" });

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [batchYear]);
    const batchId = b.rows[0]?.id;
    if(!batchId) return res.status(404).json({ message:"Batch not found" });

    const students = await query(`
      SELECT s.student_id, u.name, u.email, s.section
      FROM enrollments e
      JOIN users u ON u.id = e.student_user_id
      JOIN students s ON s.user_id = u.id
      WHERE e.course_code=$1 AND e.batch_id=$2 AND e.semester_no=$3
      ORDER BY s.student_id
    `, [courseCode, batchId, semesterNo]);

    res.json({ students: students.rows });
  } catch(e){ next(e); }
});

/** Get existing marks for a course offering (CLO-level per component) */
router.get("/marks/entries", async (req,res,next)=> {
  try{
    const courseCode = String(req.query.courseCode || "");
    const batchYear = Number(req.query.batchYear);
    const semesterNo = Number(req.query.semesterNo);
    if(!courseCode || !batchYear || !semesterNo || semesterNo < 1) {
      return res.status(400).json({ message:"courseCode,batchYear,semesterNo required" });
    }

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [batchYear]);
    const batchId = b.rows[0]?.id;
    if(!batchId) return res.status(404).json({ message:"Batch not found" });

    const plan = await query(
      `SELECT id FROM assessment_plans WHERE course_code=$1 AND batch_id=$2 AND semester_no=$3`,
      [courseCode, batchId, semesterNo]
    );
    const planId = plan.rows[0]?.id;
    if (!planId) return res.json({ marks: [] });

    const { rows } = await query(`
      SELECT s.student_id, cm.plan_row_id, cm.obtained
      FROM clo_marks cm
      JOIN assessment_plan_rows apr ON apr.id = cm.plan_row_id
      JOIN assessment_plans ap ON ap.id = apr.plan_id
      JOIN students s ON s.user_id = cm.student_user_id
      WHERE ap.id=$1
      ORDER BY s.student_id
    `, [planId]);

    res.json({ marks: rows });
  } catch(e){ next(e); }
});

/** Submit marks for a student (CLO-level per component) */
router.post("/marks/entry", async (req,res,next)=> {
  try{
    const schema = z.object({
      student_id: z.string(),
      course_code: z.string(),
      batch_year: z.number().int(),
      semester_no: z.number().int().min(1),
      marks: z.array(z.object({
        plan_row_id: z.number().int(),
        obtained: z.number()
      }))
    });
    const body = schema.parse(req.body);

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
    const batchId = b.rows[0]?.id;
    if(!batchId) return res.status(404).json({ message:"Batch not found" });

    const stu = await query(`
      SELECT s.user_id FROM students s WHERE s.student_id=$1 AND s.batch_id=$2
    `, [body.student_id, batchId]);
    const studentUserId = stu.rows[0]?.user_id;
    if(!studentUserId) return res.status(404).json({ message:"Student not found in batch" });

    const plan = await query(
      `SELECT id FROM assessment_plans WHERE course_code=$1 AND batch_id=$2 AND semester_no=$3`,
      [body.course_code, batchId, body.semester_no]
    );
    const planId = plan.rows[0]?.id;
    if (!planId) return res.status(404).json({ message:"Assessment plan not found" });

    const planRows = await query(`SELECT id FROM assessment_plan_rows WHERE plan_id=$1`, [planId]);
    const allowed = new Set(planRows.rows.map(r => r.id));

    for (const m of body.marks) {
      if (!allowed.has(m.plan_row_id)) continue;
      await query(`
        INSERT INTO clo_marks (student_user_id, plan_row_id, obtained, created_by)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (student_user_id, plan_row_id)
        DO UPDATE SET obtained=EXCLUDED.obtained, created_by=EXCLUDED.created_by, created_at=now()
      `, [studentUserId, m.plan_row_id, m.obtained, req.user.userId]);
    }

    await recomputeCLOAttainment({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });
    await recomputeGAAttainmentAndAlerts({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });
    await recomputeCourseGrade({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });

    res.json({ ok:true });
  } catch(e){ next(e); }
});

/** Upload CSV for CLO-level marks */
router.post("/marks/upload-csv", upload.single("file"), async (req,res,next)=> {
  try{
    if(!req.file) return res.status(400).json({ message:"file required" });
    const csv = req.file.buffer.toString("utf-8");
    const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });

    let processed=0;
    for (const row of records) {
      const schema = z.object({
        student_id: z.string(),
        course_code: z.string(),
        batch_year: z.coerce.number().int(),
        semester_no: z.coerce.number().int().min(1),
        component_type: z.enum(["MID","FINAL","QUIZ","ASSIGNMENT","VIVA","OEL"]),
        clo_no: z.coerce.number().int().min(1),
        obtained: z.coerce.number()
      });
      const body = schema.parse(row);

      const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
      const batchId = b.rows[0]?.id;
      if(!batchId) continue;

      const stu = await query(`SELECT user_id FROM students WHERE student_id=$1 AND batch_id=$2`, [body.student_id, batchId]);
      const studentUserId = stu.rows[0]?.user_id;
      if(!studentUserId) continue;

      const plan = await query(
        `SELECT id FROM assessment_plans WHERE course_code=$1 AND batch_id=$2 AND semester_no=$3`,
        [body.course_code, batchId, body.semester_no]
      );
      const planId = plan.rows[0]?.id;
      if (!planId) continue;

      const clo = await query(
        `SELECT id FROM clos WHERE course_code=$1 AND clo_no=$2`,
        [body.course_code, body.clo_no]
      );
      const cloId = clo.rows[0]?.id;
      if (!cloId) continue;

      const rowRes = await query(
        `SELECT id FROM assessment_plan_rows
         WHERE plan_id=$1 AND component_type=$2 AND clo_id=$3`,
        [planId, body.component_type, cloId]
      );
      const planRowId = rowRes.rows[0]?.id;
      if (!planRowId) continue;

      await query(`
        INSERT INTO clo_marks (student_user_id, plan_row_id, obtained, created_by)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (student_user_id, plan_row_id)
        DO UPDATE SET obtained=EXCLUDED.obtained, created_by=EXCLUDED.created_by, created_at=now()
      `, [studentUserId, planRowId, body.obtained, req.user.userId]);

      await recomputeCLOAttainment({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });
      await recomputeGAAttainmentAndAlerts({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });
      await recomputeCourseGrade({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });

      processed += 1;
    }

    res.json({ ok:true, processed });
  } catch(e){ next(e); }
});

/** Faculty student results (course offering) */
router.get("/student-results", async (req,res,next)=> {
  try{
    const courseCode = String(req.query.courseCode || "");
    const batchYear = Number(req.query.batchYear);
    const semesterNo = Number(req.query.semesterNo);
    if(!courseCode || !batchYear || !semesterNo || semesterNo < 1) return res.status(400).json({ message:"courseCode,batchYear,semesterNo required" });

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [batchYear]);
    const batchId = b.rows[0]?.id;
    if(!batchId) return res.status(404).json({ message:"Batch not found" });

    const students = await query(`
      SELECT s.student_id, u.id as student_user_id, u.name
      FROM enrollments e
      JOIN users u ON u.id = e.student_user_id
      JOIN students s ON s.user_id = u.id
      WHERE e.course_code=$1 AND e.batch_id=$2 AND e.semester_no=$3
      ORDER BY s.student_id
    `, [courseCode, batchId, semesterNo]);

    // For each student: CLO attainment + GA attainment
    const out = [];
    for (const st of students.rows) {
      const clo = await query(`
        SELECT ca.clo_id, c.clo_no, c.title, ca.percentage
        FROM clo_attainment ca
        JOIN clos c ON c.id = ca.clo_id
        WHERE ca.student_user_id=$1 AND ca.course_code=$2 AND ca.batch_id=$3 AND ca.semester_no=$4
        ORDER BY c.clo_no
      `, [st.student_user_id, courseCode, batchId, semesterNo]);

      const ga = await query(`
        SELECT ga_code, percentage
        FROM ga_attainment
        WHERE student_user_id=$1 AND course_code=$2 AND batch_id=$3 AND semester_no=$4
        ORDER BY ga_code
      `, [st.student_user_id, courseCode, batchId, semesterNo]);

      const grade = await query(`
        SELECT percentage, letter_grade, grade_points
        FROM course_grades
        WHERE student_user_id=$1 AND course_code=$2 AND batch_id=$3 AND semester_no=$4
        LIMIT 1
      `, [st.student_user_id, courseCode, batchId, semesterNo]);

      out.push({
        student_id: st.student_id,
        name: st.name,
        clo: clo.rows,
        ga: ga.rows,
        grade: grade.rows[0] || null
      });
    }

    res.json({ results: out });
  } catch(e){ next(e); }
});

/** Internal: recompute course overall % and store course_grades */
async function recomputeCourseGrade({ studentUserId, courseCode, batchId, semesterNo }) {
  // total obtained across all plan rows / total max
  const { rows } = await query(`
    SELECT
      SUM(cm.obtained) AS obtained,
      SUM(apr.max_marks) AS total
    FROM clo_marks cm
    JOIN assessment_plan_rows apr ON apr.id = cm.plan_row_id
    JOIN assessment_plans ap ON ap.id = apr.plan_id
    WHERE cm.student_user_id=$1 AND ap.course_code=$2 AND ap.batch_id=$3 AND ap.semester_no=$4
  `, [studentUserId, courseCode, batchId, semesterNo]);

  const obtained = Number(rows[0]?.obtained || 0);
  const total = Number(rows[0]?.total || 0);
  const pct = total === 0 ? 0 : Math.round((obtained/total)*10000)/100;
  const { letter, gp } = gradeFromPercentage(pct);

  await query(`
    INSERT INTO course_grades (student_user_id, course_code, batch_id, semester_no, percentage, letter_grade, grade_points)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (student_user_id, course_code, batch_id, semester_no)
    DO UPDATE SET percentage=EXCLUDED.percentage, letter_grade=EXCLUDED.letter_grade, grade_points=EXCLUDED.grade_points
  `, [studentUserId, courseCode, batchId, semesterNo, pct, letter, gp]);
}

export default router;
