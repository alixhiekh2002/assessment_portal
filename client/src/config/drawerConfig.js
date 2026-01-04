export const drawerConfig = {
  ADMIN: [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "Registration of Students", path: "/admin/students" },
    { label: "Registration of Teachers", path: "/admin/faculty" },
    { label: "Registration of HODs", path: "/admin/hods" }
  ],
  HOD: [
    { label: "Dashboard", path: "/hod/dashboard" },
    { label: "Assign Faculty to Courses", path: "/hod/assign" },
    { label: "Alerts", path: "/hod/alerts" }
  ],
  FACULTY: [
    { label: "Dashboard", path: "/faculty/dashboard" },
    { label: "My Courses", path: "/faculty/courses" },
    { label: "CLO GA MAP", path: "/faculty/clo-ga-map" },
    { label: "Assessment Plan", path: "/faculty/assessment-plan" },
    { label: "Marks Entry", path: "/faculty/marks-entry" },
    { label: "Student Results", path: "/faculty/student-results" }
  ],
  STUDENT: [
    { label: "Dashboard", path: "/student/dashboard" },
    { label: "Courses", path: "/student/courses" },
    { label: "Results", path: "/student/results" }
  ]
};
