import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, Alert, Button, Stack, Divider } from "@mui/material";

export default function HodAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const { data } = await api.get("/hod/alerts");
      setAlerts(data.alerts || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load alerts");
    }
  };

  const resolve = async (id) => {
    await api.patch(`/hod/alerts/${id}/resolve`);
    load();
  };

  useEffect(()=>{ load(); }, []);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Alerts</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Button variant="outlined" onClick={load} sx={{ mb: 2 }}>Refresh</Button>

      <Stack spacing={2}>
        {alerts.map(a => (
          <Paper key={a.id} sx={{ p: 2, border: "1px solid #eee" }}>
            <Typography variant="subtitle1">{a.student_name} ({a.student_id})</Typography>
            <Typography variant="body2">
              Batch: {a.batch_year} | Sem: {a.semester_no} | Course: {a.course_code}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {a.ga_code} = {a.ga_percentage}%
            </Typography>
            <Typography variant="caption" sx={{ display:"block", mt: 1 }}>
              {a.message}
            </Typography>
            {!a.is_resolved && (
              <Button size="small" variant="contained" sx={{ mt: 1 }} onClick={()=>resolve(a.id)}>Resolve</Button>
            )}
          </Paper>
        ))}
        {alerts.length === 0 && <Typography variant="body2">No alerts.</Typography>}
      </Stack>
    </Paper>
  );
}
