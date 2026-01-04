import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Paper, Typography, TextField, Button, Alert, Stack, MenuItem } from "@mui/material";

const GA = ["GA1","GA2","GA3","GA4","GA5","GA6","GA7","GA8","GA9","GA10"];

export default function FacultyCloGa({ courseCode: initialCourseCode = "CMC111" }) {
  const [courseCode, setCourseCode] = useState(initialCourseCode);
  const [cloNo, setCloNo] = useState(1);
  const [cloTitle, setCloTitle] = useState("CLO1: Understand basics");
  const [cloId, setCloId] = useState("");
  const [gaCode, setGaCode] = useState("GA1");
  const [weight, setWeight] = useState(1.0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setCourseCode(initialCourseCode || "");
  }, [initialCourseCode]);

  const addClo = async () => {
    setMsg(""); setErr("");
    if (Number(cloNo) < 1) {
      setErr("CLO No must be 1 or higher.");
      return;
    }
    try {
      const { data } = await api.post(`/faculty/courses/${courseCode}/clos`, { clo_no: Number(cloNo), title: cloTitle });
      setCloId(String(data.clo.id));
      setMsg(`CLO saved. CLO ID = ${data.clo.id}`);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed");
    }
  };

  const mapGa = async () => {
    setMsg(""); setErr("");
    try {
      if (!cloId) return setErr("Enter/Save CLO first (need CLO ID).");
      await api.post(`/faculty/clos/${cloId}/map-ga`, { ga_code: gaCode, weight: Number(weight) });
      setMsg("CLO mapped to GA successfully.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>CLO - GA Mapping</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2} sx={{ maxWidth: 600 }}>
        <Typography variant="subtitle1">1) Add / Update CLO</Typography>
        <TextField label="Course Code" value={courseCode} onChange={(e)=>setCourseCode(e.target.value)} />
        <TextField
          label="CLO No"
          type="number"
          value={cloNo}
          onChange={(e)=>setCloNo(e.target.value)}
          inputProps={{ min: 1 }}
        />
        <TextField label="CLO Title" value={cloTitle} onChange={(e)=>setCloTitle(e.target.value)} />
        <Button variant="contained" onClick={addClo}>Save CLO</Button>

        <Typography variant="subtitle1" sx={{ mt: 2 }}>2) Map CLO to GA</Typography>
        <TextField label="CLO ID" value={cloId} onChange={(e)=>setCloId(e.target.value)} />
        <TextField select label="GA Code" value={gaCode} onChange={(e)=>setGaCode(e.target.value)}>
          {GA.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
        </TextField>
        <TextField label="Weight" type="number" value={weight} onChange={(e)=>setWeight(e.target.value)} />
        <Button variant="outlined" onClick={mapGa}>Map</Button>
      </Stack>
    </Paper>
  );
}
