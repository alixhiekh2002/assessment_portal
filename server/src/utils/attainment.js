import { query } from "../db.js";

/**
 * Recompute CLO attainment for a given course offering (batch+semester) for a student.
 * Uses item_marks + item_clo_map + assessment_items (max_marks).
 */
export async function recomputeCLOAttainment({ studentUserId, courseCode, batchId, semesterNo }) {
  // For each CLO in this course, compute sum(obtained*weight)/sum(max*weight) *100
  const sql = `
    WITH mapped AS (
      SELECT
        icm.clo_id,
        im.obtained,
        ai.max_marks,
        icm.weight
      FROM item_marks im
      JOIN assessment_items ai ON ai.id = im.item_id
      JOIN assessment_components ac ON ac.id = ai.component_id
      JOIN assessment_plans ap ON ap.id = ac.plan_id
      JOIN item_clo_map icm ON icm.item_id = ai.id
      WHERE im.student_user_id = $1
        AND ap.course_code = $2
        AND ap.batch_id = $3
        AND ap.semester_no = $4
    ),
    agg AS (
      SELECT
        clo_id,
        SUM(obtained * weight) AS num,
        SUM(max_marks * weight) AS den
      FROM mapped
      GROUP BY clo_id
    )
    SELECT clo_id,
           CASE WHEN den = 0 THEN 0 ELSE ROUND((num/den)*100, 2) END AS percentage
    FROM agg;
  `;
  const { rows } = await query(sql, [studentUserId, courseCode, batchId, semesterNo]);

  // Upsert into clo_attainment
  for (const r of rows) {
    await query(
      `INSERT INTO clo_attainment (student_user_id, course_code, batch_id, semester_no, clo_id, percentage)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (student_user_id, course_code, batch_id, semester_no, clo_id)
       DO UPDATE SET percentage=EXCLUDED.percentage, updated_at=now()`,
      [studentUserId, courseCode, batchId, semesterNo, r.clo_id, r.percentage]
    );
  }
  return rows;
}

/**
 * Recompute GA attainment for a student in a course offering using clo_attainment + clo_ga_map weights.
 */
export async function recomputeGAAttainmentAndAlerts({ studentUserId, courseCode, batchId, semesterNo }) {
  // Find HOD for CS (single HOD). We store hod user in table hods.
  const hodRes = await query(`
    SELECT u.id as hod_user_id
    FROM hods h
    JOIN users u ON u.id = h.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE r.name='HOD'
    LIMIT 1
  `, []);
  const hodUserId = hodRes.rows?.[0]?.hod_user_id;

  const gaSql = `
    WITH clo_pct AS (
      SELECT ca.clo_id, ca.percentage
      FROM clo_attainment ca
      WHERE ca.student_user_id=$1 AND ca.course_code=$2 AND ca.batch_id=$3 AND ca.semester_no=$4
    ),
    mapped AS (
      SELECT cgm.ga_code,
             cp.percentage,
             cgm.weight
      FROM clo_pct cp
      JOIN clo_ga_map cgm ON cgm.clo_id = cp.clo_id
    ),
    agg AS (
      SELECT ga_code,
             SUM(percentage * weight) AS num,
             SUM(weight) AS den
      FROM mapped
      GROUP BY ga_code
    )
    SELECT ga_code,
           CASE WHEN den = 0 THEN 0 ELSE ROUND(num/den, 2) END AS percentage
    FROM agg;
  `;
  const { rows } = await query(gaSql, [studentUserId, courseCode, batchId, semesterNo]);

  for (const r of rows) {
    await query(
      `INSERT INTO ga_attainment (student_user_id, course_code, batch_id, semester_no, ga_code, percentage)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (student_user_id, course_code, batch_id, semester_no, ga_code)
       DO UPDATE SET percentage=EXCLUDED.percentage, updated_at=now()`,
      [studentUserId, courseCode, batchId, semesterNo, r.ga_code, r.percentage]
    );
  }

  // If any GA < 50 => create alert
  if (hodUserId) {
    const studentInfo = await query(`
      SELECT s.student_id, u.name, b.batch_year
      FROM students s
      JOIN users u ON u.id = s.user_id
      JOIN batches b ON b.id = s.batch_id
      WHERE s.user_id=$1
    `, [studentUserId]);

    const si = studentInfo.rows[0];
    if (si) {
      for (const r of rows) {
        if (Number(r.percentage) < 50) {
          const msg = `${si.name} (${si.student_id}) has NOT achieved ${r.ga_code} in ${courseCode} (GA%=${r.percentage}).`;
          // Avoid duplicate unresolved alerts for same key
          await query(
            `INSERT INTO alerts (hod_user_id, student_user_id, student_id, student_name, batch_year, semester_no, course_code, ga_code, ga_percentage, message)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT DO NOTHING`,
            [hodUserId, studentUserId, si.student_id, si.name, si.batch_year, semesterNo, courseCode, r.ga_code, r.percentage, msg]
          );
        }
      }
    }
  }

  return rows;
}
