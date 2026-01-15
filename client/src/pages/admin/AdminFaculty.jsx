import React, { useState } from "react";
import { api } from "../../services/api";
import { Typography, Paper, TextField, Button, Alert, Stack, InputAdornment, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function AdminFaculty() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [facultyId, setFacultyId] = useState("");
  const [department, setDepartment] = useState("CS");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    setMsg(""); setErr("");
    try {
      const { data } = await api.post("/admin/users", {
        role: "FACULTY",
        name,
        email,
        password,
        department,
        faculty_id: facultyId
      });
      const id = data?.user?.id;
      setMsg(id ? `Faculty created. ID: ${facultyId}` : "Faculty created successfully.");
      setName(""); setEmail(""); setPassword(""); setFacultyId("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to add faculty");
    }
  };

  return (
    <Paper sx={ {p: 3 }}>
      <Typography variant="h5" sx={ {mb: 1} }>Admin - Registration of Teachers</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>Create a faculty user who can log in.</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2} sx={{ maxWidth: 520 }}>
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
        <TextField label="Faculty ID" value={facultyId} onChange={(e)=>setFacultyId(e.target.value)} />
        <TextField label="Department" value={department} onChange={(e)=>setDepartment(e.target.value)} />
        <Button variant="contained" onClick={submit}>Add Faculty</Button>
      </Stack>
    </Paper>
  );
}
