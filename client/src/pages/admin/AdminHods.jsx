import React from "react";
import { Typography, Paper } from "@mui/material";

export default function Page() {
  return (
    <Paper sx={ {p: 3} }>
      <Typography variant="h5" sx={ {mb: 1 }}>Admin - Registration of HODs</Typography>
      <Typography variant="body2">Create/disable HOD users via backend /api/admin/users.</Typography>
    </Paper>
  );
}
