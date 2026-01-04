-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ROLES
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id INT NOT NULL REFERENCES roles(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  batch_year INT NOT NULL,
  program TEXT DEFAULT 'BSCS',
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(batch_year, program)
);

CREATE TABLE IF NOT EXISTS students (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT UNIQUE NOT NULL,
  batch_id INT NOT NULL REFERENCES batches(id),
  current_semester_no INT NOT NULL DEFAULT 1,
  section TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hods (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  department TEXT
);

CREATE TABLE IF NOT EXISTS faculty (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  department TEXT
);

CREATE TABLE IF NOT EXISTS graduate_attributes (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  is_lab BOOLEAN NOT NULL DEFAULT FALSE,
  semester_no INT NOT NULL,
  credit_hours INT NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS batch_courses (
  id SERIAL PRIMARY KEY,
  batch_id INT NOT NULL REFERENCES batches(id),
  semester_no INT NOT NULL,
  course_code TEXT NOT NULL REFERENCES courses(code),
  UNIQUE(batch_id, semester_no, course_code)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL REFERENCES courses(code),
  semester_no INT NOT NULL,
  batch_id INT NOT NULL REFERENCES batches(id),
  status TEXT NOT NULL DEFAULT 'ENROLLED',
  UNIQUE(student_user_id, course_code, semester_no, batch_id)
);

CREATE TABLE IF NOT EXISTS course_assignments (
  id SERIAL PRIMARY KEY,
  hod_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  faculty_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id INT NOT NULL REFERENCES batches(id),
  semester_no INT NOT NULL,
  course_code TEXT NOT NULL REFERENCES courses(code),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(faculty_user_id, batch_id, semester_no, course_code)
);

CREATE TABLE IF NOT EXISTS clos (
  id SERIAL PRIMARY KEY,
  course_code TEXT NOT NULL REFERENCES courses(code),
  title TEXT NOT NULL,
  clo_no INT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  UNIQUE(course_code, clo_no)
);

CREATE TABLE IF NOT EXISTS clo_ga_map (
  id SERIAL PRIMARY KEY,
  clo_id INT NOT NULL REFERENCES clos(id) ON DELETE CASCADE,
  ga_code TEXT NOT NULL REFERENCES graduate_attributes(code),
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  UNIQUE(clo_id, ga_code)
);

CREATE TABLE IF NOT EXISTS assessment_plans (
  id SERIAL PRIMARY KEY,
  course_code TEXT NOT NULL REFERENCES courses(code),
  batch_id INT NOT NULL REFERENCES batches(id),
  semester_no INT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(course_code, batch_id, semester_no)
);

CREATE TABLE IF NOT EXISTS assessment_components (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES assessment_plans(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  total_marks INT NOT NULL,
  UNIQUE(plan_id, type)
);

CREATE TABLE IF NOT EXISTS assessment_items (
  id SERIAL PRIMARY KEY,
  component_id INT NOT NULL REFERENCES assessment_components(id) ON DELETE CASCADE,
  item_no INT NOT NULL,
  title TEXT,
  max_marks INT NOT NULL,
  UNIQUE(component_id, item_no)
);

CREATE TABLE IF NOT EXISTS item_clo_map (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
  clo_id INT NOT NULL REFERENCES clos(id) ON DELETE CASCADE,
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  UNIQUE(item_id, clo_id)
);

CREATE TABLE IF NOT EXISTS item_marks (
  id SERIAL PRIMARY KEY,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
  obtained NUMERIC(6,2) NOT NULL CHECK(obtained >= 0),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(student_user_id, item_id)
);

CREATE TABLE IF NOT EXISTS clo_attainment (
  id SERIAL PRIMARY KEY,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL REFERENCES courses(code),
  batch_id INT NOT NULL REFERENCES batches(id),
  semester_no INT NOT NULL,
  clo_id INT NOT NULL REFERENCES clos(id),
  percentage NUMERIC(5,2) NOT NULL,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(student_user_id, course_code, batch_id, semester_no, clo_id)
);

CREATE TABLE IF NOT EXISTS ga_attainment (
  id SERIAL PRIMARY KEY,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL REFERENCES courses(code),
  batch_id INT NOT NULL REFERENCES batches(id),
  semester_no INT NOT NULL,
  ga_code TEXT NOT NULL REFERENCES graduate_attributes(code),
  percentage NUMERIC(5,2) NOT NULL,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(student_user_id, course_code, batch_id, semester_no, ga_code)
);

CREATE TABLE IF NOT EXISTS course_grades (
  id SERIAL PRIMARY KEY,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL REFERENCES courses(code),
  batch_id INT NOT NULL REFERENCES batches(id),
  semester_no INT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  letter_grade TEXT NOT NULL,
  grade_points NUMERIC(3,2) NOT NULL,
  UNIQUE(student_user_id, course_code, batch_id, semester_no)
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  hod_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  batch_year INT NOT NULL,
  semester_no INT NOT NULL,
  course_code TEXT NOT NULL,
  ga_code TEXT NOT NULL,
  ga_percentage NUMERIC(5,2) NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

-- Prevent duplicates (unresolved) by a unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_key
ON alerts (hod_user_id, student_user_id, batch_year, semester_no, course_code, ga_code, is_resolved)
WHERE is_resolved = false;
