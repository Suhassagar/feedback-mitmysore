import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUIStore } from "../../store/useUIStore";
import { 
  LayoutDashboard, Users, GraduationCap, 
  BookOpen, FileText, BarChart3, Settings, LogOut, ChevronDown 
} from "lucide-react";

export default function Sidebar({ dept_id }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { isSidebarCollapsed, toggleSidebar, isMobileMenuOpen, setMobileMenuOpen } = useUIStore();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navItems = [
    { name: "Overview", icon: <LayoutDashboard size={20} />, path: `/department-dashboard/${dept_id}` },
    { name: "Students", icon: <Users size={20} />, path: `/manage-students/${dept_id}` },
    { name: "Faculty", icon: <GraduationCap size={20} />, path: `/manage-faculty/${dept_id}` },
    { name: "Sessions", icon: <BookOpen size={20} />, path: `/manage-sessions/${dept_id}` },
    { name: "Courses", icon: <BookOpen size={20} />, path: `/add-course/${dept_id}` },
    { name: "Questions", icon: <FileText size={20} />, path: `/manage-questions/${dept_id}` },
    { name: "Remarks", icon: <BarChart3 size={20} />, path: `/department-remarks/${dept_id}` },
    { name: "Audit Logs", icon: <FileText size={20} />, path: `/audit-logs/${dept_id}` },
    { name: "Settings", icon: <Settings size={20} />, path: `/department-settings/${dept_id}` },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
      <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'sidebar-open' : ''}`} style={{ width: isSidebarCollapsed ? '80px' : '280px', transition: 'width 0.2s, transform 0.3s' }}>
      <div className="sidebar-logo" style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
        <div style={{ 
          width: '44px', height: '44px', borderRadius: '50%', 
          background: '#fff', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', 
          overflow: 'hidden', border: '1px solid var(--border-color)',
          flexShrink: 0
        }}>
          <img src="/logo.jpeg" alt="College Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
        </div>
        {!isSidebarCollapsed && <h2 style={{ fontSize: "18px", fontWeight: "800", color: "white", letterSpacing: "1px", whiteSpace: "nowrap" }}>MIT MYSORE</h2>}
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
              title={isSidebarCollapsed ? item.name : ""}
              style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', padding: isSidebarCollapsed ? '12px' : '12px 16px' }}
            >
              {item.icon}
              {!isSidebarCollapsed && <span>{item.name}</span>}
            </button>
          );
        })}
      </nav>

      <div>
        <button 
          className="sidebar-nav-item" 
          onClick={handleLogout} 
          title={isSidebarCollapsed ? "Logout" : ""}
          style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', padding: isSidebarCollapsed ? '12px' : '12px 16px' }}
        >
          <LogOut size={20} />
          {!isSidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
