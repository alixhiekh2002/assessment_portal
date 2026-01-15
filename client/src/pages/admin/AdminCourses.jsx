import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import {
  Paper, Typography, TextField, Button, Alert, Stack, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";

export default function AdminCourses() {
  const [batchYear, setBatchYear] = useState(2026);
  const [semesterNo, setSemesterNo] = useState(1);
  const [courseCode, setCourseCode] = useState("");
  const [courses, setCourses] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseSemester, setNewCourseSemester] = useState(1);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const loadCourses = async (sem) => {
    setErr("");
    try {
      const { data } = await api.get("/admin/courses", { params: { semesterNo: Number(sem) } });
      const list = data.courses || [];
      setCourses(list);
      setCourseCode(list[0]?.code || "");
    } catch (e) {
      setCourses([]);
      setCourseCode("");
      setErr(e?.response?.data?.message || "Failed to load courses");
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const { data } = await api.get("/admin/courses", { params: { semesterNo: Number(semesterNo) } });
        if (ignore) return;
        const list = data.courses || [];
        setCourses(list);
        setCourseCode(list[0]?.code || "");
      } catch (e) {
        if (ignore) return;
        setCourses([]);
        setCourseCode("");
        setErr(e?.response?.data?.message || "Failed to load courses");
      }
    };
    if (Number(semesterNo)) load();
    return () => { ignore = true; };
  }, [semesterNo]);

  const openAdd = () => {
    setNewCourseCode("");
    setNewCourseTitle("");
    setNewCourseSemester(Number(semesterNo));
    setAddOpen(true);
  };

  const submitAdd = async () => {
    setMsg(""); setErr("");
    try {
      await api.post("/admin/courses/add", {
        batch_year: Number(batchYear),
        semester_no: Number(newCourseSemester),
        course_code: newCourseCode.trim(),
        course_title: newCourseTitle.trim()
      });
      setMsg("Course added to semester.");
      setAddOpen(false);
      if (Number(newCourseSemester) === Number(semesterNo)) {
        await loadCourses(semesterNo);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to add course");
    }
  };

  const remove = async () => {
    setMsg(""); setErr("");
    try {
      await api.delete("/admin/batch-courses", {
        data: {
          batch_year: Number(batchYear),
          semester_no: Number(semesterNo),
          course_code: courseCode
        }
      });
      setMsg("Course removed from semester.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to remove course");
    }
  };

  const canSubmit = Boolean(courseCode);
  const canAdd = Boolean(newCourseCode.trim() && newCourseTitle.trim());

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Courses Addition and Deletion</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2} sx={{ maxWidth: 520 }}>
        <TextField label="Batch Year" type="number" value={batchYear} onChange={(e)=>setBatchYear(e.target.value)} />
        <TextField
          select
          label="Semester No"
          value={semesterNo}
          onChange={(e)=>setSemesterNo(e.target.value)}
        >
          {[1,2,3,4,5,6,7,8].map((s) => (
            <MenuItem key={s} value={s}>Semester {s}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Course Code"
          value={courseCode}
          onChange={(e)=>setCourseCode(e.target.value)}
          disabled={courses.length === 0}
        >
          {courses.length === 0 && <MenuItem value="">No courses</MenuItem>}
          {courses.map((c) => (
            <MenuItem key={c.code} value={c.code}>
              {c.code} - {c.title}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={openAdd}>Add Course</Button>
          <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>Remove Course</Button>
        </Stack>
      </Stack>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Course</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Course Code"
              value={newCourseCode}
              onChange={(e) => setNewCourseCode(e.target.value)}
            />
            <TextField
              label="Course Name"
              value={newCourseTitle}
              onChange={(e) => setNewCourseTitle(e.target.value)}
            />
            <TextField
              select
              label="Semester No"
              value={newCourseSemester}
              onChange={(e) => setNewCourseSemester(Number(e.target.value))}
            >
              {[1,2,3,4,5,6,7,8].map((s) => (
                <MenuItem key={s} value={s}>Semester {s}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitAdd} disabled={!canAdd}>Add Course</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Remove Course</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure you want to remove this course from the semester?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>No</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              await remove();
              setConfirmOpen(false);
            }}
          >
            Yes, remove
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
