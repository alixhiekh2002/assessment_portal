import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import {
  Typography, Paper, Alert, Table, TableHead, TableRow, TableCell, TableBody, Button
} from "@mui/material";

export default function FacultyDashboard() {
  const nav = useNavigate();
  const [courses, setCourses] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const { data } = await api.get("/faculty/my-courses");
        setCourses(data.courses || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load courses");
      }
    })();
  }, []);

  const openCourse = (c) => {
    nav(`/faculty/course?courseCode=${c.course_code}&batchYear=${c.batch_year}&semesterNo=${c.semester_no}`);
  };

  return (
    <Paper sx={ {p: 3 }}>
      <Typography variant="h5" sx={ {mb: 1} }>Faculty Dashboard</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Assigned courses and sections.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Course</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Batch</TableCell>
            <TableCell>Semester</TableCell>
            <TableCell>Sections</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {courses.map((c) => (
            <TableRow key={`${c.course_code}-${c.batch_id}-${c.semester_no}`}>
              <TableCell>{c.course_code}</TableCell>
              <TableCell>{c.title}</TableCell>
              <TableCell>{c.batch_year}</TableCell>
              <TableCell>{c.semester_no}</TableCell>
              <TableCell>{c.sections || "-"}</TableCell>
              <TableCell>
                <Button size="small" variant="outlined" onClick={() => openCourse(c)}>
                  Open
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {courses.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>No assigned courses.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
