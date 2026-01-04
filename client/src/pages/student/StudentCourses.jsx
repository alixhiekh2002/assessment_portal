import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, Alert, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

export default function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/student/courses");
        setCourses(data.courses || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed");
      }
    })();
  }, []);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>My Courses</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Course</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Semester</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {courses.map((c) => (
            <TableRow key={`${c.course_code}-${c.semester_no}`}>
              <TableCell>{c.course_code}</TableCell>
              <TableCell>{c.title}</TableCell>
              <TableCell>{c.semester_no}</TableCell>
              <TableCell>{c.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
