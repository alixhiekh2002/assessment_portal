import React, { useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, TextField, Button, Alert, Stack } from "@mui/material";

export default function FacultyAssessmentPlan() {
  const [courseCode, setCourseCode] = useState("CMC111");
  const [batchYear, setBatchYear] = useState(2026);
  const [semesterNo, setSemesterNo] = useState(1);
  const [componentsJson, setComponentsJson] = useState(JSON.stringify([
    { type: "MID", total_marks: 25 },
    { type: "FINAL", total_marks: 50 },
    { type: "QUIZ", total_marks: 10 },
    { type: "ASSIGNMENT", total_marks: 10 },
    { type: "VIVA", total_marks: 5 }
  ], null, 2));
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const savePlan = async () => {
    setMsg(""); setErr("");
    try {
      const components = JSON.parse(componentsJson);
      await api.post("/faculty/assessment-plan", {
        course_code: courseCode,
        batch_year: Number(batchYear),
        semester_no: Number(semesterNo),
        components
      });
      setMsg("Assessment plan saved. Now add items/questions from backend endpoints.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Assessment Plan</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2} sx={{ maxWidth: 700 }}>
        <TextField label="Course Code" value={courseCode} onChange={(e)=>setCourseCode(e.target.value)} />
        <TextField label="Batch Year" type="number" value={batchYear} onChange={(e)=>setBatchYear(e.target.value)} />
        <TextField label="Semester No" type="number" value={semesterNo} onChange={(e)=>setSemesterNo(e.target.value)} />
        <TextField
          label="Components JSON"
          multiline
          minRows={8}
          value={componentsJson}
          onChange={(e)=>setComponentsJson(e.target.value)}
        />
        <Button variant="contained" onClick={savePlan}>Save Plan</Button>

        <Typography variant="caption">
          Items/questions and item→CLO mapping endpoints:
          POST /api/faculty/assessment/components/:componentId/items
          POST /api/faculty/assessment/items/:itemId/map-clo
        </Typography>
      </Stack>
    </Paper>
  );
}
