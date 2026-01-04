import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Paper, Tabs, Tab, Typography, Box } from "@mui/material";
import FacultyCloGa from "./FacultyCloGa.jsx";
import FacultyAssessmentPlan from "./FacultyAssessmentPlan.jsx";
import FacultyMarksEntry from "./FacultyMarksEntry.jsx";
import FacultyStudentResults from "./FacultyStudentResults.jsx";

const tabLabels = ["CLO GA MAP", "Assessment Plan", "Marks Entry", "Student Results"];

export default function FacultyCourseTabs() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(0);

  const courseCode = params.get("courseCode") || "";
  const batchYear = Number(params.get("batchYear") || 0);
  const semesterNo = Number(params.get("semesterNo") || 0);

  const header = useMemo(() => {
    if (!courseCode) return "Course";
    const parts = [courseCode];
    if (semesterNo) parts.push(`Sem ${semesterNo}`);
    if (batchYear) parts.push(`Batch ${batchYear}`);
    return parts.join(" - ");
  }, [courseCode, batchYear, semesterNo]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>{header}</Typography>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        {tabLabels.map((t) => <Tab key={t} label={t} />)}
      </Tabs>

      <Box sx={{ mt: 1 }}>
        {tab === 0 && (
          <FacultyCloGa courseCode={courseCode} />
        )}
        {tab === 1 && (
          <FacultyAssessmentPlan courseCode={courseCode} batchYear={batchYear} semesterNo={semesterNo} />
        )}
        {tab === 2 && (
          <FacultyMarksEntry courseCode={courseCode} batchYear={batchYear} semesterNo={semesterNo} />
        )}
        {tab === 3 && (
          <FacultyStudentResults courseCode={courseCode} batchYear={batchYear} semesterNo={semesterNo} />
        )}
      </Box>
    </Paper>
  );
}
