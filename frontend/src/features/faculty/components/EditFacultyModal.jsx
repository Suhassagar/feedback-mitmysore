import { useState, useRef, useEffect } from "react";
import { Camera, Trash2, Loader2, X } from "lucide-react";
import apiClient from "../../../services/apiClient";
import { toast } from "react-hot-toast";
import FacultyAvatar from "../../../components/ui/FacultyAvatar";

export default function EditFacultyModal({ editFaculty, setEditFaculty, handleUpdateFaculty }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize or reset preview when editFaculty changes
  useEffect(() => {
    if (editFaculty) {
      setPreviewUrl(editFaculty.profile_picture_url || null);
      setPhotoFile(null);
      setPhotoRemoved(false);
    }
  }, [editFaculty]);

  // Clean up blob URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!editFaculty) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    // Clean up previous blob
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const localUrl = URL.createObjectURL(file);
    setPhotoFile(file);
    setPreviewUrl(localUrl);
    setPhotoRemoved(false);
  };

  const handleRemovePhoto = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPhotoFile(null);
    setPreviewUrl(null);
    setPhotoRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!editFaculty.name?.trim()) {
      return toast.error("Full Name is required");
    }
    if (!editFaculty.email?.trim()) {
      return toast.error("Email address is required");
    }

    setIsSaving(true);
    let finalProfileUrl = editFaculty.profile_picture_url;

    try {
      // 1. Handle Photo Upload if new file selected
      if (photoFile) {
        const formData = new FormData();
        formData.append("image", photoFile);

        const uploadRes = await apiClient.post(
          `/faculty/${encodeURIComponent(editFaculty.faculty_id)}/photo`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true
          }
        );
        if (uploadRes.data?.url) {
          finalProfileUrl = uploadRes.data.url;
        }
      } else if (photoRemoved && editFaculty.profile_picture_url) {
        // 2. Handle Photo Removal
        await apiClient.delete(
          `/faculty/${encodeURIComponent(editFaculty.faculty_id)}/photo`,
          { withCredentials: true }
        );
        finalProfileUrl = null;
      }

      // 3. Update remaining details
      const updatedFacultyData = {
        ...editFaculty,
        profile_picture_url: finalProfileUrl
      };

      await handleUpdateFaculty(updatedFacultyData);
    } catch (err) {
      console.error("Error saving faculty:", err);
      toast.error(err.response?.data?.details || err.response?.data?.message || "Failed to update faculty");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-modal-overlay" style={{ zIndex: 9999 }}>
      <div 
        className="card glass-modal flex-col gap-md" 
        style={{ 
          width: "100%", 
          maxWidth: "480px", 
          borderRadius: "20px",
          background: "#FFFFFF",
          padding: "24px 28px",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.2)",
          maxHeight: "92vh",
          overflowY: "auto"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="title-medium" style={{ margin: 0, fontSize: "20px", color: "var(--text-primary)" }}>
            Edit Faculty Info
          </h3>
          <button 
            type="button"
            onClick={() => setEditFaculty(null)} 
            disabled={isSaving}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            aria-label="Close edit modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Picture Upload Section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", margin: "4px 0 8px 0" }}>
          <div style={{ position: "relative" }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                cursor: isSaving ? "not-allowed" : "pointer", 
                borderRadius: "50%", 
                padding: "4px", 
                background: "linear-gradient(135deg, var(--primary, #2563EB) 0%, var(--gold, #EAB308) 100%)",
                boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
                transition: "transform 0.2s ease"
              }}
              title="Click to upload new photo"
            >
              <FacultyAvatar 
                name={editFaculty.name} 
                photoUrl={previewUrl} 
                size={84} 
                style={{ border: "3px solid #FFFFFF" }}
              />
            </div>

            {/* Camera Badge Icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving}
              aria-label="Upload faculty photo"
              style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "var(--primary, #2563EB)",
                color: "#FFFFFF",
                border: "2px solid #FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
              }}
            >
              <Camera size={15} />
            </button>
          </div>

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/jpeg,image/png,image/webp,image/gif" 
            style={{ display: "none" }} 
          />

          {/* Actions & Hints */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving}
              className="btn"
              style={{ 
                padding: "4px 12px", 
                fontSize: "12px", 
                background: "var(--focus-ring, #EFF6FF)", 
                color: "var(--primary, #2563EB)",
                border: "1px solid rgba(37, 99, 235, 0.2)",
                borderRadius: "6px"
              }}
            >
              {previewUrl ? "Change Photo" : "Upload Photo"}
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isSaving}
                className="btn"
                style={{ 
                  padding: "4px 12px", 
                  fontSize: "12px", 
                  background: "#FEF2F2", 
                  color: "#DC2626", 
                  border: "1px solid #FCA5A5",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)", opacity: 0.8 }}>
            Supports JPG, PNG, WebP up to 5MB
          </span>
        </div>

        {/* Text Form Fields */}
        <div className="flex-col gap-sm">
          <label className="field-label" style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Faculty ID (Read Only)
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={editFaculty.faculty_id} 
            readOnly 
            style={{ opacity: 0.7, background: "#F8FAFC" }} 
          />
        </div>

        <div className="flex-col gap-sm">
          <label className="field-label" style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Full Name <span style={{ color: "red" }}>*</span>
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={editFaculty.name} 
            disabled={isSaving}
            onChange={(e) => setEditFaculty({ ...editFaculty, name: e.target.value })} 
          />
        </div>

        <div className="flex-col gap-sm">
          <label className="field-label" style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Email Address <span style={{ color: "red" }}>*</span>
          </label>
          <input 
            type="email" 
            className="form-input" 
            value={editFaculty.email} 
            disabled={isSaving}
            onChange={(e) => setEditFaculty({ ...editFaculty, email: e.target.value })} 
          />
        </div>

        <div className="flex-col gap-sm">
          <label className="field-label" style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Position / Designation
          </label>
          <select 
            className="form-input" 
            value={editFaculty.position || ""} 
            disabled={isSaving}
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
          <label className="field-label" style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Date of Birth
          </label>
          <input 
            type="date" 
            className="form-input" 
            disabled={isSaving}
            value={editFaculty.dob ? new Date(editFaculty.dob).toISOString().split('T')[0] : ""} 
            onChange={(e) => setEditFaculty({ ...editFaculty, dob: e.target.value })} 
          />
        </div>

        {/* Modal Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
          <button 
            type="button" 
            className="btn" 
            disabled={isSaving}
            onClick={() => setEditFaculty(null)}
            style={{ background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
          >
            Cancel
          </button>

          <button 
            type="button" 
            className="btn btn-primary" 
            disabled={isSaving}
            onClick={handleSave}
            style={{ 
              background: "var(--primary, #2563EB)", 
              color: "#FFFFFF", 
              border: "none", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px",
              padding: "10px 20px"
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
