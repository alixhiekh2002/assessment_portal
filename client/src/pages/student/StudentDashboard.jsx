import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import {
  Typography, Paper, Alert, Stack, Box, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, IconButton
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function StudentDashboard() {
  const [semesterNo, setSemesterNo] = useState(1);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const submitPassword = async () => {
    setErr(""); setMsg("");
    if (!currentPassword || !newPassword) {
      setErr("Please fill all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("New password and confirm password do not match");
      return;
    }
    try {
      await api.patch("/student/password", { currentPassword, newPassword });
      setMsg("Password updated successfully");
      setPwdOpen(false);
      resetPasswordForm();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update password");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Student Dashboard
          </Typography>
          <Button variant="outlined" onClick={() => { setErr(""); setMsg(""); setPwdOpen(true); }}>
            Change Password
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Course performance overview (Sem {semesterNo})
        </Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}

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

        <Dialog open={pwdOpen} onClose={() => { setPwdOpen(false); resetPasswordForm(); }}>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
              <TextField
                label="Current Password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e)=>setCurrentPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showCurrent ? "Hide password" : "Show password"}
                        onClick={() => setShowCurrent((prev) => !prev)}
                        edge="end"
                      >
                        {showCurrent ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                label="New Password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e)=>setNewPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showNew ? "Hide password" : "Show password"}
                        onClick={() => setShowNew((prev) => !prev)}
                        edge="end"
                      >
                        {showNew ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                label="Confirm New Password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e)=>setConfirmPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                        onClick={() => setShowConfirm((prev) => !prev)}
                        edge="end"
                      >
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setPwdOpen(false); resetPasswordForm(); }}>Cancel</Button>
            <Button variant="contained" onClick={submitPassword}>Update Password</Button>
          </DialogActions>
        </Dialog>
    </Paper>
  );
}
