import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";
import { pool } from "../db.js";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Roles
    const roles = ["ADMIN", "HOD", "FACULTY", "STUDENT"];
    for (const r of roles) {
      await client.query(
        "INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
        [r]
      );
    }

    // GA seed ✅ FIXED (use [ ] not ( ))
    const ga = [
      ["GA1", "Engineering Knowledge"],
      ["GA2", "Problem Analysis"],
      ["GA3", "Design/Development of Solutions"],
      ["GA4", "Investigation"],
      ["GA5", "Modern Tool Usage"],
      ["GA6", "The Engineer and Society"],
      ["GA7", "Environment and Sustainability"],
      ["GA8", "Ethics"],
      ["GA9", "Individual and Team Work"],
      ["GA10", "Communication"],
    ];

    for (const [code, title] of ga) {
      await client.query(
        `INSERT INTO graduate_attributes (code, title)
         VALUES ($1,$2)
         ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title`,
        [code, title]
      );
    }

    // Courses seed ✅ FIXED (use [ ] not ( ))
    const courses = [
      ["CMC111", "Programming Fundamentals", false, 1],
      ["CMC111-L", "Programming Fundamentals (Lab)", true, 1],
      ["GER111", "Application of Information & Communication Technologies", false, 1],
      ["GER111-L", "Application of ICT (Lab)", true, 1],
      ["GER121", "Functional English", false, 1],
      ["GER131", "Calculus and Analytic Geometry", false, 1],
      ["GER151", "Natural Science (Applied Physics)", false, 1],
      ["GER151-L", "Natural Science (Applied Physics) (Lab)", true, 1],
      ["GER141", "Islamic Studies", false, 1],

      ["CMC112", "Object Oriented Programming", false, 2],
      ["MTE111", "Multivariable Calculus", false, 2],
      ["CMC112-L", "Object Oriented Programming (Lab)", true, 2],
      ["CMC121", "Digital Logic Design", false, 2],
      ["CMC121-L", "Digital Logic Design (Lab)", true, 2],
      ["GER122", "Expository Writing", false, 2],
      ["GER132", "Discrete Structures", false, 2],
      ["GER142", "Ideology and Constitution of Pakistan", false, 2],

      ["MTE212", "Probability & Statistics", false, 3],
      ["CMC222", "Computer Organization & Assembly Language", false, 3],
      ["CMC222-L", "Computer Organization & Assembly Language (Lab)", true, 3],
      ["CMC251", "Data Structures", false, 3],
      ["CMC251-L", "Data Structures (Lab)", true, 3],
      ["CSC252", "Theory of Automata", false, 3],
      ["CMC261", "Computer Networks", false, 3],
      ["CMC261-L", "Computer Networks (Lab)", true, 3],

      ["MTE213", "Linear Algebra", false, 4],
      ["MTE221", "Technical & Business Writing", false, 4],
      ["CSC223", "Computer Architecture", false, 4],
      ["CSC223-L", "Computer Architecture (Lab)", true, 4],
      ["CMC241", "Operating Systems", false, 4],
      ["CMC241-L", "Operating Systems (Lab)", true, 4],
      ["CMC253", "Analysis of Algorithms", false, 4],
      ["GERXXX", "Social Science I", false, 4],

      ["CMC331", "Database Systems", false, 5],
      ["CMC331-L", "Database Systems (Lab)", true, 5],
      ["CSC354", "Compiler Construction", false, 5],
      ["CSC354-L", "Compiler Construction (Lab)", true, 5],
      ["CMC362", "Information Security", false, 5],
      ["CMC362-L", "Information Security (Lab)", true, 5],
      ["CMC371", "Software Engineering", false, 5],
      ["CSEXXX", "Domain Elective 1", false, 5],

      ["CSC332", "Advance Database Management Systems", false, 6],
      ["CSC332-L", "Advance Database Management Systems (Lab)", true, 6],
      ["CMC381", "Artificial Intelligence", false, 6],
      ["CMC381-L", "Artificial Intelligence (Lab)", true, 6],
      ["CSC382", "HCI & Computer Graphics", false, 6],
      ["CSC382-L", "HCI & Computer Graphics (Lab)", true, 6],
      ["CSEXXX2", "Domain Elective 2", false, 6],
      ["ESCXXX", "Social Science II", false, 6],

      ["CSC442", "Parallel & Distributed Computing", false, 7],
      ["CSC442-L", "Parallel & Distributed Computing (Lab)", true, 7],
      ["GER462", "Technopreneurship", false, 7],
      ["CMC491", "Final Year Project – I", false, 7],
      ["CSEXXX3", "Domain Elective 3", false, 7],
      ["CSEXXX4", "Domain Elective 4", false, 7],
      ["CSEXXX5", "Domain Elective 5", false, 7],

      ["GER443", "Civics and Community Engagement", false, 8],
      ["GER463", "Professional Practices", false, 8],
      ["CMC492", "Final Year Project – II", false, 8],
      ["CSEXXX6", "Domain Elective 6", false, 8],
      ["CSEXXX7", "Domain Elective 7", false, 8],
    ];

    for (const [code, title, is_lab, semester_no] of courses) {
      await client.query(
        `INSERT INTO courses (code, title, is_lab, semester_no, credit_hours)
         VALUES ($1,$2,$3,$4,3)
         ON CONFLICT (code) DO UPDATE
         SET title=EXCLUDED.title, is_lab=EXCLUDED.is_lab, semester_no=EXCLUDED.semester_no`,
        [code, title, is_lab, semester_no]
      );
    }

    // Batch 2026
    const batchRes = await client.query(
      `INSERT INTO batches (batch_year, program)
       VALUES (2026,'BSCS')
       ON CONFLICT (batch_year, program) DO UPDATE SET program=EXCLUDED.program
       RETURNING id`
    );
    const batchId = batchRes.rows[0].id;

    // Map courses to batch by semester
    for (const [code, , , sem] of courses) {
      await client.query(
        `INSERT INTO batch_courses (batch_id, semester_no, course_code)
         VALUES ($1,$2,$3)
         ON CONFLICT DO NOTHING`,
        [batchId, sem, code]
      );
    }

    const pwd = await bcrypt.hash("Pass@1234", 10);
    const getRoleId = async (name) =>
      (await client.query("SELECT id FROM roles WHERE name=$1", [name])).rows[0].id;

    const adminRole = await getRoleId("ADMIN");
    const hodRole = await getRoleId("HOD");
    const facultyRole = await getRoleId("FACULTY");
    const studentRole = await getRoleId("STUDENT");

    // Admin
    await client.query(
      `INSERT INTO users (role_id, name, email, password_hash)
       VALUES ($1,'Admin CS','admin@cs.edu',$2)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name`,
      [adminRole, pwd]
    );

    // HOD
    const hod = await client.query(
      `INSERT INTO users (role_id, name, email, password_hash)
       VALUES ($1,'HOD CS','hod@cs.edu',$2)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [hodRole, pwd]
    );
    await client.query(
      `INSERT INTO hods (user_id, department)
       VALUES ($1,'CS')
       ON CONFLICT (user_id) DO NOTHING`,
      [hod.rows[0].id]
    );

    // Faculty
    const fac = await client.query(
      `INSERT INTO users (role_id, name, email, password_hash)
       VALUES ($1,'Faculty CS','faculty@cs.edu',$2)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [facultyRole, pwd]
    );
    await client.query(
      `INSERT INTO faculty (user_id, department)
       VALUES ($1,'CS')
       ON CONFLICT (user_id) DO NOTHING`,
      [fac.rows[0].id]
    );

    // Student
    const stu = await client.query(
      `INSERT INTO users (role_id, name, email, password_hash)
       VALUES ($1,'Student One','student@cs.edu',$2)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [studentRole, pwd]
    );
    await client.query(
      `INSERT INTO students (user_id, student_id, batch_id, current_semester_no, section)
       VALUES ($1,'2026-CS-001',$2,1,'A')
       ON CONFLICT (user_id) DO UPDATE
       SET student_id=EXCLUDED.student_id, batch_id=EXCLUDED.batch_id`,
      [stu.rows[0].id, batchId]
    );

    // Auto enroll semester 1 courses for student
    const sem1 = await client.query(
      "SELECT course_code FROM batch_courses WHERE batch_id=$1 AND semester_no=1",
      [batchId]
    );
    for (const c of sem1.rows) {
      await client.query(
        `INSERT INTO enrollments (student_user_id, course_code, semester_no, batch_id, status)
         VALUES ($1,$2,1,$3,'ENROLLED')
         ON CONFLICT DO NOTHING`,
        [stu.rows[0].id, c.course_code, batchId]
      );
    }

    // HOD assigns Faculty to one course (CMC111) for demo
    await client.query(
      `INSERT INTO course_assignments (hod_user_id, faculty_user_id, batch_id, semester_no, course_code)
       VALUES ($1,$2,$3,1,'CMC111')
       ON CONFLICT DO NOTHING`,
      [hod.rows[0].id, fac.rows[0].id, batchId]
    );

    await client.query("COMMIT");
    console.log("✅ Seed completed");
  } catch (e) {
    await pool.query("ROLLBACK");
    console.error("❌ Seed failed", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
