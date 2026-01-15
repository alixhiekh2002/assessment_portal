import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, Alert, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, Box } from "@mui/material";

export default function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [openKey, setOpenKey] = useState("");
  const [attainment, setAttainment] = useState({});
  const [loadingKey, setLoadingKey] = useState("");
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

  const coursesBySemester = courses.reduce((acc, course) => {
    const sem = course.semester_no;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(course);
    return acc;
  }, {});
  const semesterKeys = Object.keys(coursesBySemester)
    .map((s) => Number(s))
    .sort((a, b) => a - b);

  const toggleAttainment = async (course) => {
    const key = `${course.course_code}-${course.semester_no}`;
    if (openKey === key) {
      setOpenKey("");
      return;
    }
    if (attainment[key]) {
      setOpenKey(key);
      return;
    }
    setLoadingKey(key);
    setErr("");
    try {
      const { data } = await api.get("/student/results", { params: { courseCode: course.course_code } });
      const ga = (data.ga || []).filter((g) => !g.semester_no || g.semester_no === course.semester_no);
      const clo = (data.clo || []).filter((c) => c.semester_no === course.semester_no);
      setAttainment((prev) => ({ ...prev, [key]: { ga, clo } }));
      setOpenKey(key);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load attainment");
    } finally {
      setLoadingKey("");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>My Courses</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {semesterKeys.map((sem) => (
        <Box key={`sem-${sem}`} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Semester {sem}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Course</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Attainment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coursesBySemester[sem].map((c) => {
                const key = `${c.course_code}-${c.semester_no}`;
                const details = attainment[key];
                const isOpen = openKey === key;
                return (
                  <React.Fragment key={key}>
                    <TableRow>
                      <TableCell>{c.course_code}</TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell>{c.status}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => toggleAttainment(c)}
                          disabled={loadingKey === key}
                        >
                          {isOpen ? "Hide GA/CLO" : "Show GA and CLO Attainment"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Stack spacing={2} sx={{ p: 1 }}>
                            <Box>
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>GA Attainment</Typography>
                              {details?.ga?.length ? (
                                <Stack spacing={1}>
                                  {details.ga.map((g) => {
                                    const pct = Number(g.percentage || 0);
                                    const color = pct < 50 ? "#e53935" : "#2e7d32";
                                    return (
                                      <Box key={`${g.ga_code}-${g.percentage}`} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                        <Typography variant="body2" sx={{ width: 80 }}>{g.ga_code}</Typography>
                                        <Box sx={{ flex: 1, height: 10, background: "#e0e0e0", borderRadius: 6, overflow: "hidden" }}>
                                          <Box sx={{ width: `${pct}%`, height: "100%", background: color }} />
                                        </Box>
                                        <Typography variant="caption" sx={{ width: 50 }}>{pct}%</Typography>
                                      </Box>
                                    );
                                  })}
                                </Stack>
                              ) : (
                                <Typography variant="body2">No GA data.</Typography>
                              )}
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>CLO Attainment</Typography>
                              {details?.clo?.length ? (
                                <Stack spacing={1}>
                                  {details.clo.map((clo) => {
                                    const pct = Number(clo.percentage || 0);
                                    return (
                                      <Box key={`${clo.clo_no}-${clo.percentage}`} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                        <Typography variant="body2" sx={{ width: 80 }}>CLO{clo.clo_no}</Typography>
                                        <Box sx={{ flex: 1, height: 10, background: "#e0e0e0", borderRadius: 6, overflow: "hidden" }}>
                                          <Box sx={{ width: `${pct}%`, height: "100%", background: "#1976d2" }} />
                                        </Box>
                                        <Typography variant="caption" sx={{ width: 50 }}>{pct}%</Typography>
                                      </Box>
                                    );
                                  })}
                                </Stack>
                              ) : (
                                <Typography variant="body2">No CLO data.</Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ))}
    </Paper>
  );
}
