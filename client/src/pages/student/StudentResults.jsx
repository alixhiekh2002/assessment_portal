import React, { useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, TextField, Button, Alert, Stack, Chip } from "@mui/material";

export default function StudentResults() {
  const [courseCode, setCourseCode] = useState("CMC111");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const res = await api.get("/student/results", { params: { courseCode } });
      setData(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Results</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack direction={{ xs:"column", sm:"row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Course Code" value={courseCode} onChange={(e)=>setCourseCode(e.target.value)} />
        <Button variant="contained" onClick={load}>Load</Button>
      </Stack>

      {data && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>GA Attainment</Typography>
          {data.ga?.length ? data.ga.map(g => (
            <Chip key={`${g.ga_code}-${g.percentage}-${g.semester_no || ""}`}
              label={`${g.ga_code}: ${g.percentage}%`}
              color={Number(g.percentage) < 50 ? "error" : "success"}
              size="small"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          )) : <Typography variant="body2">No GA data</Typography>}

          <Typography variant="subtitle1" sx={{ mt: 2 }}>Course Grade</Typography>
          {data.grade?.length ? data.grade.map(gr => (
            <Chip key={`${gr.semester_no}-${gr.letter_grade}`}
              label={`Sem ${gr.semester_no}: ${gr.letter_grade} (${gr.percentage}%)`}
              size="small"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          )) : <Typography variant="body2">No grade data</Typography>}
        </>
      )}
    </Paper>
  );
}
