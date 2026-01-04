import React, { useState } from "react";
import { api } from "../../services/api";
import { Typography, Paper, TextField, Button, Alert, Stack } from "@mui/material";

export default function AdminHods() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("CS");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    setMsg(""); setErr("");
    try {
      await api.post("/admin/users", {
        role: "HOD",
        name,
        email,
        password,
        department
      });
      setMsg("HOD created successfully.");
      setName(""); setEmail(""); setPassword("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <Paper sx={ {p: 3} }>
      <Typography variant="h5" sx={ {mb: 1 }}>Admin - Registration of HODs</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>Create a HOD user who can log in.</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2} sx={{ maxWidth: 520 }}>
        <TextField label="Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <TextField label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <TextField label="Pass" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <TextField label="Department" value={department} onChange={(e)=>setDepartment(e.target.value)} />
        <Button variant="contained" onClick={submit}>Add HOD</Button>
      </Stack>
    </Paper>
  );
}
