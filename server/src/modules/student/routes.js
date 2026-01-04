import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { query } from "../../db.js";

const router = Router();
router.use(auth, requireRole("STUDENT"));

router.get("/courses", async (req,res,next)=> {
  try{
    const { rows } = await query(`
      SELECT e.course_code, c.title, e.semester_no, e.status
      FROM enrollments e
      JOIN courses c ON c.code = e.course_code
      WHERE e.student_user_id=$1
      ORDER BY e.semester_no, e.course_code
    `, [req.user.userId]);
    res.json({ courses: rows });
  } catch(e){ next(e); }
});

router.get("/results", async (req,res,next)=> {
  try{
    const courseCode = String(req.query.courseCode || "");
    if(!courseCode) return res.status(400).json({ message:"courseCode required" });

    const ga = await query(`
      SELECT ga_code, percentage
      FROM ga_attainment
      WHERE student_user_id=$1 AND course_code=$2
      ORDER BY semester_no DESC, ga_code
    `, [req.user.userId, courseCode]);

    const clo = await query(`
      SELECT ca.semester_no, c.clo_no, c.title, ca.percentage
      FROM clo_attainment ca
      JOIN clos c ON c.id = ca.clo_id
      WHERE ca.student_user_id=$1 AND ca.course_code=$2
      ORDER BY ca.semester_no DESC, c.clo_no
    `, [req.user.userId, courseCode]);

    const grade = await query(`
      SELECT semester_no, percentage, letter_grade, grade_points
      FROM course_grades
      WHERE student_user_id=$1 AND course_code=$2
      ORDER BY semester_no DESC
    `, [req.user.userId, courseCode]);

    res.json({ ga: ga.rows, clo: clo.rows, grade: grade.rows });
  } catch(e){ next(e); }
});

export default router;
