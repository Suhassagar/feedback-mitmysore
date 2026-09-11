import { useEffect, useRef } from "react";
import { Bell, CheckCircle, Shield } from "lucide-react";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { useDepartmentStore } from "../../store/useDepartmentStore";

export default function NotificationBell({ dept_id }) {
  const notifRef = useRef(null);
  const { 
    pendingRegistrations, loadPendingRegistrations, 
    showNotifications, setShowNotifications,
    approveFaculty, rejectFaculty
  } = useDepartmentStore();

  useEffect(() => {
    function handleNotifClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleNotifClickOutside);
    return () => document.removeEventListener("mousedown", handleNotifClickOutside);
  }, [setShowNotifications]);

  useEffect(() => {
    loadPendingRegistrations(dept_id);

    // WebSocket Listener for real-time notifications
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:8081", { withCredentials: true });
    socket.emit("register_dashboard", { dept_id });
    
    socket.on("NEW_FEEDBACK_RECEIVED", (data) => {
      if (data.dept_id === dept_id) {
        toast.success("New Feedback Received!", { icon: '🟢' });
      }
    });

    socket.on("NEW_FACULTY_REGISTRATION", (data) => {
      if (data.dept_id === dept_id) {
        toast("New Faculty Registration Pending Approval!", { icon: '🧑‍🏫', duration: 5000 });
        loadPendingRegistrations(dept_id);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [dept_id, loadPendingRegistrations]);

  const handleApprove = async (faculty_id) => {
    const res = await approveFaculty(faculty_id, dept_id);
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
  };

  const handleReject = async (faculty_id) => {
    const res = await rejectFaculty(faculty_id, dept_id);
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
  };

  return (
    <div className="notif-container" ref={notifRef} style={{ position: "relative" }}>
      <button 
        className="btn-icon" 
        onClick={() => setShowNotifications(!showNotifications)}
        style={{ position: "relative", background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}
      >
        <Bell size={24} />
        {pendingRegistrations.length > 0 && (
          <span className="badge" style={{
            position: 'absolute', top: '-5px', right: '-5px',
            background: 'var(--error-color)', color: 'white',
            borderRadius: '50%', width: '18px', height: '18px',
            fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {pendingRegistrations.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="notif-dropdown card" style={{ position: "absolute", top: "45px", right: 0, width: "320px", maxHeight: "400px", overflowY: "auto", zIndex: 1000, padding: 0 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)", background: "var(--background-color)" }}>
            <h3 className="title-small" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={18} className="text-gold" />
              Pending Approvals
            </h3>
          </div>
          
          {pendingRegistrations.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
              <CheckCircle size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
              No pending registrations.
            </div>
          ) : (
            <div className="flex-col">
              {pendingRegistrations.map(reg => (
                <div key={reg.faculty_id} className="notif-item" style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <strong>{reg.name}</strong> ({reg.faculty_id})<br />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{reg.email}</span>
                  </div>
                  <div className="flex-row gap-sm">
                    <button className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "12px", flex: 1 }} onClick={() => handleApprove(reg.faculty_id)}>Approve</button>
                    <button className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "12px", flex: 1, borderColor: "var(--error-color)", color: "var(--error-color)" }} onClick={() => handleReject(reg.faculty_id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
