import React, { useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, Button, Alert, TextField, Stack, InputAdornment, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function AdminStudents() {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [batchYear, setBatchYear] = useState(2026);
  const [section, setSection] = useState("A");

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

  const submit = async () => {
    setMsg(""); setErr("");
    try {
      await api.post("/admin/users", {
        role: "STUDENT",
        name,
        email,
        password,
        student_id: studentId,
        batch_year: Number(batchYear),
        section
      });
      setMsg("Student created successfully.");
      setName(""); setEmail(""); setPassword(""); setStudentId("");
    } catch (e) {
      setErr("PLease Fill the Correct Form");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>Registration of Students</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Add a single student or upload CSV for bulk students.
      </Typography>

      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2} sx={{ maxWidth: 520, mb: 3 }}>
        <TextField label="Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <TextField label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <TextField
          label="Pass"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <TextField label="Student ID" value={studentId} onChange={(e)=>setStudentId(e.target.value)} />
        <TextField label="Batch Year" type="number" value={batchYear} onChange={(e)=>setBatchYear(e.target.value)} />
        <TextField label="Section" value={section} onChange={(e)=>setSection(e.target.value)} />
        <Button variant="contained" onClick={submit}>Add Student</Button>
      </Stack>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Bulk Upload</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        CSV columns: student_id,name,email,batch_year,section,password
      </Typography>
      <Button variant="contained" component="label">
        Upload CSV
        <input hidden type="file" accept=".csv" onChange={upload} />
      </Button>
    </Paper>
  );
}
