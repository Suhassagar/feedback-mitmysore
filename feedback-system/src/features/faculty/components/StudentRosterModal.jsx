import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Search } from 'lucide-react';
import apiClient from '../../../services/apiClient';

export default function StudentRosterModal({ isOpen, onClose, courseDetails, dept_id }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && courseDetails && dept_id) {
      const fetchRoster = async () => {
        setLoading(true);
        try {
          const res = await apiClient.get(`/faculty-analytics/roster/${dept_id}/${courseDetails.sem}/${courseDetails.section}`, { withCredentials: true });
          setStudents(res.data || []);
        } catch (err) {
          console.error("Failed to fetch roster:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchRoster();
    }
  }, [isOpen, courseDetails, dept_id]);

  if (!isOpen) return null;

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.usn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{courseDetails.course_name}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>{courseDetails.course_code} • Sem {courseDetails.sem} • Section {courseDetails.section}</p>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: '8px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search students by name or USN..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading roster...</div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No students found in this section.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredStudents.map(student => (
                <div key={student.usn} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #F1F5F9', borderRadius: '8px', background: '#F8FAFC' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{student.name}</span>
                    <span style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{student.usn}</span>
                  </div>
                  <div>
                    {student.feedback_given === 'done' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontSize: '13px', fontWeight: 600 }}>
                        <CheckCircle size={16} /> Submitted
                      </div>
                    ) : student.feedback_given === 'pending' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', fontSize: '13px', fontWeight: 600 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)', animation: 'pulse-dot 2s infinite' }} /> 
                        In Progress
                        <style>{`
                          @keyframes pulse-dot {
                            0% { transform: scale(0.95); boxShadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                            70% { transform: scale(1); boxShadow: 0 0 0 6px rgba(59, 130, 246, 0); }
                            100% { transform: scale(0.95); boxShadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                          }
                        `}</style>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B', fontSize: '13px', fontWeight: 600 }}>
                        <XCircle size={16} /> Not Started
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
