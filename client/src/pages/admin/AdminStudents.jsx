import React, { useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, Button, Alert } from "@mui/material";

export default function AdminStudents() {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const upload = async (e) => {
    setMsg(""); setErr("");
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/admin/students/bulk", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg(`Uploaded: ${data.count} students`);
    } catch (e) {
      setErr(e?.response?.data?.message || "Upload failed");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>Registration of Students</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Upload CSV for bulk students (student_id,name,email,batch_year,section)
      </Typography>

      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Button variant="contained" component="label">
        Upload CSV
        <input hidden type="file" accept=".csv" onChange={upload} />
      </Button>
    </Paper>
  );
}
