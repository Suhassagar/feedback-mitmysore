import { useEffect, useRef, useState } from "react";
import { Search, GraduationCap, User, Menu, LogOut, ShieldCheck, ChevronDown } from "lucide-react";
import { useUIStore } from "../../store/useUIStore";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";
import NotificationBell from "../ui/NotificationBell";
import { useDepartmentProfile } from "../../hooks/useDepartmentName";
import DepartmentAvatar from "../ui/DepartmentAvatar";

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

  const deptProfile = useDepartmentProfile(dept_id);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef(null);


  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
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
          {deptProfile?.dept_name ? deptProfile.dept_name.toUpperCase() : (dept_id || '').toUpperCase()}
        </div>
      </div>

      {/* Right Side Icons & Profile Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <NotificationBell dept_id={dept_id} />
        
        {/* Department Profile Avatar & Popover */}
        <div style={{ position: "relative" }} ref={profileRef}>
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              outline: "none"
            }}
            title={deptProfile?.dept_name || dept_id}
          >
            <DepartmentAvatar
              dept_id={dept_id}
              logo_url={deptProfile?.logo_url}
              logo_lqip={deptProfile?.logo_lqip}
              size={40}
              showRing={true}
            />
            <ChevronDown size={14} color="#64748B" style={{ transform: showProfileDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showProfileDropdown && (
            <div
              className="card"
              style={{
                position: "absolute",
                top: "50px",
                right: 0,
                width: "280px",
                padding: "16px",
                zIndex: 1000,
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)",
                borderRadius: "16px",
                border: "1px solid var(--border-color)",
                background: "#FFFFFF"
              }}
            >
              {/* Header inside popover */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <DepartmentAvatar
                  dept_id={dept_id}
                  logo_url={deptProfile?.logo_url}
                  logo_lqip={deptProfile?.logo_lqip}
                  size={46}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {deptProfile?.dept_name || dept_id}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", padding: "2px 6px", borderRadius: "4px" }}>
                      {dept_id.toUpperCase()}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {user?.role === 'admin' ? 'Admin View' : 'Department Portal'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ height: "1px", background: "var(--border-color)", margin: "8px 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    navigate(`/settings/${dept_id}`);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <ShieldCheck size={16} color="var(--primary)" />
                  <span>Department Settings</span>
                </button>

                <button
                  onClick={async () => {
                    try {
                      await apiClient.post("/logout");
                      window.location.href = "/";
                    } catch {
                      window.location.href = "/";
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#EF4444",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={16} color="#EF4444" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
