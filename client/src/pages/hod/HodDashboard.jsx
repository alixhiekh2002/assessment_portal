import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import {
  Typography, Paper, Alert, Stack, Box, Button, Table, TableHead, TableRow, TableCell, TableBody
} from "@mui/material";

export default function HodDashboard() {
  const nav = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [facultyCount, setFacultyCount] = useState(0);
  const [department, setDepartment] = useState("CS");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const [alertsRes, batchesRes, summaryRes] = await Promise.all([
          api.get("/hod/alerts"),
          api.get("/hod/batches"),
          api.get("/hod/summary")
        ]);
        setAlerts(alertsRes.data.alerts || []);
        setBatches(batchesRes.data.batches || []);
        setFacultyCount(summaryRes.data.facultyCount || 0);
        setDepartment(summaryRes.data.department || "CS");
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load dashboard data");
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const unresolved = alerts.filter((a) => !a.is_resolved).length;
    return {
      totalAlerts: alerts.length,
      unresolved,
      batches: batches.length
    };
  }, [alerts, batches]);

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>HOD Dashboard</Typography>
        <Typography variant="body2">Monitor alerts, batches, and assignments.</Typography>
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Box sx={{ flex: 1, p: 2, borderRadius: 1, border: "1px solid #eee" }}>
          <Typography variant="overline">Total Alerts</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.totalAlerts}</Typography>
        </Box>
        <Box sx={{ flex: 1, p: 2, borderRadius: 1, border: "1px solid #eee" }}>
          <Typography variant="overline">Unresolved</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.unresolved}</Typography>
        </Box>
        <Box sx={{ flex: 1, p: 2, borderRadius: 1, border: "1px solid #eee" }}>
          <Typography variant="overline">Batches</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.batches}</Typography>
        </Box>
        <Box
          sx={{ flex: 1, p: 2, borderRadius: 1, border: "1px solid #eee", cursor: "pointer" }}
          onClick={() => nav("/hod/faculty")}
        >
          <Typography variant="overline">Faculty ({department})</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{facultyCount}</Typography>
        </Box>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Quick Actions</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button variant="contained" onClick={() => nav("/hod/assign")}>Assign Faculty</Button>
          <Button variant="outlined" onClick={() => nav("/hod/alerts")}>View Alerts</Button>
          <Button variant="outlined" onClick={() => nav("/hod/batches")}>Browse Batches</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Recent Alerts</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>GA</TableCell>
              <TableCell>Percent</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.slice(0, 8).map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.student_name} ({a.student_id})</TableCell>
                <TableCell>{a.course_code}</TableCell>
                <TableCell>{a.ga_code}</TableCell>
                <TableCell>{a.ga_percentage}%</TableCell>
                <TableCell>{a.is_resolved ? "Resolved" : "Open"}</TableCell>
              </TableRow>
            ))}
            {alerts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No alerts.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
