import { useState, useEffect, useRef } from "react";
import apiClient from "../services/apiClient";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import PageTransition from "./PageTransition";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, Building, Users, GraduationCap, 
  Calendar, BarChart3, FileText, Settings, LogOut, 
  Bell, Search, ChevronDown, Activity, Menu
} from "lucide-react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const { logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search State
  const [globalSearch, setGlobalSearch] = useState("");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <PageTransition>
      <div className="dashboard-layout department-theme" style={{ '--sidebar-bg': '#0B1120' }}>
        
        <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
        
        {/* ================= SIDEBAR ================= */}
        <aside className={`dashboard-sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`} style={{ background: "var(--sidebar-bg)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="sidebar-logo">
            <img src="/logo.jpeg" alt="Logo" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "1px" }}>MIT MYSORE</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Feedback System</span>
            </div>
          </div>

          <nav style={{ flex: 1, marginTop: "10px" }}>
            <button className={`sidebar-nav-item ${currentPath === "/admin-dashboard" ? "active" : ""}`} onClick={() => { navigate(`/admin-dashboard`); setIsSidebarOpen(false); }}>
              <LayoutDashboard size={20} /><span>Dashboard</span>
            </button>
            <button className={`sidebar-nav-item ${currentPath.includes("/admin/departments") ? "active" : ""}`} onClick={() => { navigate(`/admin/departments`); setIsSidebarOpen(false); }}>
              <Building size={20} /><span>Departments</span>
            </button>
            <button className={`sidebar-nav-item ${currentPath.includes("/admin/faculty") ? "active" : ""}`} onClick={() => { navigate(`/admin/faculty`); setIsSidebarOpen(false); }}>
              <Users size={20} /><span>Faculty</span>
            </button>
            <button className={`sidebar-nav-item ${currentPath.includes("/admin/students") ? "active" : ""}`} onClick={() => { navigate(`/admin/students`); setIsSidebarOpen(false); }}>
              <GraduationCap size={20} /><span>Students</span>
            </button>
            <button className={`sidebar-nav-item ${currentPath.includes("/admin/sessions") ? "active" : ""}`} onClick={() => { navigate(`/admin/sessions`); setIsSidebarOpen(false); }}>
              <Calendar size={20} /><span>Sessions</span>
            </button>
            <button className={`sidebar-nav-item ${currentPath.includes("/admin/analytics") ? "active" : ""}`} onClick={() => { navigate(`/admin/analytics`); setIsSidebarOpen(false); }}>
              <BarChart3 size={20} /><span>Analytics</span>
            </button>
            <button className={`sidebar-nav-item ${currentPath.includes("/admin/reports") ? "active" : ""}`} onClick={() => { navigate(`/admin/reports`); setIsSidebarOpen(false); }}>
              <FileText size={20} /><span>Reports</span>
            </button>
            <button className={`sidebar-nav-item ${currentPath.includes("/admin/system-logs") ? "active" : ""}`} onClick={() => { navigate(`/admin/system-logs`); setIsSidebarOpen(false); }}>
              <Activity size={20} /><span>System Logs</span>
            </button>
            <button className={`sidebar-nav-item ${currentPath.includes("/admin/settings") ? "active" : ""}`} onClick={() => { navigate(`/admin/settings`); setIsSidebarOpen(false); }}>
              <Settings size={20} /><span>Settings</span>
            </button>
          </nav>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
             {/* Admin drill-down exit button if they are coming from a department */}
            <button className="sidebar-nav-item" onClick={handleLogout} style={{ color: "#FCA5A5" }}>
              <LogOut size={20} /><span>Logout</span>
            </button>
          </div>
        </aside>

        {/* ================= HEADER ================= */}
        <header className="dashboard-header" style={{ background: "#ffffff", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="header-search">
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{ background: "#F3F4F6", border: "none", width: "100%", maxWidth: "350px", padding: "10px 15px", borderRadius: "20px" }}
              />
            </div>
          </div>

          <div className="header-actions">
            <button className="header-icon-btn" style={{ background: "transparent", border: "none", cursor: "pointer", position: "relative" }}>
              <Bell size={20} color="var(--navy)" />
              <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "var(--color-danger)", color: "#fff", fontSize: "10px", width: "16px", height: "16px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>8</span>
            </button>
            
            <div className="header-profile" style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "5px 10px", borderRadius: "8px", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "#F3F4F6"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
              <img src={`https://ui-avatars.com/api/?name=Admin&background=2563EB&color=fff`} alt="Profile" style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
              <div className="header-profile-info" style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>Dr. Principal</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Principal</span>
              </div>
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
          </div>
        </header>

        {/* ================= MAIN DYNAMIC CONTENT ================= */}
        <main className="dashboard-main" style={{ background: "#F8FAFC", padding: "clamp(16px, 3vw, 30px)", overflowY: "auto", height: "calc(100vh - 70px)" }}>
          <Outlet />
        </main>
      </div>
    </PageTransition>
  );
}
