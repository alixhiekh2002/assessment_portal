export const drawerConfig = {
  ADMIN: [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "Registration of Students", path: "/admin/students" },
    { label: "Registration of Teachers", path: "/admin/faculty" },
    { label: "Registration of HODs", path: "/admin/hods" },
    { label: "Courses by Semester", path: "/admin/courses" }
  ],
  HOD: [
    { label: "Dashboard", path: "/hod/dashboard" },
    { label: "Assign Faculty to Courses", path: "/hod/assign" },
    { label: "Alerts", path: "/hod/alerts" },
    { label: "Batches", path: "/hod/batches" },
    { label: "Faculty", path: "/hod/faculty" }
  ],
  FACULTY: [
    { label: "Dashboard", path: "/faculty/dashboard" },
    { label: "My Courses", path: "/faculty/courses" }
  ],
  STUDENT: [
    { label: "Dashboard", path: "/student/dashboard" },
    { label: "Courses", path: "/student/courses" },
    { label: "Results", path: "/student/results" }
  ]
};
