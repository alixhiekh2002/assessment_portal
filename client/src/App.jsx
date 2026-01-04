import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import RoleLayout from "./layout/RoleLayout.jsx";

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminStudents from "./pages/admin/AdminStudents.jsx";
import AdminFaculty from "./pages/admin/AdminFaculty.jsx";
import AdminHods from "./pages/admin/AdminHods.jsx";

import HodDashboard from "./pages/hod/HodDashboard.jsx";
import HodAssign from "./pages/hod/HodAssign.jsx";
import HodAlerts from "./pages/hod/HodAlerts.jsx";

import FacultyDashboard from "./pages/faculty/FacultyDashboard.jsx";
import FacultyCourses from "./pages/faculty/FacultyCourses.jsx";
import FacultyCloGa from "./pages/faculty/FacultyCloGa.jsx";
import FacultyAssessmentPlan from "./pages/faculty/FacultyAssessmentPlan.jsx";
import FacultyMarksEntry from "./pages/faculty/FacultyMarksEntry.jsx";
import FacultyStudentResults from "./pages/faculty/FacultyStudentResults.jsx";

import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import StudentCourses from "./pages/student/StudentCourses.jsx";
import StudentResults from "./pages/student/StudentResults.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleLayout />}>
          {/* ADMIN */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/faculty" element={<AdminFaculty />} />
          <Route path="/admin/hods" element={<AdminHods />} />

          {/* HOD */}
          <Route path="/hod/dashboard" element={<HodDashboard />} />
          <Route path="/hod/assign" element={<HodAssign />} />
          <Route path="/hod/alerts" element={<HodAlerts />} />

          {/* FACULTY */}
          <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
          <Route path="/faculty/courses" element={<FacultyCourses />} />
          <Route path="/faculty/clo-ga-map" element={<FacultyCloGa />} />
          <Route path="/faculty/assessment-plan" element={<FacultyAssessmentPlan />} />
          <Route path="/faculty/marks-entry" element={<FacultyMarksEntry />} />
          <Route path="/faculty/student-results" element={<FacultyStudentResults />} />

          {/* STUDENT */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/courses" element={<StudentCourses />} />
          <Route path="/student/results" element={<StudentResults />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
