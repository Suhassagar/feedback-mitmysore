import { useState, useRef } from "react";
import apiClient from "../services/apiClient";
import * as XLSX from "xlsx";
import { UploadCloud, X, CheckCircle, AlertCircle, Download } from "lucide-react";
import { toast } from "react-hot-toast";

export default function BulkUploadModal({ type, dept_id, selectedSem, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  const expectedColumns = type === "students" 
    ? ["usn", "name", "section", "email"] // sem is optional
    : type === "courses"
    ? ["course_code", "course_name", "sem"]
    : type === "questions"
    ? ["heading", "question"]
    : ["faculty_id", "name", "email"];

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!uploadedFile) return;

    const validExts = [".csv", ".xlsx", ".xls"];
    const fileExt = uploadedFile.name.substring(uploadedFile.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExts.includes(fileExt)) {
      setError("Invalid file type. Please upload a .csv or .xlsx file.");
      return;
    }

    setFile(uploadedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        let rawData = XLSX.utils.sheet_to_json(ws, { raw: false });
        
        let normalizedData = rawData.map(row => {
          let newRow = {};
          Object.keys(row).forEach(key => {
            newRow[key.trim().toLowerCase()] = typeof row[key] === "string" ? row[key].trim() : row[key];
          });
          
          if (type === "students") {
            if (newRow.usn) newRow.usn = String(newRow.usn).trim().toUpperCase();
            if (newRow.section) newRow.section = String(newRow.section).trim().toUpperCase();
            if (newRow.sem) newRow.sem = parseInt(newRow.sem, 10);
            if (selectedSem) newRow.sem = parseInt(selectedSem, 10);
            if (newRow.email) newRow.email = String(newRow.email).trim().toLowerCase();
          }
          return newRow;
        });

        normalizedData = normalizedData.filter(row => Object.keys(row).length > 0);

        if (normalizedData.length === 0) {
          throw new Error("The uploaded file is empty.");
        }

        const missingCols = expectedColumns.filter(col => !Object.keys(normalizedData[0]).includes(col));
        if (missingCols.length > 0) {
          throw new Error(`Missing required columns: ${missingCols.join(", ")}`);
        }

        setData(normalizedData);
      } catch (err) {
        console.error("Parse error:", err);
        setError(err.message || "Failed to parse file. Ensure it matches the template.");
        setData([]);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e);
  };

  const handleUpload = async () => {
    if (data.length === 0) return;
    setIsUploading(true);
    
    try {
      const payload = { dept_id };
      payload[type] = data;

      const apiEndpoint = type === "questions" ? `/department/questions/bulk` : `/${type}/bulk`;
      const res = await apiClient.post(apiEndpoint, payload, { withCredentials: true });
      toast.success(res.data.message || `Successfully imported ${data.length} records!`);
      onSuccess();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.error || "Bulk upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      type === "students" 
        ? { usn: "1BM20CS001", name: "John Doe", section: "A", email: "johndoe@example.com" }
        : type === "courses"
        ? { course_code: "CS101", course_name: "Database Management", sem: 4 }
        : type === "questions"
        ? { heading: "Teaching Effectiveness", question: "Clarity of explanation from the faculty." }
        : { faculty_id: "FAC001", name: "Dr. Smith", email: "smith@mit.gmail.com" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${type}_import_template.xlsx`);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#fff", width: "92%", maxWidth: "700px", borderRadius: "16px", padding: "clamp(16px, 4vw, 32px)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "90vh", overflowY: "auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "var(--text-primary)" }}>Bulk Import {type.charAt(0).toUpperCase() + type.slice(1)}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={24} />
          </button>
        </div>

        {/* Drag and Drop Zone */}
        {!data.length && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "var(--primary)" : "var(--border-color)"}`,
              borderRadius: "12px",
              padding: "40px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: isDragging ? "var(--focus-ring)" : "#FAFAFA",
              transition: "all 0.2s ease"
            }}
          >
            <UploadCloud size={48} color={isDragging ? "var(--primary)" : "var(--text-secondary)"} style={{ marginBottom: "16px" }} />
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "16px" }}>Drag & Drop your Excel or CSV file here</h3>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>or click to browse from your computer</p>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .xlsx, .xls" style={{ display: "none" }} />
          </div>
        )}

        {error && (
          <div style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", display: "flex", alignItems: "center", gap: "12px", color: "#DC2626" }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: "14px", fontWeight: "500" }}>{error}</span>
          </div>
        )}

        {/* Template Download */}
        {!data.length && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={downloadTemplate} style={{ background: "transparent", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <Download size={16} /> Download Template
            </button>
          </div>
        )}

        {/* Live Preview */}
        {data.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", fontWeight: "600" }}>
                <CheckCircle size={20} /> Successfully parsed {data.length} rows
              </div>
              <button onClick={() => { setData([]); setFile(null); }} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}>
                Choose different file
              </button>
            </div>
            
            <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead style={{ background: "var(--bg-main)", position: "sticky", top: 0 }}>
                  <tr>
                    {expectedColumns.map(col => (
                      <th key={col} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      {expectedColumns.map(col => (
                        <td key={col} style={{ padding: "12px 16px", color: "var(--text-primary)" }}>
                          {row[col] || <span style={{ color: "red" }}>Missing</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 10 && <div style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center" }}>Showing first 10 rows of {data.length}</div>}
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button className="btn" onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>Cancel</button>
              <button className="btn" onClick={handleUpload} disabled={isUploading} style={{ background: "var(--primary)", color: "#fff", border: "none" }}>
                {isUploading ? "Uploading..." : `Import ${data.length} Records`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
