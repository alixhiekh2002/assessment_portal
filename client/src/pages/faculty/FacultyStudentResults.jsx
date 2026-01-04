import React, { useState } from "react";
import { api } from "../../services/api";
import {
  Paper, Typography, TextField, Button, Alert, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, Chip
} from "@mui/material";

export default function FacultyStudentResults() {
  const [courseCode, setCourseCode] = useState("CMC111");
  const [batchYear, setBatchYear] = useState(2026);
  const [semesterNo, setSemesterNo] = useState(1);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const { data } = await api.get("/faculty/student-results", { params: { courseCode, batchYear, semesterNo } });
      setResults(data.results || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Student Results</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack direction={{ xs:"column", sm:"row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Course Code" value={courseCode} onChange={(e)=>setCourseCode(e.target.value)} />
        <TextField label="Batch Year" type="number" value={batchYear} onChange={(e)=>setBatchYear(e.target.value)} />
        <TextField label="Semester No" type="number" value={semesterNo} onChange={(e)=>setSemesterNo(e.target.value)} />
        <Button variant="contained" onClick={load}>Load</Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>CLO Attainment</TableCell>
            <TableCell>GA Attainment</TableCell>
            <TableCell>Grade</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.student_id}>
              <TableCell>
                <Typography variant="subtitle2">{r.name}</Typography>
                <Typography variant="caption">{r.student_id}</Typography>
              </TableCell>

              <TableCell>
                {r.clo?.length ? r.clo.map(c => (
                  <Chip key={c.clo_id} label={`CLO${c.clo_no}: ${c.percentage}%`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                )) : <Typography variant="caption">No data</Typography>}
              </TableCell>

              <TableCell>
                {r.ga?.length ? r.ga.map(g => (
                  <Chip
                    key={g.ga_code}
                    label={`${g.ga_code}: ${g.percentage}%`}
                    size="small"
                    color={Number(g.percentage) < 50 ? "error" : "success"}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                )) : <Typography variant="caption">No data</Typography>}
              </TableCell>

              <TableCell>
                {r.grade ? (
                  <Chip label={`${r.grade.letter_grade} (${r.grade.percentage}%)`} size="small" />
                ) : (
                  <Typography variant="caption">—</Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
          {results.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2">No results loaded yet.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
