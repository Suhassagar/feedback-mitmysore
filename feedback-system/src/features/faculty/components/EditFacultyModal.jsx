export default function EditFacultyModal({ editFaculty, setEditFaculty, handleUpdateFaculty }) {
  if (!editFaculty) return null;

  return (
    <div className="glass-modal-overlay">
      <div className="card glass-modal flex-col gap-md" style={{ width: "100%", maxWidth: "450px", borderRadius: "20px" }}>
        <h3 className="title-medium" style={{ margin: 0 }}>Edit Faculty</h3>
        <div className="flex-col gap-sm">
          <label className="field-label">Faculty ID (Read Only)</label>
          <input type="text" className="form-input" value={editFaculty.faculty_id} readOnly style={{ opacity: 0.7 }} />
        </div>
        <div className="flex-col gap-sm">
          <label className="field-label">Full Name</label>
          <input type="text" className="form-input" value={editFaculty.name} onChange={(e) => setEditFaculty({ ...editFaculty, name: e.target.value })} />
        </div>
        <div className="flex-col gap-sm">
          <label className="field-label">Email Address</label>
          <input type="email" className="form-input" value={editFaculty.email} onChange={(e) => setEditFaculty({ ...editFaculty, email: e.target.value })} />
        </div>
        <div className="flex-col gap-sm">
          <label className="field-label">Position / Role</label>
          <select 
            className="form-input" 
            value={editFaculty.position || ""} 
            onChange={(e) => setEditFaculty({ ...editFaculty, position: e.target.value })}
          >
            <option value="">Select Position...</option>
            <option value="Professor">Professor</option>
            <option value="Professor and Head">Professor and Head</option>
            <option value="Associate Professor">Associate Professor</option>
            <option value="Assistant Professor">Assistant Professor</option>
            <option value="Teaching Assistant">Teaching Assistant</option>
          </select>
        </div>
        <div className="flex-col gap-sm">
          <label className="field-label">Date of Birth</label>
          <input 
            type="date" 
            className="form-input" 
            value={editFaculty.dob ? new Date(editFaculty.dob).toISOString().split('T')[0] : ""} 
            onChange={(e) => setEditFaculty({ ...editFaculty, dob: e.target.value })} 
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
          <button className="btn" onClick={() => setEditFaculty(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpdateFaculty}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
