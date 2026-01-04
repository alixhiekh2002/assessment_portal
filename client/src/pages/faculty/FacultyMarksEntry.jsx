import React, { useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, TextField, Button, Alert, Stack, MenuItem } from "@mui/material";

const TYPES = ["MID","FINAL","QUIZ","ASSIGNMENT","VIVA","OEL"];

export default function FacultyMarksEntry() {
  const [studentId, setStudentId] = useState("2026-CS-001");
  const [courseCode, setCourseCode] = useState("CMC111");
  const [batchYear, setBatchYear] = useState(2026);
  const [semesterNo, setSemesterNo] = useState(1);
  const [componentType, setComponentType] = useState("MID");
  const [itemNo, setItemNo] = useState(1);
  const [obtained, setObtained] = useState(0);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const save = async () => {
    setMsg(""); setErr("");
    try {
      await api.post("/faculty/marks/item", {
        student_id: studentId,
        course_code: courseCode,
        batch_year: Number(batchYear),
        semester_no: Number(semesterNo),
        component_type: componentType,
        item_no: Number(itemNo),
        obtained: Number(obtained)
      });
      setMsg("Saved item mark + recomputed CLO/GA + alerts (if GA<50).");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed");
    }
  };

  const uploadCsv = async (e) => {
    setMsg(""); setErr("");
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/faculty/marks/upload-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg(`CSV processed rows: ${data.processed}`);
    } catch (e) {
      setErr(e?.response?.data?.message || "Upload failed");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Marks Entry (Item Level)</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        <TextField label="Student ID" value={studentId} onChange={(e)=>setStudentId(e.target.value)} />
        <TextField label="Course Code" value={courseCode} onChange={(e)=>setCourseCode(e.target.value)} />
        <TextField label="Batch Year" type="number" value={batchYear} onChange={(e)=>setBatchYear(e.target.value)} />
        <TextField label="Semester No" type="number" value={semesterNo} onChange={(e)=>setSemesterNo(e.target.value)} />
        <TextField select label="Component Type" value={componentType} onChange={(e)=>setComponentType(e.target.value)}>
          {TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField label="Item No" type="number" value={itemNo} onChange={(e)=>setItemNo(e.target.value)} />
        <TextField label="Obtained Marks" type="number" value={obtained} onChange={(e)=>setObtained(e.target.value)} />

        <Button variant="contained" onClick={save}>Save Item Mark</Button>

        <Button variant="outlined" component="label">
          Upload CSV (Item Marks)
          <input hidden type="file" accept=".csv" onChange={uploadCsv} />
        </Button>

        <Typography variant="caption">
          CSV columns: student_id,course_code,batch_year,semester_no,component_type,item_no,obtained
        </Typography>
      </Stack>
    </Paper>
  );
}
