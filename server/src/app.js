import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { errorHandler } from "./middleware/error.js";

import authRoutes from "./modules/auth/routes.js";
import adminRoutes from "./modules/admin/routes.js";
import hodRoutes from "./modules/hod/routes.js";
import facultyRoutes from "./modules/faculty/routes.js";
import studentRoutes from "./modules/student/routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/student", studentRoutes);

app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
