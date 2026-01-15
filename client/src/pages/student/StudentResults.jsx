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
  const [semesterGa, setSemesterGa] = useState([]);
  const [yearlyGa, setYearlyGa] = useState([]);
  const [yearlySemesters, setYearlySemesters] = useState([]);
  const [yearlyMessage, setYearlyMessage] = useState("");
  const [showSemesterGa, setShowSemesterGa] = useState(false);
  const [showYearlyGa, setShowYearlyGa] = useState(false);
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

  const loadSemesterGa = async () => {
    setErr("");
    try {
      const res = await api.get("/student/results/semester-ga", { params: { semesterNo: Number(semesterNo) } });
      setSemesterGa(res.data.ga || []);
      setShowSemesterGa(true);
      setShowYearlyGa(false);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load semester GA");
    }
  };

  const loadYearlyGa = async () => {
    setErr("");
    try {
      const res = await api.get("/student/results/yearly-ga", { params: { semesterNo: Number(semesterNo) } });
      setYearlyGa(res.data.ga || []);
      setShowYearlyGa(true);
      setShowSemesterGa(false);
      setYearlySemesters(res.data.semesters || []);
      setYearlyMessage(res.data.message || "");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load yearly GA");
    }
  };

  useEffect(() => { loadSemesters(); }, []);
  useEffect(() => { loadSemesterResults(); }, [semesterNo]);
  useEffect(() => { setSemesterGa([]); setShowSemesterGa(false); }, [semesterNo]);
  useEffect(() => { setYearlyGa([]); setYearlySemesters([]); setYearlyMessage(""); setShowYearlyGa(false); }, [semesterNo]);

  const gaBarFills = [
    "linear-gradient(90deg, #6ec1e4, #9ee3f7)",
    "linear-gradient(90deg, #f3a6a6, #f7c3c3)",
    "linear-gradient(90deg, #8fd0a8, #b9e6c9)",
    "linear-gradient(90deg, #f6c27a, #ffd7a3)",
    "linear-gradient(90deg, #a3c6f3, #c7ddfb)",
    "linear-gradient(90deg, #f0b48c, #f7d2b9)"
  ];

  const renderGaBars = (list, colorOffset = 0) => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      {list.map((g, idx) => {
        const pct = Number(g.percentage || 0);
        const safePct = Math.max(0, Math.min(100, pct));
        const fill = gaBarFills[(idx + colorOffset) % gaBarFills.length];
        return (
          <Box key={`${g.ga_code}-${g.percentage}`} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 90 }}>
              <Typography variant="subtitle1" sx={{ color: "#6b7280", fontWeight: 700 }}>
                {g.ga_code}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, position: "relative", height: 26, borderRadius: 999, background: "#d7d7d7", overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.12)" }}>
              <Box sx={{ width: `${safePct}%`, height: "100%", background: fill }} />
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: `calc(${safePct}% - 11px)`,
                  transform: "translateY(-50%)",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                  border: "2px solid rgba(255,255,255,0.8)"
                }}
              />
              <Typography
                variant="subtitle2"
                sx={{
                  position: "absolute",
                  right: 34,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#1f2937",
                  fontWeight: 700,
                  textShadow: "0 1px 2px rgba(255,255,255,0.6)"
                }}
              >
                {safePct}%
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );

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
        <Button variant="outlined" onClick={loadSemesterGa}>View Semester GA</Button>
        <Button variant="outlined" onClick={loadYearlyGa}>View Yearly GA</Button>
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

      {showSemesterGa && (
      <Box sx={{ mt: 3, p: 2, borderRadius: 2, border: "1px solid #e6e6e6", background: "linear-gradient(135deg, #fff8ee 0%, #f1f7ff 100%)" }}>
        <Typography variant="subtitle1">Semester GA Attainment (Sem {semesterNo})</Typography>
        <Typography variant="caption" sx={{ display: "block", color: "#666" }}>
          Average GA across courses in this semester.
        </Typography>
        {semesterGa.length ? (
          renderGaBars(semesterGa, 0)
        ) : (
          <Typography variant="body2" sx={{ mt: 1 }}>No semester GA data yet.</Typography>
        )}
      </Box>
      )}

      {showYearlyGa && (
      <Box sx={{ mt: 3, p: 2, borderRadius: 2, border: "1px solid #e6e6e6", background: "linear-gradient(135deg, #f1fff7 0%, #fff1f7 100%)" }}>
        <Typography variant="subtitle1">
          Yearly GA Attainment
          {yearlySemesters.length ? ` (Sem ${yearlySemesters.join(", ")})` : ""}
        </Typography>
        <Typography variant="caption" sx={{ display: "block", color: "#666" }}>
          Average GA across the academic year (includes summer if available).
        </Typography>
        {yearlyGa.length ? (
          renderGaBars(yearlyGa, 2)
        ) : (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {yearlyMessage || "No yearly GA data yet."}
          </Typography>
        )}
      </Box>
      )}

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
