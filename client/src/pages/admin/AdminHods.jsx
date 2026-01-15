import React, { useState } from "react";
import { api } from "../../services/api";
import { Typography, Paper, TextField, Button, Alert, Stack, InputAdornment, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function AdminHods() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setErr("PLease Fill the Correct Form");
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
        <TextField label="Department" value={department} onChange={(e)=>setDepartment(e.target.value)} />
        <Button variant="contained" onClick={submit}>Add HOD</Button>
      </Stack>
    </Paper>
  );
}
