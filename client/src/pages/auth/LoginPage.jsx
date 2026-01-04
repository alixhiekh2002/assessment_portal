import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getUser } from "../../services/auth";
import { Box, Paper, Typography, TextField, Button, Alert } from "@mui/material";

export default function LoginPage() {
  const nav = useNavigate();
  const existing = getUser();
  const [email, setEmail] = useState(existing?.email || "");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const routeByRole = (role) => {
    if (role === "ADMIN") return "/admin/dashboard";
    if (role === "HOD") return "/hod/dashboard";
    if (role === "FACULTY") return "/faculty/dashboard";
    return "/student/dashboard";
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const user = await login(email, password);
      nav(routeByRole(user.role));
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper sx={{ p: 4, width: "100%", maxWidth: 420 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Login</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Seed accounts: admin@cs.edu / hod@cs.edu / faculty@cs.edu / student@cs.edu (Pass@1234)
        </Typography>

        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <form onSubmit={submit}>
          <TextField fullWidth label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} sx={{ mb: 2 }} />
          <Button fullWidth variant="contained" type="submit">Login</Button>
        </form>
      </Paper>
    </Box>
  );
}
