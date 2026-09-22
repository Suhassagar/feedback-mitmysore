import { useState, useEffect } from "react";
import { Mail, KeyRound, CalendarDays, Gift } from "lucide-react";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import FacultySettingsModals from "../features/faculty/components/FacultySettingsModals";

export default function FacultySettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSettingModal, setActiveSettingModal] = useState(null);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get(`/faculty-analytics/${user?.faculty_id}`, { withCredentials: true });
      if (res.data && res.data.profile) {
        setProfile(res.data.profile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.faculty_id) {
      fetchProfile();
    }
  }, [user?.faculty_id]);

  if (loading) {
    return <div style={{ padding: '40px' }}><h2>Loading Settings...</h2></div>;
  }

  const settingsOptions = [
    { id: 'email', title: 'Update Email', icon: <Mail size={32} color="var(--primary)" />, desc: 'Change your login and contact email address.' },
    { id: 'password', title: 'Change Password', icon: <KeyRound size={32} color="#F59E0B" />, desc: 'Update your account password for security.' },
    { id: 'joining_date', title: 'Update Joining Date', icon: <CalendarDays size={32} color="#10B981" />, desc: 'Set or update your official date of joining.' },
    { id: 'dob', title: 'Update Date of Birth', icon: <Gift size={32} color="#EF4444" />, desc: 'Add your date of birth for records.' },
  ];

  return (
    <div className="theme-faculty fade-in" style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      <style>
        {`
          @media (max-width: 600px) {
            .theme-faculty { padding: 16px !important; }
          }
        `}
      </style>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: '#0F172A' }}>Account Settings</h2>
        <p style={{ margin: 0, color: '#64748B', fontSize: '15px' }}>Manage your profile information and security credentials.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {settingsOptions.map(option => (
          <div 
            key={option.id}
            onClick={() => setActiveSettingModal(option.id)}
            style={{ 
              background: 'white', borderRadius: '16px', padding: '24px', 
              border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {option.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: '0 0 8px 0' }}>{option.title}</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>{option.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <FacultySettingsModals
        activeSettingModal={activeSettingModal}
        setActiveSettingModal={setActiveSettingModal}
        profile={profile}
        onProfileUpdated={fetchProfile}
      />
    </div>
  );
}
