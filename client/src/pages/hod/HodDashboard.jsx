import React from "react";
import { Typography, Paper } from "@mui/material";

export default function Page() {
  return (
    <Paper sx={ {p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>HOD Dashboard</Typography>
      <Typography variant="body2">Assign faculty to courses and monitor alerts.</Typography>
    </Paper>
  );
}
