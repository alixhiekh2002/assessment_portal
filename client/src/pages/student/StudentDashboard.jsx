import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { Typography, Paper, Alert, Stack, Box, Chip } from "@mui/material";

export default function StudentDashboard() {
  const [semesterNo, setSemesterNo] = useState(1);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
        try {
        const semRes = await api.get("/student/results/semesters");
        const semesters = semRes.data.semesters || [];
        const latest = semesters.length ? semesters[semesters.length - 1] : 1;
        setSemesterNo(latest);
        const res = await api.get("/student/results/semester", { params: { semesterNo: latest } });
        setResults(res.data.results || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load dashboard");
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const scored = results.filter((r) => typeof r.percentage === "number");
    const avg = scored.length
      ? Math.round((scored.reduce((sum, r) => sum + r.percentage, 0) / scored.length) * 100) / 100
      : 0;
    return {
      avg,
      totalCourses: results.length,
      gradedCourses: scored.length
    };
  }, [results]);

  return (
    <Paper sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
          Student Dashboard
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Course performance overview (Sem {semesterNo})
        </Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ flex: 1, p: 2, borderRadius: 1, border: "1px solid #eee" }}>
            <Typography variant="overline">Average %</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.avg || "-"}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 2, borderRadius: 1, border: "1px solid #eee" }}>
            <Typography variant="overline">Courses</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.gradedCourses}/{stats.totalCourses}</Typography>
          </Box>
          <Box sx={{ flex: 2, p: 2, borderRadius: 1, border: "1px solid #eee" }}>
            <Typography variant="overline">Latest Status</Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              Keep your scores above 50% to avoid GA alerts.
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={2}>
          {results.map((r, idx) => {
            const pct = Number(r.percentage || 0);
            const label = r.letter_grade || "-";
            const grad = pct >= 80 ? "linear-gradient(90deg,#22c55e,#16a34a)" :
              pct >= 60 ? "linear-gradient(90deg,#38bdf8,#0ea5e9)" :
              pct >= 50 ? "linear-gradient(90deg,#f59e0b,#d97706)" :
              "linear-gradient(90deg,#f87171,#ef4444)";
            return (
              <Box
                key={r.course_code}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  background: "#fff",
                  border: "1px solid #eee",
                  animation: "fadeUp 600ms ease-out both",
                  animationDelay: `${idx * 80}ms`
                }}
              >
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "center" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {r.course_code} — {r.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#666" }}>
                      Percentage: {r.percentage ?? "-"}% | GP {r.grade_points ?? "-"}
                    </Typography>
                    <Box sx={{ height: 10, background: "#e0e0e0", borderRadius: 6, overflow: "hidden", mt: 1 }}>
                      <Box sx={{ width: `${pct}%`, height: "100%", background: grad }} />
                    </Box>
                  </Box>
                  <Chip
                    label={label}
                    sx={{
                      fontWeight: 700,
                      color: "#0b1220",
                      background: pct >= 50 ? "#bbdefb" : "#ffcdd2"
                    }}
                  />
                </Stack>
              </Box>
            );
          })}
          {results.length === 0 && (
            <Typography variant="body2">No results available yet.</Typography>
          )}
        </Stack>
    </Paper>
  );
}
