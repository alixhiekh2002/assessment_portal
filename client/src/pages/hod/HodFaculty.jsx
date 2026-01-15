import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, Alert, Table, TableHead, TableRow, TableCell, TableBody, Button } from "@mui/material";

export default function HodFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [department, setDepartment] = useState("CS");
  const [expandedId, setExpandedId] = useState(null);
  const [coursesByFaculty, setCoursesByFaculty] = useState({});
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const { data } = await api.get("/hod/faculty");
        setFaculty(data.faculty || []);
        setDepartment(data.department || "CS");
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load faculty");
      }
    })();
  }, []);

  const toggleCourses = async (userId) => {
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    if (!coursesByFaculty[userId]) {
      try {
        const { data } = await api.get(`/hod/faculty/${userId}/courses`);
        setCoursesByFaculty((prev) => ({ ...prev, [userId]: data.courses || [] }));
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load faculty courses");
        return;
      }
    }
    setExpandedId(userId);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>Faculty ({department})</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Faculty ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Courses</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {faculty.map((f) => (
            <React.Fragment key={f.id}>
              <TableRow>
                <TableCell>{f.id}</TableCell>
                <TableCell>{f.name}</TableCell>
                <TableCell>{f.email}</TableCell>
                <TableCell>{f.department}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" onClick={() => toggleCourses(f.id)}>
                    {expandedId === f.id ? "Hide" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
              {expandedId === f.id && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Course</TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell>Batch</TableCell>
                          <TableCell>Semester</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(coursesByFaculty[f.id] || []).map((c) => (
                          <TableRow key={`${c.course_code}-${c.batch_year}-${c.semester_no}`}>
                            <TableCell>{c.course_code}</TableCell>
                            <TableCell>{c.title}</TableCell>
                            <TableCell>{c.batch_year}</TableCell>
                            <TableCell>{c.semester_no}</TableCell>
                          </TableRow>
                        ))}
                        {(coursesByFaculty[f.id] || []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4}>No assignments found.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
          {faculty.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No faculty found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
