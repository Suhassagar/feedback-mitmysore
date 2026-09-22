import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../services/apiClient";
import { Plus, Edit, Trash2, FileText, CheckCircle2, Upload, Download, Folder } from "lucide-react";
import { toast } from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import BulkUploadModal from "../components/BulkUploadModal";

export default function ManageQuestions() {
  const { dept_id } = useParams();
  const [questions, setQuestions] = useState([]);
  const [groupedQuestions, setGroupedQuestions] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddHeadingModal, setShowAddHeadingModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Form state
  const [questionText, setQuestionText] = useState("");
  const [newHeadingName, setNewHeadingName] = useState("");
  const [targetHeading, setTargetHeading] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchQuestions();
  }, [dept_id]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/questions/${dept_id}`, { withCredentials: true });
      const data = res.data;
      setQuestions(data);
      
      // Group by heading
      const grouped = {};
      data.forEach(q => {
        const heading = q.question_heading || "General Feedback";
        if (!grouped[heading]) grouped[heading] = [];
        grouped[heading].push(q);
      });
      setGroupedQuestions(grouped);
      
    } catch (err) {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHeading = (e) => {
    e.preventDefault();
    if (!newHeadingName.trim()) return toast.error("Heading name cannot be empty");
    
    // Just add an empty group locally, it will be saved to DB when a question is added to it
    setGroupedQuestions(prev => {
      if (prev[newHeadingName]) {
        toast.error("Heading already exists!");
        return prev;
      }
      return { ...prev, [newHeadingName]: [] };
    });
    
    toast.success("New Heading Created!");
    setNewHeadingName("");
    setShowAddHeadingModal(false);
  };

  const openAddQuestionModal = (heading) => {
    setTargetHeading(heading);
    setQuestionText("");
    setShowAddQuestionModal(true);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return toast.error("Question cannot be empty");
    
    try {
      await apiClient.post("/department/questions", { 
        question_text: questionText, 
        dept_id,
        question_heading: targetHeading
      }, { withCredentials: true });
      
      toast.success("Question added!");
      setShowAddQuestionModal(false);
      setQuestionText("");
      fetchQuestions();
    } catch (err) {
      toast.error("Error adding question");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return toast.error("Question cannot be empty");

    try {
      await apiClient.put(`/department/questions/${editingQuestion.question_id}`, { question_text: questionText }, { withCredentials: true });
      toast.success("Question updated!");
      setQuestionText("");
      setEditingQuestion(null);
      setShowEditModal(false);
      fetchQuestions();
    } catch (err) {
      toast.error("Error updating question");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question? Associated feedback may be lost.")) return;
    try {
      await apiClient.delete(`/department/questions/${id}`, { withCredentials: true });
      toast.success("Question deleted");
      fetchQuestions();
    } catch (err) {
      toast.error("Error deleting question");
    }
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setQuestionText(q.question_text);
    setShowEditModal(true);
  };



  return (
    <PageTransition>
      <div style={{ animation: "fadeIn 0.3s ease-out" }}>
        <style>
          {`
            @media (max-width: 640px) {
              .questions-header-actions {
                width: 100% !important;
              }
              .questions-header-actions button {
                flex: 1 1 140px;
                justify-content: center;
              }
              .question-heading-header {
                padding: 12px 14px !important;
              }
              .question-heading-body {
                padding: 12px 14px !important;
              }
              .question-row-item {
                padding: 12px 12px !important;
              }
            }
          `}
        </style>
        
        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "32px", padding: "10px 0" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ background: "var(--focus-ring)", padding: "10px", borderRadius: "10px" }}>
                <Folder size={24} color="var(--primary)" />
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
                Form Builder
              </h1>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "15px", margin: 0, fontWeight: "500" }}>
              Structure your feedback form by grouping questions under specific headings.
            </p>
          </div>
          
          <div className="questions-header-actions" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn hoverable" style={{ padding: "10px 20px", height: "42px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }} onClick={() => setShowBulkModal(true)}>
              <Upload size={16} /> Bulk Import
            </button>
            <button className="btn hoverable" style={{ padding: "10px 20px", height: "42px", display: "flex", alignItems: "center", gap: "8px", background: "var(--focus-ring)", color: "var(--primary)", border: "none", fontWeight: "600" }} onClick={() => setShowAddHeadingModal(true)}>
              <Plus size={16} strokeWidth={2.5} /> Add Heading
            </button>
          </div>
        </div>

        {/* Headings and Questions List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>Loading form structure...</div>
        ) : Object.keys(groupedQuestions).length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)", background: "rgba(241, 245, 249, 0.5)", border: "2px dashed #cbd5e1", borderRadius: "16px" }}>
            <FileText size={48} color="#94a3b8" style={{ marginBottom: "16px", opacity: 0.5 }} />
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>No questions found</h3>
            <p style={{ margin: 0 }}>Click 'Add New Heading' to start building your form.</p>
          </div>
        ) : (
          <div className="flex-col" style={{ gap: "24px" }}>
            {Object.entries(groupedQuestions).map(([heading, headingQuestions], hIdx) => (
              <div key={hIdx} className="card" style={{ padding: "0", borderRadius: "12px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
                
                {/* Heading Header */}
                <div className="question-heading-header" style={{ background: "#F8FAFC", padding: "16px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                     <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                        {hIdx + 1}
                     </div>
                     <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0F172A" }}>{heading}</h2>
                   </div>
                   <button 
                     className="btn hoverable" 
                     style={{ 
                       padding: "6px 12px", 
                       fontSize: "13px", 
                       height: "32px", 
                       display: "flex", 
                       alignItems: "center", 
                       gap: "6px",
                       background: "var(--focus-ring)",
                       color: "var(--primary)",
                       border: "none",
                       fontWeight: "600",
                       borderRadius: "8px"
                     }} 
                     onClick={() => openAddQuestionModal(heading)}
                   >
                     <Plus size={14} strokeWidth={2.5} /> Add Question
                   </button>
                </div>

                {/* Questions under Heading */}
                <div className="question-heading-body" style={{ padding: "16px 24px" }}>
                  {headingQuestions.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: "14px", background: "#F1F5F9", borderRadius: "8px", border: "1px dashed #CBD5E1" }}>
                      No questions in this section yet. Click "Add Question Here".
                    </div>
                  ) : (
                    <div className="flex-col" style={{ gap: "8px" }}>
                      {headingQuestions.map((q, idx) => (
                        <div key={q.question_id} className="question-row-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 16px", border: "1px solid #F1F5F9", background: "#fff", borderRadius: "8px", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: "1 1 200px", minWidth: 0 }}>
                            <div style={{ color: "#94A3B8", fontWeight: "700", fontSize: "13px", minWidth: "24px", paddingTop: "2px" }}>
                              Q{idx + 1}.
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: "0", fontSize: "14px", color: "var(--text-primary)", fontWeight: "500", wordBreak: "break-word" }}>{q.question_text}</h4>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                            <button 
                              className="btn hoverable" 
                              style={{ padding: "6px", background: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", border: "none", borderRadius: "6px" }}
                              onClick={() => openEditModal(q)}
                              title="Edit Question"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="btn hoverable" 
                              style={{ padding: "6px", background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", border: "none", borderRadius: "6px" }}
                              onClick={() => handleDelete(q.question_id)}
                              title="Delete Question"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD HEADING */}
      {showAddHeadingModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, animation: "fadeIn 0.2s" }}>
          <div className="card" style={{ width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "16px", overflow: "hidden", animation: "slideUp 0.3s ease-out", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ padding: "16px 20px", background: "linear-gradient(to right, #f8fafc, #fff)", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>Create New Heading</h3>
            </div>
            <form onSubmit={handleCreateHeading} style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Heading Name</label>
                <input 
                  type="text"
                  className="input-field" 
                  value={newHeadingName} 
                  onChange={(e) => setNewHeadingName(e.target.value)}
                  placeholder="e.g. Teaching Effectiveness"
                  required
                  style={{ width: "100%", fontSize: "14px", padding: "10px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn hoverable" style={{ padding: "8px 16px", fontSize: "13px", background: "#f1f5f9", color: "#64748b", fontWeight: "600", borderRadius: "8px" }} onClick={() => setShowAddHeadingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary hoverable" style={{ padding: "8px 16px", fontSize: "13px", borderRadius: "8px" }}>Create Heading</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD QUESTION */}
      {showAddQuestionModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, animation: "fadeIn 0.2s" }}>
          <div className="card" style={{ width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "16px", overflow: "hidden", animation: "slideUp 0.3s ease-out", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ padding: "16px 20px", background: "linear-gradient(to right, #f8fafc, #fff)", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>Add Question to "{targetHeading}"</h3>
            </div>
            <form onSubmit={handleAddQuestion} style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Question Text</label>
                <textarea 
                  className="input-field" 
                  value={questionText} 
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter your question here..."
                  rows={3}
                  required
                  style={{ width: "100%", resize: "none", fontSize: "14px", padding: "10px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn hoverable" style={{ padding: "8px 16px", fontSize: "13px", background: "#f1f5f9", color: "#64748b", fontWeight: "600", borderRadius: "8px" }} onClick={() => setShowAddQuestionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary hoverable" style={{ padding: "8px 16px", fontSize: "13px", borderRadius: "8px" }}>Add Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT QUESTION */}
      {showEditModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, animation: "fadeIn 0.2s" }}>
          <div className="card" style={{ width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "16px", overflow: "hidden", animation: "slideUp 0.3s ease-out", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ padding: "16px 20px", background: "linear-gradient(to right, #f8fafc, #fff)", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ background: "var(--focus-ring)", padding: "8px", borderRadius: "8px" }}>
                  <Edit size={16} color="var(--primary)" />
                </div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>Edit Question</h3>
              </div>
            </div>
            <form onSubmit={handleEditSubmit} style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Question Text</label>
                <textarea 
                  className="input-field" 
                  value={questionText} 
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the feedback question..."
                  rows={2}
                  required
                  style={{ width: "100%", resize: "none", fontSize: "14px", padding: "10px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn hoverable" style={{ padding: "8px 16px", fontSize: "13px", background: "#f1f5f9", color: "#64748b", fontWeight: "600", borderRadius: "8px" }} onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary hoverable" style={{ padding: "8px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "8px" }}>
                  <CheckCircle2 size={14} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {showBulkModal && (
        <BulkUploadModal 
          type="questions" 
          dept_id={dept_id} 
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            fetchQuestions();
          }} 
        />
      )}
    </PageTransition>
  );
}
