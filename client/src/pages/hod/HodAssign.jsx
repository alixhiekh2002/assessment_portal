import React, { useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, TextField, Button, Alert, Stack } from "@mui/material";

export default function HodAssign() {
  const [facultyUserId, setFacultyUserId] = useState("");
  const [batchYear, setBatchYear] = useState(2026);
  const [semesterNo, setSemesterNo] = useState(1);
  const [courseCode, setCourseCode] = useState("CMC111");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

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
        <TextField label="Faculty User ID (UUID)" value={facultyUserId} onChange={(e)=>setFacultyUserId(e.target.value)} />
        <TextField label="Batch Year" type="number" value={batchYear} onChange={(e)=>setBatchYear(e.target.value)} />
        <TextField label="Semester No" type="number" value={semesterNo} onChange={(e)=>setSemesterNo(e.target.value)} />
        <TextField label="Course Code" value={courseCode} onChange={(e)=>setCourseCode(e.target.value)} />
        <Button variant="contained" onClick={submit}>Assign</Button>
      </Stack>

      <Typography variant="caption" sx={{ display:"block", mt: 2 }}>
        Tip: get Faculty UUID from DB or build a users list page (next step).
      </Typography>
    </Paper>
  );
}
