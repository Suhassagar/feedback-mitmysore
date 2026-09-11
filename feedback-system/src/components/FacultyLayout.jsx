import { Outlet, useNavigate, useLocation } from "react-router-dom";
import apiClient from "../services/apiClient";
import { LogOut, LayoutDashboard, User, Settings, Menu, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageTransition from "./PageTransition";
import { useAuth } from "../context/AuthContext";
import FacultyMessagesModal from "../features/faculty/components/FacultyMessagesModal";

export default function FacultyLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState({ name: "Loading...", email: "", dept_name: "Loading...", faculty_id: "" });
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const id = user?.faculty_id;
        if (!id) return;
        const res = await apiClient.get(`/faculty-analytics/${id}`, { withCredentials: true });
        if (res.data && res.data.profile) {
          setProfile(res.data.profile);
        }
      } catch (err) { }
    };
    fetchProfile();
    
    // Listen for custom event when profile picture is updated
    window.addEventListener('profilePictureUpdated', fetchProfile);
    return () => window.removeEventListener('profilePictureUpdated', fetchProfile);
  }, [user?.faculty_id]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (!user?.faculty_id) return;
        const res = await apiClient.get(`/faculty/notifications`, { withCredentials: true });
        setNotifications(res.data || []);
      } catch (err) {
        console.error("Error fetching notifications", err);
      }
    };
    fetchNotifications();
  }, [user?.faculty_id]);

  useEffect(() => {
    if (showMessagesModal && unreadCount > 0) {
      notifications.forEach(note => {
        if (!note.is_read) handleMarkAsRead(note.note_id);
      });
    }
  }, [showMessagesModal, notifications, unreadCount]);

  const handleMarkAsRead = async (note_id) => {
    try {
      await apiClient.put(`/faculty/notifications/${note_id}/read`, {}, { withCredentials: true });
      setNotifications(prev => prev.map(n => n.note_id === note_id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error("Error marking note as read", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const currentPath = location.pathname;

  return (
    <div className="faculty-layout theme-faculty" style={{ background: '#F8FAFC' }}>
      
      <style>
        {`
          .faculty-layout { display: flex; height: 100vh; overflow: hidden; width: 100%; }
          .faculty-sidebar { width: 260px; height: 100vh; display: flex; flex-direction: column; flex-shrink: 0; transition: transform 0.3s ease; background: var(--navy); border-right: 1px solid rgba(0,0,0,0.1); padding: 24px 0; z-index: 100; color: white; }
          .faculty-main { flex: 1; overflow-y: auto; overflow-x: hidden; background: #F8FAFC; padding: 16px; }
          .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }
          
          .mobile-only-header { display: flex; align-items: center; padding: 8px 16px; margin-bottom: 16px; background: white; border-radius: 12px; border: 1px solid #E2E8F0; }
          @media (min-width: 768px) {
            .mobile-only-header { display: none !important; }
          }
          @media (max-width: 767px) {
            .faculty-sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); }
            .faculty-sidebar.sidebar-open { transform: translateX(0); }
            .sidebar-overlay.active { display: block; }
          }
        `}
      </style>

      <div className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      
      {/* SIDEBAR */}
      <aside className={`faculty-sidebar ${isMobileMenuOpen ? 'sidebar-open' : ''}`}>

        {/* Logo / Branding */}
        <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ 
            width: '44px', height: '44px', borderRadius: '50%', 
            background: '#fff', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', 
            overflow: 'hidden', border: '1px solid var(--border-color)',
            flexShrink: 0
          }}>
            <img src="/logo.jpeg" alt="College Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '1px', whiteSpace: 'nowrap' }}>MIT MYSORE</h2>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => { navigate('/faculty-dashboard'); setIsMobileMenuOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '8px',
              background: currentPath.includes('dashboard') ? 'var(--primary)' : 'transparent',
              color: currentPath.includes('dashboard') ? '#ffffff' : '#94A3B8',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: currentPath.includes('dashboard') ? 600 : 500, fontSize: '14px', transition: 'all 0.2s', width: '100%'
            }}
            onMouseEnter={(e) => { if (!currentPath.includes('dashboard')) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#ffffff'; } }}
            onMouseLeave={(e) => { if (!currentPath.includes('dashboard')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
          >
            <LayoutDashboard size={20} />
            <span>Overview Dashboard</span>
          </button>

          <button
            onClick={() => { setShowMessagesModal(true); setIsMobileMenuOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px',
              background: 'transparent',
              color: '#94A3B8',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s', width: '100%'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageSquare size={20} />
              <span>Messages</span>
            </div>
            {unreadCount > 0 && (
              <span style={{ 
                background: '#EF4444', color: 'white', fontSize: '11px', fontWeight: 'bold', 
                borderRadius: '10px', padding: '2px 8px'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { navigate('/faculty-profile'); setIsMobileMenuOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '8px',
              background: currentPath.includes('profile') ? 'var(--primary)' : 'transparent',
              color: currentPath.includes('profile') ? '#ffffff' : '#94A3B8',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: currentPath.includes('profile') ? 600 : 500, fontSize: '14px', transition: 'all 0.2s', width: '100%'
            }}
            onMouseEnter={(e) => { if (!currentPath.includes('profile')) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#ffffff'; } }}
            onMouseLeave={(e) => { if (!currentPath.includes('profile')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
          >
            <User size={20} />
            <span>Profile</span>
          </button>

          <button
            onClick={() => { navigate('/faculty-settings'); setIsMobileMenuOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '8px',
              background: currentPath.includes('settings') ? 'var(--primary)' : 'transparent',
              color: currentPath.includes('settings') ? '#ffffff' : '#94A3B8',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: currentPath.includes('settings') ? 600 : 500, fontSize: '14px', transition: 'all 0.2s', width: '100%'
            }}
            onMouseEnter={(e) => { if (!currentPath.includes('settings')) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#ffffff'; } }}
            onMouseLeave={(e) => { if (!currentPath.includes('settings')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>

        {/* User Profile Mini */}
        <div style={{ padding: '0 24px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
              {profile.profile_picture_url ? (
                <img src={profile.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{profile.name}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>{profile.faculty_id || 'Faculty Member'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px',
              borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '13px', transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="faculty-main">
        
        {/* Mobile Header */}
        <div className="mobile-only-header">
           <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0F172A' }}>
             <Menu size={24} />
           </button>
           <h3 style={{ margin: '0 0 0 16px', fontSize: '16px', fontWeight: 600 }}>MIT Mysore</h3>
        </div>

        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <FacultyMessagesModal
        showMessagesModal={showMessagesModal}
        setShowMessagesModal={setShowMessagesModal}
        facultyNotes={notifications}
        setFacultyNotes={setNotifications}
        deptName={profile.dept_name}
      />
    </div>
  );
}
