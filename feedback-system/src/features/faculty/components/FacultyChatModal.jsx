import { MessageSquare, Send, CheckCheck } from "lucide-react";

export default function FacultyChatModal({
  showAddNoteModal,
  setShowAddNoteModal,
  selectedFaculty,
  facultyNotes,
  newNoteText,
  setNewNoteText,
  handleAddNote
}) {
  if (!showAddNoteModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowAddNoteModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(8px)", zIndex: 100000, display: "flex", justifyContent: "center", alignItems: "center", animation: "fadeIn 0.2s" }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "500px", height: "80vh", maxHeight: "700px", borderRadius: "24px", background: "#ffffff", boxShadow: "0 25px 50px -12px var(--focus-ring)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)", border: "1px solid var(--focus-ring)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "16px" }}>
              {selectedFaculty?.name?.charAt(0)}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>{selectedFaculty?.name}</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>Faculty ID: {selectedFaculty?.faculty_id}</p>
            </div>
          </div>
          <button className="btn" onClick={() => setShowAddNoteModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "8px" }}>✕</button>
        </div>

        <div style={{ flex: 1, padding: "24px", overflowY: "auto", background: "#efeae2", display: "flex", flexDirection: "column", gap: "16px" }}>
          {facultyNotes.length === 0 ? (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
              <MessageSquare size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
              Start a conversation with {selectedFaculty?.name}.
            </div>
          ) : (
            facultyNotes.slice().reverse().map(note => {
              const isSentByDept = note.sender_type === 'department';
              return (
                <div key={note.note_id} style={{ 
                  alignSelf: isSentByDept ? "flex-end" : "flex-start", 
                  maxWidth: "75%", 
                  background: isSentByDept ? "#dcf8c6" : "#ffffff", 
                  color: "#111b21", 
                  padding: "10px 14px", 
                  borderRadius: "16px", 
                  borderBottomRightRadius: isSentByDept ? "2px" : "16px",
                  borderBottomLeftRadius: isSentByDept ? "16px" : "2px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)", 
                  position: "relative", 
                  minWidth: "120px" 
                }}>
                  <p style={{ margin: "0 0 14px 0", fontSize: "14px", lineHeight: "1.4", wordBreak: "break-word", color: "#111b21" }}>{note.note_text}</p>
                  <div style={{ position: "absolute", bottom: "6px", right: "10px", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "rgba(17, 27, 33, 0.6)", fontWeight: "500" }}>
                    <span>{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isSentByDept && (note.is_read ? (
                      <CheckCheck size={14} color="#53bdeb" />
                    ) : (
                      <CheckCheck size={14} color="#8696a0" />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", background: "#fff", display: "flex", gap: "12px", alignItems: "flex-end" }}>
          <textarea
            style={{ flex: 1, minHeight: "44px", maxHeight: "120px", resize: "none", padding: "12px 16px", borderRadius: "22px", border: "1px solid var(--border-color)", background: "#f8fafc", outline: "none", fontSize: "14px", lineHeight: "1.4", overflowY: "auto" }}
            placeholder="Type a message..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <button 
            onClick={handleAddNote} 
            disabled={!newNoteText.trim()} 
            style={{ width: "44px", height: "44px", borderRadius: "50%", background: newNoteText.trim() ? "var(--primary)" : "var(--border-color)", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: newNoteText.trim() ? "pointer" : "not-allowed", flexShrink: 0, transition: "background 0.2s" }}
          >
            <Send size={18} style={{ marginLeft: "-2px" }} />
          </button>
        </div>
        
      </div>
    </div>
  );
}
