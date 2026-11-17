require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""));
app.use(cors({ origin: allowedOrigins }));

const studentSchema = new mongoose.Schema(
  {
    rollNo: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
    },
    department: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 4 },
    phone: { type: String, trim: true }
  },
  { timestamps: true }
);
studentSchema.index({ department: 1 });
const Student = mongoose.model("Student", studentSchema);

const FIELDS = ["rollNo", "name", "email", "department", "year", "phone"];
function pickFields(body) {
  const data = {};
  FIELDS.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });
  return data;
}

function sendError(res, err) {
  if (err.code === 11000) return res.status(409).json({ message: "Roll number or email already exists" });
  if (err.name === "ValidationError" || err.name === "CastError") return res.status(400).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}

app.get("/", (req, res) => res.send("Student Management System API"));
app.get("/api/health", (req, res) => {
  const database = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ status: "ok", message: "Student Management API is running", database });
});
app.get("/api/students", async (req, res) => {
  try { res.json(await Student.find().sort({ rollNo: 1 })); } catch (err) { sendError(res, err); }
});
app.post("/api/students", async (req, res) => {
  try { res.status(201).json(await Student.create(pickFields(req.body))); } catch (err) { sendError(res, err); }
});
app.put("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, pickFields(req.body), { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) { sendError(res, err); }
});
app.delete("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deleted successfully" });
  } catch (err) { sendError(res, err); }
});
app.get("/api/reports/department-summary", async (req, res) => {
  try {
    const summary = await Student.aggregate([
      { $group: { _id: "$department", totalStudents: { $sum: 1 } } },
      { $sort: { totalStudents: -1, _id: 1 } }
    ]);
    res.json(summary);
  } catch (err) { sendError(res, err); }
});

const PORT = process.env.PORT || 5000;
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || "students_db" });
    console.log("MongoDB connected: " + mongoose.connection.name);
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
}
start();
