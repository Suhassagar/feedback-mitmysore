import { useState, useEffect, useRef } from "react";
import { User, Mail, Calendar, Hash, Building, Edit3, Briefcase, Camera, Loader2, Sparkles, X, UploadCloud, ImageIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function FacultyProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedUrls, setUploadedUrls] = useState({ rawUrl: null, aiUrl: null, public_id: null });
  const [previewMode, setPreviewMode] = useState('raw'); // 'raw' or 'ai'
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  useEffect(() => {
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

    if (user?.faculty_id) fetchProfile();
  }, [user?.faculty_id]);

  if (loading) {
    return <div style={{ padding: '40px' }}><h2>Loading Profile...</h2></div>;
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
    else if (e.type === "dragleave") setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }
    setSelectedFile(file);
    setPreviewMode('raw');
    
    const formData = new FormData();
    formData.append("image", file);

    setIsUploading(true);
    let toastId = toast.loading("Preparing preview...");

    try {
      const res = await apiClient.post('/faculty/profile/upload-temp', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      
      if (res.data.success) {
        setUploadedUrls({
          rawUrl: res.data.rawUrl,
          aiUrl: res.data.aiUrl,
          public_id: res.data.public_id
        });

        // Zero-Latency Pre-Warming: Force the browser to secretly request and cache the AI image NOW
        if (res.data.aiUrl) {
          const prewarmImg = new Image();
          prewarmImg.src = res.data.aiUrl;
        }
        
        toast.success("Ready for preview!", { id: toastId });
      } else {
        toast.error(res.data.message || "Failed to upload", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during upload", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearImage = () => {
    if (uploadedUrls.public_id) {
      try {
        apiClient.post('/faculty/profile/cleanup', { public_id: uploadedUrls.public_id }, { withCredentials: true });
      } catch (err) {
        console.error("Cleanup failed", err);
      }
    }
    setUploadedUrls({ rawUrl: null, aiUrl: null, public_id: null });
    setSelectedFile(null);
    setPreviewMode('raw');
    setIsGeneratingAi(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancelUpload = () => {
    handleClearImage();
    setShowUploadModal(false);
  };

  const handleUploadConfirm = async () => {
    const finalUrl = previewMode === 'raw' ? uploadedUrls.rawUrl : uploadedUrls.aiUrl;
    if (!finalUrl) return;

    setIsUploading(true);
    let toastId = toast.loading("Saving profile picture...");

    try {
      const res = await apiClient.post('/faculty/profile/save', { finalUrl }, {
        withCredentials: true
      });
      
      if (res.data.success) {
        setProfile(prev => ({ ...prev, profile_picture_url: res.data.url }));
        toast.success("Profile picture updated successfully!", { id: toastId });
        
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadedUrls({ rawUrl: null, aiUrl: null, public_id: null });
        setPreviewMode('raw');
        setIsGeneratingAi(false);
        window.dispatchEvent(new Event('profilePictureUpdated'));
      } else {
        toast.error(res.data.message || "Failed to save", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during save", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!profile) {
    return <div style={{ padding: '40px' }}><h2>Profile not found</h2></div>;
  }

  return (
    <div className="theme-faculty fade-in" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      
      <style>
        {`
          .profile-header { padding: 0 24px 24px 24px; position: relative; display: flex; justify-content: space-between; align-items: flex-end; margin-top: -40px; flex-wrap: wrap; gap: 16px; }
          .profile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
          @media (max-width: 600px) {
            .profile-header { flex-direction: column; align-items: flex-start; margin-top: -30px; }
            .profile-header > button { width: 100%; justify-content: center; margin-top: 8px; }
            .theme-faculty { padding: 16px !important; }
            .profile-grid { grid-template-columns: 1fr; }
          }
        `}
      </style>

      {/* Profile Header Card */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
        
        {/* Banner */}
        <div style={{ height: '120px', background: 'linear-gradient(135deg, var(--navy) 0%, var(--primary) 100%)' }}></div>
        
        <div className="profile-header">
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{ 
                  width: '120px', height: '120px', borderRadius: '50%', background: 'white', 
                  padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)', position: 'relative', cursor: 'pointer',
                  overflow: 'hidden'
                }}
                onClick={() => setShowUploadModal(true)}
                onMouseEnter={(e) => e.currentTarget.querySelector('.overlay').style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.querySelector('.overlay').style.opacity = '0'}
              >
                {/* Image or Initials */}
                {profile.profile_picture_url ? (
                  <img src={profile.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#F1F5F9', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold' }}>
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="overlay" style={{ 
                  position: 'absolute', inset: '4px', borderRadius: '50%', background: 'rgba(15, 23, 42, 0.6)', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white',
                  opacity: 0, transition: 'opacity 0.2s ease', zIndex: 10
                }}>
                  <Camera size={24} />
                  <span style={{ fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>Change</span>
                </div>
              </div>
            </div>
            
            <div style={{ paddingBottom: '32px' }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>{profile.name}</h2>
              <p style={{ margin: 0, color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <Briefcase size={16} /> Faculty Member • {profile.dept_name}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/faculty-settings')}
            style={{ 
              background: 'white', border: '1px solid #E2E8F0', padding: '10px 16px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'background 0.2s',
              marginBottom: '8px'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseOut={e => e.currentTarget.style.background = 'white'}
          >
            <Edit3 size={16} color="var(--primary)" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#0F172A', fontWeight: 600, paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
          Personal Information
        </h3>
        
        <div className="profile-grid">
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <User size={20} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Full Name</p>
              <p style={{ margin: 0, fontSize: '15px', color: '#334155', fontWeight: 500 }}>{profile.name}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <Hash size={20} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Faculty ID</p>
              <p style={{ margin: 0, fontSize: '15px', color: '#334155', fontWeight: 500 }}>{profile.faculty_id}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <Mail size={20} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Email Address</p>
              <p style={{ margin: 0, fontSize: '15px', color: '#334155', fontWeight: 500 }}>{profile.email}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <Building size={20} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Department</p>
              <p style={{ margin: 0, fontSize: '15px', color: '#334155', fontWeight: 500 }}>{profile.dept_name}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <Calendar size={20} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Date of Birth</p>
              <p style={{ margin: 0, fontSize: '15px', color: '#334155', fontWeight: 500 }}>
                {profile.dob ? new Date(profile.dob).toLocaleDateString('en-GB') : 'Not provided'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <Calendar size={20} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Joining Date</p>
              <p style={{ margin: 0, fontSize: '15px', color: '#334155', fontWeight: 500 }}>
                {profile.joining_date ? new Date(profile.joining_date).toLocaleDateString('en-GB') : 'Not provided'}
              </p>
            </div>
          </div>

        </div>
      </div>
      
      
      {/* Upload Modal */}
      <style>{`
        @keyframes scan-laser {
          0% { top: -10%; }
          50% { top: 100%; }
          100% { top: -10%; }
        }
        @keyframes pulse-text {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '450px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>Update Profile Picture</h3>
              <button onClick={handleCancelUpload} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {!uploadedUrls.rawUrl ? (
                <div 
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    border: `2px dashed ${isDragActive ? 'var(--primary)' : '#CBD5E1'}`, 
                    borderRadius: '12px', padding: '40px 20px', textAlign: 'center', 
                    background: isDragActive ? '#F8FAFC' : 'white', cursor: 'pointer', transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {isUploading && (
                     <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <Loader2 size={32} className="spin" color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                     </div>
                  )}
                  <UploadCloud size={40} color={isDragActive ? 'var(--primary)' : '#94A3B8'} style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Drag & drop an image here</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>or click to browse files (max 5MB)</p>
                  <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files[0]) handleFileSelect(e.target.files[0]) }} accept="image/*" style={{ display: 'none' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <div style={{ position: 'relative', width: '160px', height: '160px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    {isGeneratingAi && previewMode === 'ai' && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 10, overflow: 'hidden' }}>
                         <div style={{ 
                           position: 'absolute', left: 0, right: 0, height: '4px', background: '#3B82F6',
                           boxShadow: '0 0 15px 5px rgba(59, 130, 246, 0.6)',
                           animation: 'scan-laser 2.5s ease-in-out infinite'
                         }} />
                         <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <span style={{ color: 'white', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', animation: 'pulse-text 1.5s infinite' }}>Enhancing</span>
                         </div>
                      </div>
                    )}
                    <img 
                      src={previewMode === 'raw' ? uploadedUrls.rawUrl : uploadedUrls.aiUrl} 
                      alt="Preview" 
                      onLoad={() => setIsGeneratingAi(false)}
                      onError={() => setIsGeneratingAi(false)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <button onClick={handleClearImage} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', zIndex: 20 }}>
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div style={{ width: '100%', background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', background: '#E2E8F0', padding: '4px', borderRadius: '8px' }}>
                      <button 
                        onClick={() => setPreviewMode('raw')} 
                        style={{ flex: 1, padding: '8px 16px', background: previewMode === 'raw' ? 'white' : 'transparent', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: previewMode === 'raw' ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: previewMode === 'raw' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
                        Raw Photo
                      </button>
                      <button 
                        onClick={() => { setPreviewMode('ai'); setIsGeneratingAi(true); }} 
                        style={{ flex: 1, padding: '8px 16px', background: previewMode === 'ai' ? 'white' : 'transparent', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: previewMode === 'ai' ? 'var(--primary)' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: previewMode === 'ai' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
                        <Sparkles size={14} /> AI Enhanced
                      </button>
                    </div>
                    {previewMode === 'ai' && (
                       <p style={{ margin: 0, fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                         ✨ We are replacing the background with a professional corporate studio. This may take up to 15 seconds to load the first time.
                       </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={handleCancelUpload} style={{ padding: '8px 16px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#475569', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleUploadConfirm} disabled={!selectedFile || isUploading || isGeneratingAi} style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: 'white', cursor: (!selectedFile || isUploading || isGeneratingAi) ? 'not-allowed' : 'pointer', opacity: (!selectedFile || isUploading || isGeneratingAi) ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isUploading && <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
                {isUploading ? 'Saving...' : 'Save Picture'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
