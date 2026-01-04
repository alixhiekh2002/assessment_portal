import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, TextField, Button, Alert, Stack, MenuItem } from "@mui/material";

export default function AdminCourses() {
  const [batchYear, setBatchYear] = useState(2026);
  const [semesterNo, setSemesterNo] = useState(1);
  const [courseCode, setCourseCode] = useState("");
  const [courses, setCourses] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setErr("");
      try {
        const { data } = await api.get("/admin/courses", { params: { semesterNo: Number(semesterNo) } });
        if (ignore) return;
        const list = data.courses || [];
        setCourses(list);
        setCourseCode(list[0]?.code || "");
      } catch (e) {
        if (ignore) return;
        setCourses([]);
        setCourseCode("");
        setErr(e?.response?.data?.message || "Failed to load courses");
      }
    };
    if (Number(semesterNo)) load();
    return () => { ignore = true; };
  }, [semesterNo]);

  const add = async () => {
    setMsg(""); setErr("");
    try {
      await api.post("/admin/batch-courses", {
        batch_year: Number(batchYear),
        semester_no: Number(semesterNo),
        course_code: courseCode
      });
      setMsg("Course added to semester.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to add course");
    }
  };

  const remove = async () => {
    setMsg(""); setErr("");
    try {
      await api.delete("/admin/batch-courses", {
        data: {
          batch_year: Number(batchYear),
          semester_no: Number(semesterNo),
          course_code: courseCode
        }
      });
      setMsg("Course removed from semester.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to remove course");
    }
  };

  const canSubmit = Boolean(courseCode);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Manage Courses by Semester</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2} sx={{ maxWidth: 520 }}>
        <TextField label="Batch Year" type="number" value={batchYear} onChange={(e)=>setBatchYear(e.target.value)} />
        <TextField
          label="Semester No"
          type="number"
          value={semesterNo}
          onChange={(e)=>setSemesterNo(e.target.value)}
          inputProps={{ min: 1 }}
        />
        <TextField
          select
          label="Course Code"
          value={courseCode}
          onChange={(e)=>setCourseCode(e.target.value)}
          disabled={courses.length === 0}
        >
          {courses.length === 0 && <MenuItem value="">No courses</MenuItem>}
          {courses.map((c) => (
            <MenuItem key={c.code} value={c.code}>
              {c.code} - {c.title}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={add} disabled={!canSubmit}>Add Course</Button>
          <Button variant="outlined" color="error" onClick={remove} disabled={!canSubmit}>Remove Course</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
