import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/apiClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from "recharts";
import { Star, BookOpen, Calendar, CheckCircle, TrendingUp, Download, Bell, Inbox, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";
import StudentRosterModal from "../features/faculty/components/StudentRosterModal";

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedCourseData, setSelectedCourseData] = useState(null);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const faculty_id = user?.faculty_id;
        if (!faculty_id) return;
        
        let url = `/faculty-analytics/${faculty_id}`;
        
        // If a specific section is selected, append query parameters
        if (selectedFilter !== "all") {
          const [course_id, sem, section] = selectedFilter.split("|");
          url += `?course_id=${course_id}&sem=${sem}&section=${section}`;
        }

        const res = await apiClient.get(url, { withCredentials: true });
        
        // If this is the initial load (all subjects), store the assigned subjects separately
        // so the dropdown doesn't disappear when filtering.
        setAnalytics(prev => {
           if (selectedFilter === "all" || !prev) return res.data;
           return { ...res.data, assignedSubjects: prev.assignedSubjects };
        });
        
      } catch (err) {
        console.error("Error fetching faculty analytics", err);
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [selectedFilter, user?.faculty_id]);

  const handleDownloadExcel = () => {
    if (!analytics) return;
    
    // 1. Format Overall Stats
    const statsData = [
      ["Metric", "Value"],
      ["Faculty Name", analytics.profile?.name],
      ["Department", analytics.profile?.dept_name],
      ["Average Rating", analytics.avgRating],
      ["Total Feedback Responses", analytics.totalFeedback],
      ["Submission Rate", `${completionRate}%`],
    ];

    // 2. Format Subject Breakdown
    const subjectData = [
      ["Course Name", "Course Code", "Average Rating"],
      ...(analytics.subjectData || []).map(sub => [sub.course_name, sub.course_code, parseFloat(sub.avg_rating).toFixed(2)])
    ];

    // 3. Format Question Breakdown
    const questionData = [
      ["Question", "Average Score"],
      ...(analytics.radarData || []).map(q => [q.question, parseFloat(q.avg_rating).toFixed(2)])
    ];

    // Create Worksheets
    const wb = XLSX.utils.book_new();
    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    const wsSubjects = XLSX.utils.aoa_to_sheet(subjectData);
    const wsQuestions = XLSX.utils.aoa_to_sheet(questionData);

    XLSX.utils.book_append_sheet(wb, wsStats, "Overview");
    XLSX.utils.book_append_sheet(wb, wsSubjects, "Subjects");
    XLSX.utils.book_append_sheet(wb, wsQuestions, "Detailed Feedback");

    // Generate Excel file
    let filename = `Feedback_Report_${analytics.profile?.name || 'Faculty'}.xlsx`;
    if (selectedFilter !== "all") {
        const [, sem, section] = selectedFilter.split("|");
        filename = `Feedback_Report_Sem${sem}_Sec${section}.xlsx`;
    }
    XLSX.writeFile(wb, filename.replace(/\s+/g, '_'));
    toast.success("Excel report downloaded successfully!");
  };

  if (loading) {
    return <div style={{ padding: '40px' }}><h2>Loading Dashboard...</h2></div>;
  }

  if (!analytics) {
    return <div style={{ padding: '40px' }}><h2>No Data Found</h2></div>;
  }

  // --- DATA PREPARATION ---
  
  // 1. Rating Distribution for Donut Chart
  const dist = analytics.distribution || { excellent: 0, good: 0, average: 0, poor: 0 };
  const donutData = [
    { name: 'Excellent', value: dist.excellent, color: '#10B981' },
    { name: 'Good', value: dist.good, color: '#3B82F6' },
    { name: 'Average', value: dist.average, color: '#F59E0B' },
    { name: 'Poor', value: dist.poor, color: '#EF4444' }
  ].filter(d => d.value > 0);

  // 2. Completion Percentage
  let totalAssignedStudents = 0;
  let totalCompletedStudents = 0;
  (analytics.assignedSubjects || []).forEach(sub => {
    totalAssignedStudents += sub.total_students;
    totalCompletedStudents += sub.completed_students;
  });
  const completionRate = totalAssignedStudents > 0 ? Math.round((totalCompletedStudents / totalAssignedStudents) * 100) : 0;

  // 3. Radar Data & Insights
  const labelMap = {
    "Clarity of explanation from the faculty.": "Clarity",
    "Use of examples and teaching aids.": "Teaching Aids",
    "Punctuality and organization of class.": "Punctuality",
    "Encouragement of student participation.": "Engagement",
    "Effectiveness of communication.": "Communication"
  };

  const formattedRadarData = (analytics.radarData || []).map(d => ({
    subject: labelMap[d.question] || (d.question.length > 15 ? d.question.substring(0, 15) + "..." : d.question),
    A: parseFloat(d.avg_rating).toFixed(2),
    fullMark: 5
  }));

  const sortedRadar = [...(analytics.radarData || [])].sort((a, b) => b.avg_rating - a.avg_rating);
  const strengths = sortedRadar.slice(0, 2);
  const weaknesses = sortedRadar.slice(-2).reverse();
  
  const hasAssignedSubjects = analytics.assignedSubjects && analytics.assignedSubjects.length > 0;

  return (
    <div className="theme-faculty fade-in" style={{ padding: 'clamp(16px, 4vw, 40px)', maxWidth: '1400px', margin: '0 auto' }}>
      
      <style>
        {`
          .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; min-width: 0; }
          .dashboard-grid > div { min-width: 0; }
          .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; min-width: 0; }
          .kpi-grid > div { min-width: 0; }
          .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; gap: 16px; flex-wrap: wrap; min-width: 0; }
          .table-container { overflow-x: auto; width: 100%; min-width: 0; }
          .header-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
          @media (max-width: 1024px) {
            .dashboard-grid { grid-template-columns: 1fr; }
          }
          @media (max-width: 768px) {
            .kpi-grid { grid-template-columns: 1fr; }
            .header-row { flex-direction: column; }
            .header-actions { width: 100%; justify-content: flex-start; }
            .header-actions select { width: 100%; }
            .theme-faculty { padding: 16px !important; }
          }
        `}
      </style>

      {/* Header Row */}
      <div className="header-row">
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: '#0F172A' }}>Welcome, {analytics.profile?.name || "Faculty"}</h2>
          <p style={{ margin: 0, color: '#64748B', fontSize: '15px' }}>Your teaching analytics and feedback metrics for the current session.</p>
        </div>
        
        {/* Header Right Actions */}
        <div className="header-actions">
          
          {/* Context Filter Dropdown */}
          <select 
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            style={{ 
              padding: '10px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', 
              background: 'white', color: '#0F172A', fontWeight: 500, fontSize: '14px',
              outline: 'none', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              maxWidth: '100%', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}
          >
            <option value="all">🌍 All Assigned Classes</option>
            {(analytics.assignedSubjects || []).map((sub, idx) => (
              <option key={idx} value={`${sub.course_id}|${sub.sem}|${sub.section}`}>
                Sem {sub.sem} - Sec {sub.section} ({sub.course_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2-COLUMN LAYOUT GRID */}
      {hasAssignedSubjects ? (
        <div className="dashboard-grid">
          
          {/* ================= LEFT COLUMN (MAIN) ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Top KPI Cards (2x2 Grid) */}
            <div className="kpi-grid">
            
            <div style={{ background: 'white', borderRadius: '16px', padding: 'clamp(16px, 3vw, 24px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: '#F5F3FF', borderRadius: '12px', color: 'var(--primary)' }}><Star size={24} /></div>
                <div>
                  <p style={{ margin: 0, color: '#64748B', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Rating</p>
                  <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#0F172A' }}>{analytics.avgRating} <span style={{ fontSize: '16px', color: '#94A3B8', fontWeight: 500 }}>/ 5</span></h3>
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Feedback Received:</span>
                <span style={{ fontWeight: 600 }}>{analytics.totalFeedback}</span>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', padding: 'clamp(16px, 3vw, 24px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: '#ECFDF5', borderRadius: '12px', color: '#10B981' }}><CheckCircle size={24} /></div>
                <div>
                  <p style={{ margin: 0, color: '#64748B', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submission Rate</p>
                  <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#0F172A' }}>{completionRate}%</h3>
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                <span>Active Sessions:</span>
                <span style={{ fontWeight: 600 }}>{analytics.activeSessionsCount || 0}</span>
              </div>
            </div>

          </div>

          {/* Performance Metrics Bar Chart */}
          <div style={{ background: 'white', borderRadius: '16px', padding: 'clamp(16px, 4vw, 32px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Performance Metrics</h3>
              <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '14px' }}>Breakdown of your scores across standard teaching metrics.</p>
            </div>
            
            <div style={{ width: '100%', height: '350px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '550px', height: '100%' }}>
                {formattedRadarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedRadarData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 5]} tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                      <Bar dataKey="A" name="Score" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '14px' }}>Insufficient data for metrics visualization.</div>
                )}
              </div>
            </div>
          </div>

          {/* Data Table: Subject Performance */}
          <div style={{ background: 'white', borderRadius: '16px', padding: 'clamp(16px, 4vw, 32px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Subject Breakdown</h3>
              <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '14px' }}>Detailed feedback metrics per subject taught.</p>
            </div>
            <div className="table-container" style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px', background: 'white' }}>
                <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '16px 20px', color: '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</th>
                    <th style={{ padding: '16px 20px', color: '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Class Details</th>
                    <th style={{ padding: '16px 20px', color: '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.assignedSubjects || []).map((sub, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => {
                        setSelectedCourseData({ ...sub, dept_id: analytics.profile?.dept_id || user?.dept_id });
                        setIsRosterModalOpen(true);
                      }}
                      style={{ 
                        borderBottom: idx === analytics.assignedSubjects.length - 1 ? 'none' : '1px solid #F1F5F9', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s ease',
                        background: 'white'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '15px', color: '#0F172A', fontWeight: 600 }}>{sub.course_name}</span>
                          <span style={{ fontSize: '13px', color: '#64748B', fontFamily: 'monospace' }}>{sub.course_code}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #DBEAFE', whiteSpace: 'nowrap' }}>Sem {sub.sem}</span>
                          <span style={{ background: '#F5F3FF', color: '#7C3AED', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #EDE9FE', whiteSpace: 'nowrap' }}>Sec {sub.section}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                         <button style={{ 
                           background: '#F8FAFC', border: '1px solid #E2E8F0', color: 'var(--primary)', 
                           padding: '8px 16px', borderRadius: '8px',
                           display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', 
                           fontSize: '13px', fontWeight: 600, transition: 'all 0.2s ease' 
                         }}
                         onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                         onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                         >
                           View Roster <ChevronRight size={16} />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN (SIDEBAR STATS) ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Insights */}
          <div style={{ background: 'white', borderRadius: '16px', padding: 'clamp(16px, 4vw, 24px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Key Insights</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#10B981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Strengths</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#F8FAFC', borderRadius: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500, lineHeight: '1.4' }}>{labelMap[s.question] || s.question}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>{parseFloat(s.avg_rating).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Needs Improvement</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {weaknesses.map((w, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#F8FAFC', borderRadius: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500, lineHeight: '1.4' }}>{labelMap[w.question] || w.question}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B' }}>{parseFloat(w.avg_rating).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rating Distribution (Donut) */}
          <div style={{ background: 'white', borderRadius: '16px', padding: 'clamp(16px, 4vw, 24px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Rating Distribution</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748B' }}>Overview of all submitted feedback ratings.</p>
            
            <div style={{ position: 'relative', height: '220px', width: '100%', marginBottom: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Total Text */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{analytics.totalFeedback}</span>
                <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Responses</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {donutData.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: d.color }}></div>
                    {d.name}
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{d.value}</span>
                    <span style={{ color: '#94A3B8', width: '40px', textAlign: 'right' }}>{((d.value / analytics.totalFeedback) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: 'white', borderRadius: '16px', padding: 'clamp(16px, 4vw, 24px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <button onClick={handleDownloadExcel} style={{ width: '100%', background: 'white', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', color: '#0F172A', fontWeight: 500, fontSize: '14px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                <Download size={18} color="var(--primary)" /> Download Excel Report
              </button>
            </div>
          </div>

        </div>

      </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', padding: '60px 24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <Inbox size={40} color="#94A3B8" />
          </div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>No Subjects Assigned</h3>
          <p style={{ margin: 0, color: '#64748B', fontSize: '16px', maxWidth: '400px', lineHeight: '1.5' }}>
            You have not been assigned to any classes for the selected filter. If you believe this is an error, please contact your Head of Department.
          </p>
        </div>
      )}

      {/* Roster Modal */}
      <StudentRosterModal 
        isOpen={isRosterModalOpen} 
        onClose={() => setIsRosterModalOpen(false)} 
        courseDetails={selectedCourseData}
        dept_id={selectedCourseData?.dept_id || user?.dept_id}
      />
    </div>
  );
}
