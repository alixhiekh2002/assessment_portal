import React from "react";
import { Typography, Paper } from "@mui/material";

export default function Page() {
  return (
    <Paper sx={ {p: 3 }}>
      <Typography variant="h5" sx={ {mb: 1} }>Faculty Dashboard</Typography>
      <Typography variant="body2">Manage CLOs, mapping, plans and marks.</Typography>
    </Paper>
  );
}
