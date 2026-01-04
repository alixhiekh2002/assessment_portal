import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import {
  Paper, Typography, TextField, Button, Alert, Stack, MenuItem, Box, Divider, Checkbox
} from "@mui/material";

const TYPES = ["MID", "FINAL", "QUIZ", "ASSIGNMENT", "VIVA", "OEL"];

export default function FacultyAssessmentPlan({
  courseCode: initialCourseCode = "CMC111",
  batchYear: initialBatchYear = 2026,
  semesterNo: initialSemesterNo = 1
}) {
  const [courseCode, setCourseCode] = useState(initialCourseCode);
  const [batchYear, setBatchYear] = useState(initialBatchYear);
  const [semesterNo, setSemesterNo] = useState(initialSemesterNo);
  const [componentType, setComponentType] = useState("MID");
  const [clos, setClos] = useState([]);
  const [selected, setSelected] = useState({});
  const [maxByClo, setMaxByClo] = useState({});
  const [newCloNo, setNewCloNo] = useState("");
  const [newCloTitle, setNewCloTitle] = useState("");
  const [rows, setRows] = useState([]);
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

  const loadClos = async () => {
    if (!courseCode) return;
    try {
      const { data } = await api.get(`/faculty/courses/${courseCode}/clos`);
      setClos(data.clos || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load CLOs");
    }
  };

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

  useEffect(() => {
    setErr("");
    loadClos();
    loadPlan();
  }, [courseCode, batchYear, semesterNo]);

  const currentTotal = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.max_marks || 0), 0),
    [rows]
  );

  const toggleClo = (cloId) => {
    setSelected((prev) => ({ ...prev, [cloId]: !prev[cloId] }));
  };

  const addRows = async () => {
    setMsg(""); setErr("");
    const selectedClos = clos.filter((c) => selected[c.id]);
    if (selectedClos.length === 0) {
      setErr("Select at least one CLO.");
      return;
    }

    try {
      for (const clo of selectedClos) {
        const maxMarks = Number(maxByClo[clo.id] || 0);
        if (!maxMarks) continue;
        await api.post("/faculty/assessment-plan/rows", {
          course_code: courseCode,
          batch_year: Number(batchYear),
          semester_no: Number(semesterNo),
          component_type: componentType,
          clo_id: clo.id,
          max_marks: maxMarks
        });
      }
      setSelected({});
      setMaxByClo({});
      await loadPlan();
      setMsg("Assessment plan updated.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to add rows");
    }
  };

  const addClo = async () => {
    setMsg(""); setErr("");
    const cloNo = Number(newCloNo);
    if (!courseCode || cloNo < 1 || !newCloTitle.trim()) {
      setErr("CLO No must be 1 or higher, and Title is required.");
      return;
    }
    try {
      await api.post(`/faculty/courses/${courseCode}/clos`, {
        clo_no: cloNo,
        title: newCloTitle.trim()
      });
      setNewCloNo("");
      setNewCloTitle("");
      await loadClos();
      setMsg("CLO added.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to add CLO");
    }
  };

  const editRow = async (row) => {
    const next = window.prompt("Enter new max marks", String(row.max_marks));
    const maxMarks = Number(next);
    if (!maxMarks) return;
    setMsg(""); setErr("");
    try {
      await api.patch(`/faculty/assessment-plan/rows/${row.id}`, { max_marks: maxMarks });
      await loadPlan();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update row");
    }
  };

  const deleteRow = async (row) => {
    const ok = window.confirm("Delete this plan row?");
    if (!ok) return;
    setMsg(""); setErr("");
    try {
      await api.delete(`/faculty/assessment-plan/rows/${row.id}`);
      await loadPlan();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to delete row");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Assessment Plan</Typography>
        <Typography variant="body2">Current total: {currentTotal}</Typography>
      </Stack>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField label="Course Code" value={courseCode} onChange={(e)=>setCourseCode(e.target.value)} />
          <TextField label="Batch Year" type="number" value={batchYear} onChange={(e)=>setBatchYear(e.target.value)} />
          <TextField
            label="Semester No"
            type="number"
            value={semesterNo}
            onChange={(e)=>setSemesterNo(e.target.value)}
            inputProps={{ min: 1 }}
          />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "center" }}>
          <TextField
            label="CLO No"
            type="number"
            value={newCloNo}
            onChange={(e)=>setNewCloNo(e.target.value)}
            inputProps={{ min: 1 }}
            sx={{ maxWidth: 140 }}
          />
          <TextField
            label="CLO Title"
            value={newCloTitle}
            onChange={(e)=>setNewCloTitle(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="outlined" onClick={addClo}>Add CLO</Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "center" }}>
          <TextField
            select
            label="Assessment Type"
            value={componentType}
            onChange={(e)=>setComponentType(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <Typography variant="body2">
            Select CLOs below and set max marks per CLO
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          {clos.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2, flex: 1, minWidth: 220 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Checkbox checked={Boolean(selected[c.id])} onChange={() => toggleClo(c.id)} />
                  <Typography variant="subtitle1">CLO{c.clo_no}</Typography>
                </Stack>
                <Typography variant="caption">{c.title}</Typography>
                <TextField
                  label="Max Marks"
                  type="number"
                  value={maxByClo[c.id] || ""}
                  onChange={(e)=>setMaxByClo((prev) => ({ ...prev, [c.id]: e.target.value }))}
                />
              </Stack>
            </Paper>
          ))}
          {clos.length === 0 && (
            <Typography variant="body2">No CLOs found for this course.</Typography>
          )}
        </Stack>

        <Box>
          <Button variant="contained" onClick={addRows}>Add to Plan</Button>
        </Box>

        <Divider />

        <Paper variant="outlined">
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Plan Rows</Typography>
            {rows.length === 0 && (
              <Typography variant="body2">No rows added yet.</Typography>
            )}
            {rows.length > 0 && (
              <Stack spacing={1}>
                <Stack direction="row" sx={{ fontWeight: 600 }}>
                  <Box sx={{ width: 120 }}>Type</Box>
                  <Box sx={{ width: 120 }}>CLO</Box>
                  <Box sx={{ width: 80 }}>Max</Box>
                  <Box sx={{ flexGrow: 1 }}>Actions</Box>
                </Stack>
                {rows.map((r) => (
                  <Stack key={r.id} direction="row" sx={{ alignItems: "center" }}>
                    <Box sx={{ width: 120 }}>{r.component_type}</Box>
                    <Box sx={{ width: 120 }}>CLO{r.clo_no}</Box>
                    <Box sx={{ width: 80 }}>{r.max_marks}</Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => editRow(r)}>Edit</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => deleteRow(r)}>Delete</Button>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        </Paper>
      </Stack>
    </Paper>
  );
}
