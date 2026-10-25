import { useState, useEffect, useRef } from "react";
import apiClient from "../services/apiClient";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import PageTransition from "./PageTransition";
import { useAuth } from "../context/AuthContext";
import CopilotWidget from "./copilot/CopilotWidget";
import { 
  LayoutDashboard, Building, Users, GraduationCap, 
  Calendar, BarChart3, FileText, Settings, LogOut, 
  Bell, Search, ChevronDown, Activity, Menu
} from "lucide-react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search State
  const [globalSearch, setGlobalSearch] = useState("");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <PageTransition>
      <div className="dashboard-layout theme-admin admin-theme" style={{ '--sidebar-bg': '#062E1B' }}>
        
        <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
        
        {/* ================= SIDEBAR ================= */}
        <aside className={`dashboard-sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`} style={{ background: "var(--navy, #0F172A)", borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", gap: "14px", paddingBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "24px" }}>
            <div style={{ 
              width: '44px', height: '44px', borderRadius: '50%', 
              background: '#fff', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', 
              overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)',
              flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <img src="/logo.jpeg" alt="College Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "16px", fontWeight: "800", color: "#FFFFFF", letterSpacing: "1px", whiteSpace: "nowrap" }}>MIT MYSORE</span>
              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "500", marginTop: "1px" }}>Central Admin Portal</span>
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
            <form 
              className="header-search" 
              onSubmit={(e) => {
                e.preventDefault();
                if (globalSearch.trim()) {
                  navigate(`/admin/faculty?search=${encodeURIComponent(globalSearch.trim())}`);
                }
              }}
            >
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search across departments..." 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{ background: "#F3F4F6", border: "none", width: "100%", maxWidth: "350px", padding: "10px 15px", borderRadius: "20px" }}
              />
            </form>
          </div>

          <div className="header-actions">
            <button 
              className="header-icon-btn" 
              onClick={() => navigate("/admin/system-logs")} 
              title="System Activity Logs" 
              style={{ background: "transparent", border: "none", cursor: "pointer", position: "relative", padding: "8px" }}
            >
              <Bell size={20} color="var(--navy)" />
            </button>
            
            <div className="header-profile" style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "5px 10px", borderRadius: "8px", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "#F3F4F6"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'Admin')}&background=16A34A&color=fff`} alt="Profile" style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
              <div className="header-profile-info" style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>{user?.username || "Administrator"}</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Central Admin</span>
              </div>
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
          </div>
        </header>

        {/* ================= MAIN DYNAMIC CONTENT ================= */}
        <main className="dashboard-main" style={{ background: "#F8FAFC", padding: "clamp(16px, 3vw, 30px)", overflowY: "auto", height: "calc(100vh - 70px)" }}>
          <Outlet />
        </main>

        {/* Global SAGAR Copilot for Admin */}
        <CopilotWidget />
      </div>
    </PageTransition>
  );
}
