import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, TextField, Button, Alert, Stack, MenuItem } from "@mui/material";

export default function HodAssign() {
  const [facultyUserId, setFacultyUserId] = useState("");
  const [batchYear, setBatchYear] = useState(2026);
  const [semesterNo, setSemesterNo] = useState(1);
  const [courseCode, setCourseCode] = useState("CMC111");
  const [faculty, setFaculty] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/hod/faculty");
        setFaculty(data.faculty || []);
        const batchesRes = await api.get("/hod/batches");
        const batchList = batchesRes.data.batches || [];
        setBatches(batchList);
        if (batchList.length) {
          const latest = batchList[0].batch_year;
          if (!batchList.some((b) => b.batch_year === batchYear)) {
            setBatchYear(latest);
          }
        }
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load faculty list");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const { data } = await api.get("/hod/batch-courses", {
          params: { batchYear: Number(batchYear), semesterNo: Number(semesterNo) }
        });
        const list = data.courses || [];
        setCourses(list);
        setCourseCode(list[0]?.code || "");
      } catch (e) {
        setCourses([]);
        setCourseCode("");
        setErr(e?.response?.data?.message || "Failed to load courses");
      }
    })();
  }, [batchYear, semesterNo]);

  const submit = async () => {
    setMsg(""); setErr("");
    try {
      const { data } = await api.post("/hod/assign-course", {
        faculty_user_id: facultyUserId,
        batch_year: Number(batchYear),
        semester_no: Number(semesterNo),
        course_code: courseCode
      });
      setMsg("Assigned successfully");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Assign Faculty to Courses</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2} sx={{ maxWidth: 520 }}>
        <TextField
          select
          label="Faculty ID"
          value={facultyUserId}
          onChange={(e)=>setFacultyUserId(e.target.value)}
        >
          {faculty.length === 0 && <MenuItem value="">No faculty</MenuItem>}
          {faculty.map((f) => (
            <MenuItem key={f.id} value={f.id}>
              {f.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Batch Year"
          value={batchYear}
          onChange={(e)=>setBatchYear(Number(e.target.value))}
        >
          {batches.length === 0 && <MenuItem value={batchYear}>No batches</MenuItem>}
          {batches.map((b) => (
            <MenuItem key={b.id} value={b.batch_year}>
              {b.batch_year} ({b.program})
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Semester No"
          value={semesterNo}
          onChange={(e)=>setSemesterNo(Number(e.target.value))}
        >
          {[1,2,3,4,5,6,7,8].map((s) => (
            <MenuItem key={s} value={s}>Semester {s}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Course"
          value={courseCode}
          onChange={(e)=>setCourseCode(e.target.value)}
        >
          {courses.length === 0 && <MenuItem value="">No courses</MenuItem>}
          {courses.map((c) => (
            <MenuItem key={c.code} value={c.code}>
              {c.code} - {c.title}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={submit}>Assign</Button>
      </Stack>

      <Typography variant="caption" sx={{ display:"block", mt: 2 }}>
        Tip: use the Faculty ID shared by admin.
      </Typography>
    </Paper>
  );
}
