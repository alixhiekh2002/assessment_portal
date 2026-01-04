import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import {
  Paper, Typography, TextField, Button, Alert, Stack, Table, TableHead, TableRow, TableCell, TableBody, MenuItem, Box
} from "@mui/material";

export default function StudentResults() {
  const [semesterNo, setSemesterNo] = useState(1);
  const [semesters, setSemesters] = useState([]);
  const [courseCode, setCourseCode] = useState("");
  const [semesterResults, setSemesterResults] = useState([]);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const loadSemesters = async () => {
    try {
      const { data } = await api.get("/student/results/semesters");
      const list = data.semesters || [];
      setSemesters(list);
      if (list.length && !list.includes(semesterNo)) {
        setSemesterNo(list[list.length - 1]);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load semesters");
    }
  };

  const loadSemesterResults = async () => {
    setErr("");
    try {
      const res = await api.get("/student/results/semester", { params: { semesterNo: Number(semesterNo) } });
      const list = res.data.results || [];
      setSemesterResults(list);
      if (!courseCode && list.length) setCourseCode(list[0].course_code);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load results");
    }
  };

  const loadCourseDetails = async () => {
    if (!courseCode) return;
    setErr("");
    try {
      const res = await api.get("/student/results", { params: { courseCode } });
      setData(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load course details");
    }
  };

  useEffect(() => { loadSemesters(); }, []);
  useEffect(() => { loadSemesterResults(); }, [semesterNo]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Results</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack direction={{ xs:"column", sm:"row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Semester No"
          value={semesterNo}
          onChange={(e)=>setSemesterNo(Number(e.target.value))}
          inputProps={{ min: 1 }}
          sx={{ minWidth: 160 }}
        >
          {semesters.length === 0 && <MenuItem value={semesterNo}>Sem {semesterNo}</MenuItem>}
          {semesters.map((s) => (
            <MenuItem key={s} value={s}>Sem {s}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={loadSemesterResults}>Load Semester</Button>
      </Stack>

      <Typography variant="subtitle1" sx={{ mt: 2 }}>Course Results (Sem {semesterNo})</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Course</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Percentage</TableCell>
            <TableCell>Grade</TableCell>
            <TableCell>Grade Points</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {semesterResults.map((r) => (
            <TableRow key={r.course_code}>
              <TableCell>{r.course_code}</TableCell>
              <TableCell>{r.title}</TableCell>
              <TableCell>{r.percentage ?? "-"}</TableCell>
              <TableCell>{r.letter_grade ?? "-"}</TableCell>
              <TableCell>{r.grade_points ?? "-"}</TableCell>
            </TableRow>
          ))}
          {semesterResults.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No results for this semester.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Stack direction={{ xs:"column", sm:"row" }} spacing={2} sx={{ mt: 3 }}>
        <TextField
          select
          label="Course"
          value={courseCode}
          onChange={(e)=>setCourseCode(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          {semesterResults.map((r) => (
            <MenuItem key={r.course_code} value={r.course_code}>
              {r.course_code} - {r.title}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" onClick={loadCourseDetails} disabled={!courseCode}>Load CLO/GA</Button>
      </Stack>

      {data && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 3 }}>CLO Attainment</Typography>
          {data.clo?.length ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {data.clo.map((c) => {
                const pct = Number(c.percentage || 0);
                return (
                  <Box key={`${c.clo_id}-${c.percentage}`} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="body2" sx={{ width: 90 }}>CLO{c.clo_no}</Typography>
                    <Box sx={{ flex: 1, height: 10, background: "#e0e0e0", borderRadius: 6, overflow: "hidden" }}>
                      <Box sx={{ width: `${pct}%`, height: "100%", background: "#1976d2" }} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 60 }}>{pct}%</Typography>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography variant="body2">No CLO data</Typography>
          )}

          <Typography variant="subtitle1" sx={{ mt: 3 }}>GA Attainment</Typography>
          {data.ga?.length ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {data.ga.map((g) => {
                const pct = Number(g.percentage || 0);
                const color = pct < 50 ? "#e53935" : "#2e7d32";
                return (
                  <Box key={`${g.ga_code}-${g.percentage}`} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="body2" sx={{ width: 90 }}>{g.ga_code}</Typography>
                    <Box sx={{ flex: 1, height: 10, background: "#e0e0e0", borderRadius: 6, overflow: "hidden" }}>
                      <Box sx={{ width: `${pct}%`, height: "100%", background: color }} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 60 }}>{pct}%</Typography>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography variant="body2">No GA data</Typography>
          )}
        </>
      )}
    </Paper>
  );
}
