import { useState } from "react";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";

function FacultyRegistrationModal({ closeModal }) {
  const [formData, setFormData] = useState({
    dept_id: "",
    faculty_id: "",
    name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const registerFaculty = async () => {
    if (!formData.dept_id.trim() || !formData.faculty_id.trim() || !formData.name.trim() || !formData.email.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/faculty/register", {
        dept_id: formData.dept_id.trim().toUpperCase(),
        faculty_id: formData.faculty_id.trim().toUpperCase(),
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase()
      });

      if (res.data.success) {
        toast.success(res.data.message || "Registration submitted! Waiting for department approval.");
        closeModal();
      } else {
        toast.error(res.data.message || "Failed to register faculty");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error registering faculty");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1000, padding: "16px" }}>
      <div className="card flex-col gap-md" style={{ width: "100%", maxWidth: "400px", maxHeight: "90vh", overflowY: "auto", padding: "24px 20px" }}>
        {/* Centered heading */}
        <h2 className="title-medium text-gradient" style={{ textAlign: "center", margin: 0 }}>Faculty Registration</h2>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: "14px", fontWeight: "500" }}>Department ID</label>
          <input
            type="text"
            name="dept_id"
            className="form-input"
            onChange={handleChange}
            placeholder="Enter Department ID"
          />
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: "14px", fontWeight: "500" }}>Faculty ID</label>
          <input
            type="text"
            name="faculty_id"
            className="form-input"
            onChange={handleChange}
            placeholder="Enter Faculty ID"
          />
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: "14px", fontWeight: "500" }}>Name</label>
          <input
            type="text"
            name="name"
            className="form-input"
            onChange={handleChange}
            placeholder="Enter Name"
          />
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: "14px", fontWeight: "500" }}>Email</label>
          <input
            type="email"
            name="email"
            className="form-input"
            onChange={handleChange}
            placeholder="Enter Email"
          />
        </div>

        {/* Buttons aligned cleanly */}
        <div className="flex-col gap-sm" style={{ marginTop: "10px" }}>
          <button className="btn btn-primary" onClick={registerFaculty} disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
          <button className="btn" onClick={closeModal} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default FacultyRegistrationModal;
