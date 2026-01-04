import React from "react";
import { Typography, Paper } from "@mui/material";

export default function Page() {
  return (
    <Paper sx={ {p: 3 }}>
      <Typography variant="h5" sx={ {mb: 1 }}>Student Dashboard</Typography>
      <Typography variant="body2">View your courses and results.</Typography>
    </Paper>
  );
}
