import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import {
  Paper, Typography, Alert, Stack, Table, TableHead, TableRow, TableCell, TableBody, Button, TextField
} from "@mui/material";

export default function HodBatches() {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [semesterNo, setSemesterNo] = useState(1);
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [resultsByStudent, setResultsByStudent] = useState({});
  const [err, setErr] = useState("");

  const loadBatches = async () => {
    setErr("");
    try {
      const { data } = await api.get("/hod/batches");
      setBatches(data.batches || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load batches");
    }
  };

  const loadStudents = async (batch) => {
    setErr("");
    try {
      const { data } = await api.get(`/hod/batches/${batch.id}/students`, {
        params: { semesterNo: Number(semesterNo) }
      });
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
      setExpandedStudentId(null);
      setResultsByStudent({});
      return;
    }
    await loadStudents(batch);
  };

  const toggleResults = async (studentId) => {
    if (!selectedBatch) return;
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
      return;
    }

    if (!resultsByStudent[studentId]) {
      try {
        const { data } = await api.get(
          `/hod/batches/${selectedBatch.id}/students/${studentId}/results`,
          { params: { semesterNo: Number(semesterNo) } }
        );
        setResultsByStudent((prev) => ({ ...prev, [studentId]: data.results || [] }));
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load results");
        return;
      }
    }

    setExpandedStudentId(studentId);
  };

  useEffect(() => { loadBatches(); }, []);

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Batches</Typography>
        <Typography variant="body2">Select a batch and semester to view students.</Typography>
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs:"column", sm:"row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Semester No"
            type="number"
            value={semesterNo}
            onChange={(e)=>setSemesterNo(e.target.value)}
            inputProps={{ min: 1 }}
            sx={{ maxWidth: 180 }}
          />
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Batch Year</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Action</TableCell>
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Students {selectedBatch ? `- Batch ${selectedBatch.batch_year} (Sem ${semesterNo})` : ""}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Section</TableCell>
              <TableCell>Semester</TableCell>
              <TableCell>Results</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((s) => (
              <React.Fragment key={`${s.student_id}-${s.email}`}>
                <TableRow>
                  <TableCell>{s.student_id}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.section || "-"}</TableCell>
                  <TableCell>{s.current_semester_no}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => toggleResults(s.student_id)}>
                      {expandedStudentId === s.student_id ? "Hide Results" : "View Results"}
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedStudentId === s.student_id && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Course Results (Sem {semesterNo})
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Course</TableCell>
                            <TableCell>Title</TableCell>
                            <TableCell>Percentage</TableCell>
                            <TableCell>Letter</TableCell>
                            <TableCell>Grade Points</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(resultsByStudent[s.student_id] || []).map((r) => (
                            <TableRow key={r.course_code}>
                              <TableCell>{r.course_code}</TableCell>
                              <TableCell>{r.title}</TableCell>
                              <TableCell>{r.percentage ?? "-"}</TableCell>
                              <TableCell>{r.letter_grade ?? "-"}</TableCell>
                              <TableCell>{r.grade_points ?? "-"}</TableCell>
                            </TableRow>
                          ))}
                          {(resultsByStudent[s.student_id] || []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5}>No results for this semester.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  {selectedBatch ? "No students found in this batch/semester." : "Select a batch to view students."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
