import { useEffect, useState } from "react";
import "./style.css";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "") + "/api";

const emptyForm = { rollNo: "", name: "", email: "", department: "", year: "", phone: "" };
const labels = {
  rollNo: "Roll No", name: "Name", email: "Email",
  department: "Department", year: "Year (1-4)", phone: "Phone (optional)"
};

export default function App() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  async function loadStudents() {
    const response = await fetch(`${API}/students`);
    if (!response.ok) throw new Error("Could not load students");
    setStudents(await response.json());
  }

  useEffect(() => {
    loadStudents().catch((err) => setMessage(err.message));
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = { ...form, year: Number(form.year) };
    const url = editingId ? `${API}/students/${editingId}` : `${API}/students`;
    try {
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || "Save failed");
        return;
      }
      setMessage(editingId ? "Student updated" : "Student added");
      setForm(emptyForm);
      setEditingId(null);
      await loadStudents();
    } catch (err) {
      setMessage("Cannot reach the server. Please try again.");
    }
  }

  function startEdit(student) {
    setEditingId(student._id);
    setForm({
      rollNo: student.rollNo, name: student.name, email: student.email,
      department: student.department, year: String(student.year), phone: student.phone || ""
    });
  }

  async function removeStudent(id) {
    if (!window.confirm("Delete this student record?")) return;
    try {
      const response = await fetch(`${API}/students/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || "Delete failed");
        return;
      }
      setMessage("Student deleted");
      await loadStudents();
    } catch (err) {
      setMessage("Cannot reach the server. Please try again.");
    }
  }

  return (
    <main className="container">
      <h1>Student Management System</h1>
      <p>Add, view, update and delete student records.</p>
      {message && <p role="status">{message}</p>}

      <form onSubmit={handleSubmit}>
        {Object.keys(emptyForm).map((key) => (
          <label key={key}>
            {labels[key]}
            <input
              name={key}
              value={form[key]}
              onChange={handleChange}
              type={key === "email" ? "email" : key === "year" ? "number" : "text"}
              min={key === "year" ? "1" : undefined}
              max={key === "year" ? "4" : undefined}
              required={key !== "phone"}
            />
          </label>
        ))}
        <button type="submit">{editingId ? "Update Student" : "Add Student"}</button>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
            Cancel Edit
          </button>
        )}
      </form>

      <h2>Student Records</h2>
      <table>
        <thead>
          <tr>
            <th>Roll No</th><th>Name</th><th>Email</th><th>Department</th><th>Year</th><th>Phone</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s._id}>
              <td>{s.rollNo}</td><td>{s.name}</td><td>{s.email}</td><td>{s.department}</td><td>{s.year}</td><td>{s.phone}</td>
              <td>
                <button onClick={() => startEdit(s)}>Edit</button>
                <button onClick={() => removeStudent(s._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
