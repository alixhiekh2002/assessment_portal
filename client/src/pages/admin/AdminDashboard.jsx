import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import {
  Typography, Paper, Alert, Stack, Table, TableHead, TableRow, TableCell, TableBody, Button, Box
} from "@mui/material";

export default function AdminDashboard() {
  const [hods, setHods] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [err, setErr] = useState("");

  const loadDashboard = async () => {
    setErr("");
    try {
      const { data } = await api.get("/admin/dashboard");
      setHods(data.hods || []);
      setFaculty(data.faculty || []);
      setBatches(data.batches || []);
      setStudentsCount(data.studentsCount || 0);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load dashboard");
    }
  };

  const loadStudents = async (batch) => {
    setErr("");
    try {
      const { data } = await api.get(`/admin/batches/${batch.id}/students`);
      setSelectedBatch(batch);
      setStudents(data.students || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load students");
    }
  };

  const toggleStudents = async (batch) => {
    if (selectedBatch?.id === batch.id) {
      setSelectedBatch(null);
      setStudents([]);
      return;
    }
    await loadStudents(batch);
  };

  useEffect(() => { loadDashboard(); }, []);

  const stats = [
    { label: "HODs", value: hods.length, bg: "#eef6ff", border: "#9ec5f0" },
    { label: "Faculty", value: faculty.length, bg: "#f1fff7", border: "#9fd7b0" },
    { label: "Batches", value: batches.length, bg: "#fff6e6", border: "#f5c07a" },
    { label: "Students", value: studentsCount, bg: "#fff1f7", border: "#f3a6a6" }
  ];

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3, borderRadius: 2, border: "1px solid #e9eef5", background: "linear-gradient(135deg, #f6fbff 0%, #fff7ee 100%)" }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>Admin Dashboard</Typography>
        
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {stats.map((s) => (
          <Box
            key={s.label}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2,
              border: `1px solid ${s.border}`,
              background: s.bg,
              boxShadow: "0 6px 16px rgba(17, 24, 39, 0.06)"
            }}
          >
            <Typography variant="overline" sx={{ color: "#5f6b7a" }}>{s.label}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#111827" }}>{s.value}</Typography>
          </Box>
        ))}
      </Stack>

      <Paper sx={{ p: 3, borderRadius: 2, border: "1px solid #eef2f7" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>HODs</Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f6f8fb" }}>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hods.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{h.name}</TableCell>
                <TableCell>{h.email}</TableCell>
                <TableCell>{h.department || "-"}</TableCell>
              </TableRow>
            ))}
            {hods.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>No HODs found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 2, border: "1px solid #eef2f7" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Faculty</Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f6f8fb" }}>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {faculty.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.name}</TableCell>
                <TableCell>{f.email}</TableCell>
                <TableCell>{f.department || "-"}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={async () => {
                      const ok = window.confirm(`Delete faculty ${f.name}?`);
                      if (!ok) return;
                      setErr("");
                      try {
                        await api.delete(`/admin/users/${f.id}`);
                        await loadDashboard();
                      } catch (e) {
                        setErr(e?.response?.data?.message || "Failed to delete faculty");
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {faculty.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No faculty found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 2, border: "1px solid #eef2f7" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Batches</Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f6f8fb" }}>
              <TableCell sx={{ fontWeight: 600 }}>Batch Year</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Program</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.batch_year}</TableCell>
                <TableCell>{b.program}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" onClick={() => toggleStudents(b)}>
                    {selectedBatch?.id === b.id ? "Hide Students" : "View Students"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>No batches found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 2, border: "1px solid #eef2f7" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Students {selectedBatch ? `- Batch ${selectedBatch.batch_year}` : ""}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f6f8fb" }}>
              <TableCell sx={{ fontWeight: 600 }}>Student ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Section</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Semester</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((s) => (
              <TableRow key={`${s.student_id}-${s.email}`}>
                <TableCell>{s.student_id}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>{s.section || "-"}</TableCell>
                <TableCell>{s.current_semester_no}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={async () => {
                      const ok = window.confirm(`Delete student ${s.student_id}?`);
                      if (!ok || !selectedBatch) return;
                      setErr("");
                      try {
                        await api.delete(`/admin/batches/${selectedBatch.id}/students/${s.student_id}`);
                        await loadStudents(selectedBatch);
                        await loadDashboard();
                      } catch (e) {
                        setErr(e?.response?.data?.message || "Failed to delete student");
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  {selectedBatch ? "No students found in this batch." : "Select a batch to view students."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
