import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getUser } from "../../services/auth";
import { Box, Paper, Typography, TextField, Button, Alert, InputAdornment, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";

export default function LoginPage() {
  const nav = useNavigate();
  const existing = getUser();
  const [email, setEmail] = useState(existing?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, background: "#f2f6fb" }}>
      <Paper
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid #e3e8f0",
          boxShadow: "0 18px 40px rgba(31, 41, 55, 0.12)"
        }}
      >
        <Box sx={{ p: 3, background: "#1976d2", color: "#fff", textAlign: "center" }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              mx: "auto",
              mb: 1,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              display: "grid",
              placeItems: "center"
            }}
          >
            <SchoolOutlined />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>OBE Assessment Portal</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>Sign in to continue</Typography>
        </Box>
        <Box sx={{ p: 3 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <form onSubmit={submit}>
          <TextField
            fullWidth
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined sx={{ color: "#9aa4b2" }} />
                </InputAdornment>
              )
            }}
          />
          <TextField
            fullWidth
            label="Password"
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ color: "#9aa4b2" }} />
                </InputAdornment>
              ),
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
          <Button
            fullWidth
            variant="contained"
            type="submit"
            sx={{
              py: 1.2,
              borderRadius: 1.5,
              background: "#1976d2",
              color: "#fff",
              fontWeight: 700,
              textTransform: "none"
            }}
          >
            Sign In
          </Button>
        </form>
        </Box>
      </Paper>
    </Box>
  );
}
