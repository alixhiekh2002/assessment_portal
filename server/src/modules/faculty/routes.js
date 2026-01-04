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
      SELECT ca.course_code, c.title, c.is_lab, ca.batch_id, b.batch_year, ca.semester_no
      FROM course_assignments ca
      JOIN courses c ON c.code = ca.course_code
      JOIN batches b ON b.id = ca.batch_id
      WHERE ca.faculty_user_id=$1
      ORDER BY b.batch_year, ca.semester_no, ca.course_code
    `, [req.user.userId]);
    res.json({ courses: rows });
  } catch (e) { next(e); }
});

/** Add CLO */
router.post("/courses/:courseCode/clos", async (req,res,next)=> {
  try{
    const courseCode = req.params.courseCode;
    const schema = z.object({ clo_no: z.number().int(), title: z.string().min(3) });
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

/** Create/Update assessment plan with components */
router.post("/assessment-plan", async (req,res,next)=> {
  try{
    const schema = z.object({
      course_code: z.string(),
      batch_year: z.number().int(),
      semester_no: z.number().int(),
      components: z.array(z.object({
        type: z.enum(["MID","FINAL","QUIZ","ASSIGNMENT","VIVA","OEL"]),
        total_marks: z.number().int().positive()
      }))
    });
    const body = schema.parse(req.body);

    const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
    const batchId = b.rows[0]?.id;
    if(!batchId) return res.status(404).json({ message:"Batch not found" });

    const course = await query(`SELECT is_lab FROM courses WHERE code=$1`, [body.course_code]);
    if(!course.rows[0]) return res.status(404).json({ message:"Course not found" });

    // OEL restriction
    if (!course.rows[0].is_lab && body.components.some(c => c.type === "OEL")) {
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

    // Upsert components
    for (const c of body.components) {
      await query(`
        INSERT INTO assessment_components (plan_id, type, total_marks)
        VALUES ($1,$2,$3)
        ON CONFLICT (plan_id, type) DO UPDATE SET total_marks=EXCLUDED.total_marks
      `, [plan.rows[0].id, c.type, c.total_marks]);
    }

    res.json({ ok:true, plan: plan.rows[0] });
  } catch(e){ next(e); }
});

/** Add assessment item inside a component */
router.post("/assessment/components/:componentId/items", async (req,res,next)=> {
  try{
    const componentId = Number(req.params.componentId);
    const schema = z.object({ item_no: z.number().int().positive(), title: z.string().optional(), max_marks: z.number().positive() });
    const body = schema.parse(req.body);

    const ins = await query(`
      INSERT INTO assessment_items (component_id, item_no, title, max_marks)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (component_id, item_no) DO UPDATE SET title=EXCLUDED.title, max_marks=EXCLUDED.max_marks
      RETURNING *`,
      [componentId, body.item_no, body.title || null, body.max_marks]
    );
    res.json({ item: ins.rows[0] });
  } catch(e){ next(e); }
});

/** Map item -> CLO (supports weight) */
router.post("/assessment/items/:itemId/map-clo", async (req,res,next)=> {
  try{
    const itemId = Number(req.params.itemId);
    const schema = z.object({ clo_id: z.number().int(), weight: z.number().optional() });
    const body = schema.parse(req.body);

    const ins = await query(`
      INSERT INTO item_clo_map (item_id, clo_id, weight)
      VALUES ($1,$2,COALESCE($3,1.0))
      ON CONFLICT (item_id, clo_id) DO UPDATE SET weight=EXCLUDED.weight
      RETURNING *`,
      [itemId, body.clo_id, body.weight ?? 1.0]
    );
    res.json({ map: ins.rows[0] });
  } catch(e){ next(e); }
});

/** Manual item marks entry */
router.post("/marks/item", async (req,res,next)=> {
  try{
    const schema = z.object({
      student_id: z.string(),
      course_code: z.string(),
      batch_year: z.number().int(),
      semester_no: z.number().int(),
      component_type: z.enum(["MID","FINAL","QUIZ","ASSIGNMENT","VIVA","OEL"]),
      item_no: z.number().int(),
      obtained: z.number()
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

    const comp = await query(`
      SELECT ai.id as item_id
      FROM assessment_plans ap
      JOIN assessment_components ac ON ac.plan_id = ap.id
      JOIN assessment_items ai ON ai.component_id = ac.id
      WHERE ap.course_code=$1 AND ap.batch_id=$2 AND ap.semester_no=$3
        AND ac.type=$4 AND ai.item_no=$5
      LIMIT 1
    `, [body.course_code, batchId, body.semester_no, body.component_type, body.item_no]);
    const itemId = comp.rows[0]?.item_id;
    if(!itemId) return res.status(404).json({ message:"Assessment item not found (plan/component/item)" });

    await query(`
      INSERT INTO item_marks (student_user_id, item_id, obtained, created_by)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (student_user_id, item_id) DO UPDATE SET obtained=EXCLUDED.obtained, created_by=EXCLUDED.created_by, created_at=now()
    `, [studentUserId, itemId, body.obtained, req.user.userId]);

    // recompute CLO+GA+alerts
    await recomputeCLOAttainment({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });
    await recomputeGAAttainmentAndAlerts({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });

    res.json({ ok:true });
  } catch(e){ next(e); }
});

/** Upload CSV for item marks */
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
        semester_no: z.coerce.number().int(),
        component_type: z.enum(["MID","FINAL","QUIZ","ASSIGNMENT","VIVA","OEL"]),
        item_no: z.coerce.number().int(),
        obtained: z.coerce.number()
      });
      const body = schema.parse(row);

      const b = await query(`SELECT id FROM batches WHERE batch_year=$1 AND program='BSCS'`, [body.batch_year]);
      const batchId = b.rows[0]?.id;
      if(!batchId) continue;

      const stu = await query(`SELECT user_id FROM students WHERE student_id=$1 AND batch_id=$2`, [body.student_id, batchId]);
      const studentUserId = stu.rows[0]?.user_id;
      if(!studentUserId) continue;

      const item = await query(`
        SELECT ai.id as item_id
        FROM assessment_plans ap
        JOIN assessment_components ac ON ac.plan_id = ap.id
        JOIN assessment_items ai ON ai.component_id = ac.id
        WHERE ap.course_code=$1 AND ap.batch_id=$2 AND ap.semester_no=$3
          AND ac.type=$4 AND ai.item_no=$5
        LIMIT 1
      `, [body.course_code, batchId, body.semester_no, body.component_type, body.item_no]);
      const itemId = item.rows[0]?.item_id;
      if(!itemId) continue;

      await query(`
        INSERT INTO item_marks (student_user_id, item_id, obtained, created_by)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (student_user_id, item_id) DO UPDATE SET obtained=EXCLUDED.obtained, created_by=EXCLUDED.created_by, created_at=now()
      `, [studentUserId, itemId, body.obtained, req.user.userId]);

      await recomputeCLOAttainment({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });
      await recomputeGAAttainmentAndAlerts({ studentUserId, courseCode: body.course_code, batchId, semesterNo: body.semester_no });

      // also compute course overall % and store course_grades (optional step each upload)
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
    if(!courseCode || !batchYear || !semesterNo) return res.status(400).json({ message:"courseCode,batchYear,semesterNo required" });

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
  // total obtained across all items in this plan / total max
  const { rows } = await query(`
    SELECT
      SUM(im.obtained) AS obtained,
      SUM(ai.max_marks) AS total
    FROM item_marks im
    JOIN assessment_items ai ON ai.id = im.item_id
    JOIN assessment_components ac ON ac.id = ai.component_id
    JOIN assessment_plans ap ON ap.id = ac.plan_id
    WHERE im.student_user_id=$1 AND ap.course_code=$2 AND ap.batch_id=$3 AND ap.semester_no=$4
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
