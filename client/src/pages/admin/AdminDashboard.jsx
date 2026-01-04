import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import {
  Typography, Paper, Alert, Stack, Table, TableHead, TableRow, TableCell, TableBody, Button
} from "@mui/material";

export default function AdminDashboard() {
  const [hods, setHods] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [err, setErr] = useState("");

  const loadDashboard = async () => {
    setErr("");
    try {
      const { data } = await api.get("/admin/dashboard");
      setHods(data.hods || []);
      setFaculty(data.faculty || []);
      setBatches(data.batches || []);
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

  const deleteBatch = async (batch) => {
    const ok = window.confirm(`Delete batch ${batch.batch_year} (${batch.program})? This will remove students and enrollments for the batch.`);
    if (!ok) return;
    setErr("");
    try {
      await api.delete(`/admin/batches/${batch.id}`);
      if (selectedBatch?.id === batch.id) {
        setSelectedBatch(null);
        setStudents([]);
      }
      await loadDashboard();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to delete batch");
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

  return (
    <Stack spacing={3}>
      <Paper sx={ {p: 3 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Admin Dashboard</Typography>
        <Typography variant="body2">Manage users, batches, and student lists.</Typography>
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>HODs</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Department</TableCell>
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Faculty</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Department</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {faculty.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.name}</TableCell>
                <TableCell>{f.email}</TableCell>
                <TableCell>{f.department || "-"}</TableCell>
              </TableRow>
            ))}
            {faculty.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>No faculty found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Batches</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Batch Year</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Manage</TableCell>
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
                <TableCell>
                  <Button size="small" variant="outlined" color="error" onClick={() => deleteBatch(b)}>
                    Delete Batch
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No batches found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Students {selectedBatch ? `- Batch ${selectedBatch.batch_year}` : ""}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Section</TableCell>
              <TableCell>Semester</TableCell>
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
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
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
