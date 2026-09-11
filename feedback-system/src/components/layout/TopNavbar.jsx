import { useEffect, useRef } from "react";
import { Search, GraduationCap, User, Menu } from "lucide-react";
import { useUIStore } from "../../store/useUIStore";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";
import NotificationBell from "../ui/NotificationBell";

export default function TopNavbar({ dept_id }) {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const { user } = useAuth();
  const { 
    globalSearchQuery, setGlobalSearchQuery, 
    showSearchDropdown, setShowSearchDropdown, 
    searchResults, setSearchResults,
    setMobileMenuOpen
  } = useUIStore();
  const DEPARTMENT_NAMES = {
    cs: "Computer Science",
    cse: "Computer Science",
    is: "Information Science",
    ise: "Information Science",
    ec: "Electronics",
    ece: "Electronics",
    ee: "Electrical",
    eee: "Electrical",
    me: "Mechanical",
    cv: "Civil",
  };
  
  // Use actual db name if available, fallback to dictionary, then raw id
  const deptName = (user?.dept_id === dept_id && user?.dept_name) 
    ? user.dept_name 
    : (DEPARTMENT_NAMES[dept_id?.toLowerCase()] || dept_id);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowSearchDropdown]);

  useEffect(() => {
    if (globalSearchQuery.length < 2) {
      setSearchResults({ faculty: [], students: [], sessions: [] });
      setShowSearchDropdown(false);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/search/${dept_id}?q=${globalSearchQuery}`);
        setSearchResults(res.data);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error("Global search failed:", err);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [globalSearchQuery, dept_id, setSearchResults, setShowSearchDropdown]);

  const handleSearchResultClick = (path) => {
    navigate(path);
    setShowSearchDropdown(false);
    setGlobalSearchQuery("");
  };

  return (
    <header className="dashboard-header">
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={24} />
        </button>
        {/* Search Bar */}
        <div className="header-search" ref={searchRef}>
        <Search size={18} />
        <input
          type="text"
          placeholder="Search students, faculty, sessions..."
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          onFocus={() => { if (globalSearchQuery.length >= 2) setShowSearchDropdown(true); }}
        />
        <div className="header-search-shortcut">⌘K</div>

        {showSearchDropdown && (
          <div className="card" style={{ position: "absolute", top: "45px", left: 0, width: "100%", maxHeight: "400px", overflowY: "auto", zIndex: 1000, boxShadow: "var(--shadow-hover)" }}>
            {searchResults.faculty.length === 0 && searchResults.students.length === 0 && searchResults.sessions.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)" }}>No results found.</div>
            ) : (
              <div className="flex-col">
                {/* Faculty Results */}
                {searchResults.faculty.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0", padding: "8px 12px", background: "var(--bg-light)", fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Faculty</h4>
                    {searchResults.faculty.map(f => (
                      <div key={f.faculty_id} onClick={() => handleSearchResultClick(`/manage-faculty/${dept_id}?highlight=${f.faculty_id}`)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-color)" }} onMouseEnter={(e) => e.currentTarget.style.background='var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>
                        <strong>{f.name}</strong> <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>({f.faculty_id})</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Student Results */}
                {searchResults.students.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0", padding: "8px 12px", background: "var(--bg-light)", fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Students</h4>
                    {searchResults.students.map(s => (
                      <div key={s.enrollment_no} onClick={() => handleSearchResultClick(`/manage-students/${dept_id}?highlight=${s.enrollment_no}`)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-color)" }} onMouseEnter={(e) => e.currentTarget.style.background='var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>
                        <strong>{s.name}</strong> <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>({s.enrollment_no})</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Session Results */}
                {searchResults.sessions.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0", padding: "8px 12px", background: "var(--bg-light)", fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Sessions</h4>
                    {searchResults.sessions.map(s => (
                      <div key={s.session_id} onClick={() => handleSearchResultClick(`/manage-sessions/${dept_id}?highlight=${s.session_id}`)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-color)" }} onMouseEnter={(e) => e.currentTarget.style.background='var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>
                        <strong>{s.session_id}</strong> <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>({s.semester})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Department Name / Title */}
      <div className="desktop-title" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <div style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--navy) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontWeight: "800",
          fontSize: "clamp(14px, 4vw, 19px)",
          letterSpacing: "-0.5px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}>
          {deptName ? deptName.toUpperCase() : ""}
        </div>
      </div>

      {/* Right Side Icons */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <NotificationBell dept_id={dept_id} />
        
        <div style={{ 
          width: "40px", height: "40px", borderRadius: "50%", 
          background: "var(--primary)", color: "white", 
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: "bold", boxShadow: "var(--shadow-btn)"
        }}>
          <User size={20} />
        </div>
      </div>
    </header>
  );
}
