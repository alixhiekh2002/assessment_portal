import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getUser } from "../../services/auth";
import { Box, Paper, Typography, TextField, Button, Alert, InputAdornment, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

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
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
        backgroundImage: [
          "radial-gradient(circle at 10% 10%, #f4fbff 0%, #f8fbf5 40%, #fff7f0 100%)",
          "linear-gradient(120deg, rgba(25,118,210,0.08), rgba(76,175,80,0.08))",
          "repeating-linear-gradient(90deg, rgba(31,41,55,0.03) 0px, rgba(31,41,55,0.03) 1px, transparent 1px, transparent 64px)"
        ].join(","),
        fontFamily: "Palatino Linotype, Book Antiqua, Palatino, serif",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(165, 214, 255, 0.45), rgba(165, 214, 255, 0))",
          top: -120,
          right: -80
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 216, 180, 0.45), rgba(255, 216, 180, 0))",
          bottom: -120,
          left: -60
        }}
      />
      <Paper
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 440,
          borderRadius: 3,
          border: "1px solid #e7edf3",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 20px 50px rgba(31, 41, 55, 0.08)"
        }}
      >
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, color: "#1f2937" }}>
          OBE Assesment Portal
        </Typography>
        <Typography variant="h6" sx={{ mb: 3, color: "#5f6b7a" }}>
          Login 
        </Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <form onSubmit={submit}>
          <TextField
            fullWidth
            label="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            sx={{ mb: 2, backgroundColor: "#f8fafc", borderRadius: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            sx={{ mb: 2, backgroundColor: "#f8fafc", borderRadius: 2 }}
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
          <Button
            fullWidth
            variant="contained"
            type="submit"
            sx={{
              py: 1.2,
              borderRadius: 2,
              background: "linear-gradient(90deg, #7cc9ff 0%, #9fd7b0 100%)",
              color: "#0f172a",
              fontWeight: 700,
              textTransform: "none"
            }}
          >
            Login
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
