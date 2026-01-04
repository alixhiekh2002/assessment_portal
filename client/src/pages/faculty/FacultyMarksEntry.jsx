import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import {
  Paper, Typography, Alert, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button
} from "@mui/material";

export default function FacultyMarksEntry({
  courseCode: initialCourseCode = "CMC111",
  batchYear: initialBatchYear = 2026,
  semesterNo: initialSemesterNo = 1
}) {
  const [courseCode, setCourseCode] = useState(initialCourseCode);
  const [batchYear, setBatchYear] = useState(initialBatchYear);
  const [semesterNo, setSemesterNo] = useState(initialSemesterNo);
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setCourseCode(initialCourseCode || "");
  }, [initialCourseCode]);

  useEffect(() => {
    if (Number.isFinite(initialBatchYear)) setBatchYear(initialBatchYear || 0);
  }, [initialBatchYear]);

  useEffect(() => {
    if (Number.isFinite(initialSemesterNo)) setSemesterNo(initialSemesterNo || 0);
  }, [initialSemesterNo]);

  const loadPlan = async () => {
    if (!courseCode || !batchYear || !semesterNo) return;
    try {
      const { data } = await api.get("/faculty/assessment-plan", {
        params: { courseCode, batchYear, semesterNo }
      });
      setRows(data.rows || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load plan");
    }
  };

  const loadStudents = async () => {
    if (!courseCode || !batchYear || !semesterNo) return;
    try {
      const { data } = await api.get("/faculty/course-students", {
        params: { courseCode, batchYear, semesterNo }
      });
      setStudents(data.students || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load students");
    }
  };

  const loadMarks = async () => {
    if (!courseCode || !batchYear || !semesterNo) return;
    try {
      const { data } = await api.get("/faculty/marks/entries", {
        params: { courseCode, batchYear, semesterNo }
      });
      const next = {};
      for (const m of data.marks || []) {
        if (!next[m.student_id]) next[m.student_id] = {};
        next[m.student_id][m.plan_row_id] = m.obtained;
      }
      setMarks(next);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load marks");
    }
  };

  useEffect(() => {
    setErr("");
    loadPlan();
    loadStudents();
    loadMarks();
  }, [courseCode, batchYear, semesterNo]);

  const headers = useMemo(() => {
    return rows.map((r) => ({
      id: r.id,
      label: `${r.component_type} (CLO${r.clo_no}) / ${r.max_marks}`
    }));
  }, [rows]);

  const setMark = (studentId, planRowId, value) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [planRowId]: value }
    }));
  };

  const submitStudent = async (studentId) => {
    setMsg(""); setErr("");
    try {
      const rowMarks = marks[studentId] || {};
      const payload = Object.entries(rowMarks)
        .map(([planRowId, obtained]) => ({
          plan_row_id: Number(planRowId),
          obtained: Number(obtained)
        }))
        .filter((m) => Number.isFinite(m.obtained));

      await api.post("/faculty/marks/entry", {
        student_id: studentId,
        course_code: courseCode,
        batch_year: Number(batchYear),
        semester_no: Number(semesterNo),
        marks: payload
      });
      setMsg(`Marks submitted for ${studentId}.`);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to submit marks");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Marks Entry</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {rows.length === 0 && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          No assessment plan rows found. Please add plan rows first.
        </Typography>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Reg No</TableCell>
            <TableCell>Name</TableCell>
            {headers.map((h) => (
              <TableCell key={h.id}>{h.label}</TableCell>
            ))}
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((s) => (
            <TableRow key={s.student_id}>
              <TableCell>{s.student_id}</TableCell>
              <TableCell>{s.name}</TableCell>
              {headers.map((h) => (
                <TableCell key={`${s.student_id}-${h.id}`}>
                  <TextField
                    size="small"
                    type="number"
                    value={(marks[s.student_id] || {})[h.id] || ""}
                    onChange={(e)=>setMark(s.student_id, h.id, e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </TableCell>
              ))}
              <TableCell>
                <Button size="small" variant="contained" onClick={() => submitStudent(s.student_id)}>
                  Submit
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {students.length === 0 && (
            <TableRow>
              <TableCell colSpan={headers.length + 3}>No students found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
