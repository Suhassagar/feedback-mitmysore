import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";
import { 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  Check, 
  Clock, 
  ShieldCheck, 
  BookOpen,
  MessageSquare
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import { jumbleQuestionsForStudent } from "../utils/shuffleUtils";

const QUICK_FEEDBACK_OPTIONS = [
  "Teaching pace too fast",
  "Explanations need more clarity",
  "Need more practical examples",
  "Syllabus coverage rushed",
  "More interactive discussions needed",
  "Additional study materials required"
];

export default function FeedbackForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const session_id = location.state?.session_id || sessionStorage.getItem('active_feedback_session_id');

  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [groupedQuestions, setGroupedQuestions] = useState({});
  const [orderedSections, setOrderedSections] = useState([]);
  const [feedbackData, setFeedbackData] = useState({});
  const [facultyRemarks, setFacultyRemarks] = useState({});
  const [sectionRemarks, setSectionRemarks] = useState({});
  const [departmentRemark, setDepartmentRemark] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  
  // Timer state (5 minutes = 300 seconds)
  const MIN_TIME_SEC = 5 * 60;
  const [timeLeft, setTimeLeft] = useState(MIN_TIME_SEC);
  
  // Wizard step (0 to facultyList.length)
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!session_id) {
      navigate("/student-login");
      return;
    }
    sessionStorage.setItem('active_feedback_session_id', session_id);

    const fetchData = async () => {
      try {
        const tokenRes = await apiClient.get('/feedback/token', { withCredentials: true });
        setIdempotencyKey(tokenRes.data.token);

        const facRes = await apiClient.get(`/student/subjects/${session_id}`);
        setFacultyList(facRes.data);
        
        const qRes = await apiClient.get(`/student/questions/${session_id}`);
        setQuestions(qRes.data);
        
        const studentUsn = location.state?.usn || sessionStorage.getItem('student_usn') || '';
        let studentSeed = sessionStorage.getItem('feedback_student_seed');
        if (!studentSeed) {
          studentSeed = `${studentUsn}_${session_id}_${tokenRes.data.token || Date.now()}`;
          sessionStorage.setItem('feedback_student_seed', studentSeed);
        }

        const { groupedQuestions: jumbledGrouped, orderedSections: jumbledSections } = jumbleQuestionsForStudent(qRes.data, studentSeed);
        setGroupedQuestions(jumbledGrouped);
        setOrderedSections(jumbledSections);
        
        setLoading(false);
      } catch {
        toast.error("Failed to load feedback form");
      }
    };
    
    fetchData();
    
    let startTime = sessionStorage.getItem('feedback_start_time_local');
    if (!startTime) {
      startTime = Date.now();
      sessionStorage.setItem('feedback_start_time_local', startTime);
    }
    
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
      const remaining = Math.max(0, MIN_TIME_SEC - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(timerInterval);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [session_id, navigate]);

  const handleRatingChange = (facultyIndex, questionId, rating) => {
    setFeedbackData((prev) => ({
      ...prev,
      [facultyIndex]: {
        ...prev[facultyIndex],
        [questionId]: rating,
      },
    }));
  };

  const handleFacultyRemarkChange = (facultyIndex, value) => {
    setFacultyRemarks((prev) => ({
      ...prev,
      [facultyIndex]: value,
    }));
  };

  const calculateSectionAverage = (headingQuestions, stepIndex) => {
    if (!feedbackData[stepIndex]) return 0;
    const ratings = headingQuestions.map(q => Number(feedbackData[stepIndex][q.question_id] || 0)).filter(r => r > 0);
    if (ratings.length === 0) return 0;
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return parseFloat(avg.toFixed(1));
  };

  const validateCurrentStep = () => {
    if (currentStep >= facultyList.length) return true;

    // Verify all questions for the current faculty are rated
    let missedQuestion = false;
    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      const qId = questions[qIndex].question_id;
      if (!feedbackData[currentStep] || !feedbackData[currentStep][qId]) {
        missedQuestion = true;
        break;
      }
    }
    
    if (missedQuestion) {
      toast.error("Please answer all questions before proceeding.", { duration: 3500 });
      return false;
    }

    // Verify low-score sections (avg <= 3.0) have remarks or selected chips
    let missingRemark = false;
    const sectionsToRender = orderedSections.length > 0 
      ? orderedSections 
      : Object.entries(groupedQuestions).map(([heading, questions]) => ({ heading, questions }));
    
    for (const { heading, questions: headingQuestions } of sectionsToRender) {
      const avg = calculateSectionAverage(headingQuestions, currentStep);
      if (avg > 0 && avg <= 3.0) {
        const remark = sectionRemarks[currentStep]?.[heading] || "";
        if (remark.trim() === "") {
          missingRemark = true;
          break;
        }
      }
    }

    if (missingRemark) {
      toast.error("Please specify a reason or comment for sections with low ratings.", { duration: 4000 });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!window.confirm("Submit your feedback? Responses cannot be edited after submission.")) return;

    try {
      const feedbackPayload = facultyList.map((faculty, fIndex) => ({
        faculty_id: faculty.faculty_id,
        course_id: faculty.course_id,
        feedback: feedbackData[fIndex],
        remark: facultyRemarks[fIndex] || "",
        section_remarks: sectionRemarks[fIndex] || {},
      }));

      await apiClient.post(
        "/submit-feedback",
        {
          session_id,
          facultyList: feedbackPayload,
          department_remark: departmentRemark,
          idempotency_key: idempotencyKey
        },
        { withCredentials: true }
      );

      sessionStorage.removeItem('active_feedback_session_id');
      sessionStorage.removeItem('student_usn');
      sessionStorage.removeItem('feedback_student_seed');
      sessionStorage.removeItem('feedback_start_time_local');
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // continue
      }

      toast.success("Feedback submitted successfully.");
      navigate("/");

    } catch (err) {
      console.error(err.response?.data);
      toast.error(err.response?.data?.error || "Submission failed. Please check network connection.");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
        <div style={{ textAlign: "center", color: "#64748B" }}>
          <div style={{
            width: "36px", height: "36px",
            border: "3px solid #E2E8F0", borderTopColor: "#0F172A",
            borderRadius: "50%", animation: "spin 0.7s linear infinite",
            margin: "0 auto 12px auto"
          }} />
          <p style={{ fontSize: "14px", fontWeight: "500" }}>Loading Course Evaluation Form...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const isFinalStep = currentStep === facultyList.length;
  const currentFaculty = !isFinalStep ? facultyList[currentStep] : null;

  // Completion metrics
  const answeredInCurrentStep = questions.filter(
    (q) => feedbackData[currentStep] && feedbackData[currentStep][q.question_id] > 0
  ).length;
  const totalFacultyQuestions = questions.length;
  const isCurrentFacultyComplete = totalFacultyQuestions > 0 && answeredInCurrentStep === totalFacultyQuestions;

  const totalSteps = facultyList.length + 1;
  const progressPercent = isFinalStep 
    ? 100 
    : Math.min(99, Math.round(((currentStep + (answeredInCurrentStep / Math.max(totalFacultyQuestions, 1))) / totalSteps) * 100));

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <PageTransition>
      <div className="theme-student eval-page-container">
        <style>
          {`
            /* ============================================================ */
            /* INSTITUTIONAL COURSE EVALUATION PORTAL (STUDENT THEME)       */
            /* ============================================================ */
            
            .eval-page-container {
              --primary: #EA580C;
              --gold2: #C2410C;
              --bg-light: #FFF7ED;
              --bg-hover: #FFEDD5;
              --focus-ring: rgba(234, 88, 12, 0.2);
              min-height: 100vh;
              background-color: #F8FAFC;
              color: #0F172A;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              padding: 0;
              margin: 0;
              line-height: 1.5;
            }

            /* Sticky Institutional Header Bar */
            .eval-header-bar {
              position: sticky;
              top: 0;
              z-index: 40;
              background: #FFFFFF;
              border-bottom: 1px solid #E2E8F0;
              padding: 10px 20px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            }

            .eval-header-inner {
              max-width: 860px;
              margin: 0 auto;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 16px;
            }

            .eval-brand-group {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .eval-college-logo {
              height: 38px;
              width: auto;
              border-radius: 4px;
              display: block;
            }

            .eval-title-block {
              display: flex;
              flex-direction: column;
            }

            .eval-college-name {
              font-size: 13.5px;
              font-weight: 700;
              color: #0F172A;
              letter-spacing: -0.01em;
              margin: 0;
              line-height: 1.25;
            }

            .eval-portal-name {
              font-size: 11.5px;
              color: #64748B;
              margin: 0;
            }

            .eval-header-meta {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .eval-step-badge {
              font-size: 12px;
              font-weight: 600;
              color: #C2410C;
              background: #FFF7ED;
              border: 1px solid #FED7AA;
              padding: 4px 10px;
              border-radius: 6px;
              white-space: nowrap;
            }

            .eval-confidential-tag {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 11.5px;
              color: #C2410C;
              font-weight: 600;
              background: #FFF7ED;
              border: 1px solid #FED7AA;
              padding: 3px 8px;
              border-radius: 4px;
              white-space: nowrap;
            }

            .eval-progress-bar-track {
              height: 3px;
              width: 100%;
              background: #E2E8F0;
            }

            .eval-progress-bar-fill {
              height: 100%;
              background: #EA580C;
              transition: width 0.3s ease;
            }

            /* Main Form Canvas */
            .eval-main-wrapper {
              max-width: 860px;
              margin: 0 auto;
              padding: 20px 20px 80px 20px;
            }

            /* Faculty Information Card */
            .eval-faculty-card {
              background: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 16px 20px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 12px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
            }

            .eval-course-tag {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
              font-weight: 600;
              color: #C2410C;
              background: #FFF7ED;
              border: 1px solid #FED7AA;
              padding: 2px 8px;
              border-radius: 4px;
              margin-bottom: 4px;
            }

            .eval-faculty-name {
              font-size: 17px;
              font-weight: 700;
              color: #0F172A;
              margin: 0 0 2px 0;
            }

            .eval-faculty-id {
              font-size: 12px;
              color: #64748B;
              margin: 0;
            }

            .eval-completion-counter {
              font-size: 13px;
              font-weight: 600;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 5px 12px;
              border-radius: 6px;
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              color: #475569;
            }

            .eval-completion-counter.done {
              background: #FFF7ED;
              border-color: #FED7AA;
              color: #C2410C;
            }

            /* Section Card */
            .eval-section-panel {
              background: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              margin-bottom: 20px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            }

            .eval-section-header {
              background: #F8FAFC;
              border-bottom: 1px solid #E2E8F0;
              padding: 12px 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 8px;
            }

            .eval-section-title {
              font-size: 14px;
              font-weight: 700;
              color: #1E293B;
              margin: 0;
            }

            .eval-section-score {
              font-size: 12px;
              font-weight: 600;
              color: #475569;
            }

            .eval-scale-legend-bar {
              padding: 7px 18px;
              background: #FAFAFA;
              border-bottom: 1px solid #F1F5F9;
              font-size: 11.5px;
              color: #64748B;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            /* Question List */
            .eval-question-table {
              padding: 0;
              margin: 0;
              list-style: none;
            }

            .eval-question-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 20px;
              padding: 14px 18px;
              border-bottom: 1px solid #F1F5F9;
            }

            .eval-question-item:last-child {
              border-bottom: none;
            }

            .eval-question-text {
              flex: 1 1 360px;
              font-size: 13.5px;
              font-weight: 500;
              color: #1E293B;
              line-height: 1.45;
              display: flex;
              align-items: flex-start;
              gap: 10px;
            }

            .eval-q-num {
              color: #64748B;
              font-weight: 600;
              min-width: 22px;
            }

            /* Rating Buttons (Student Orange Uniform Theme) */
            .eval-rating-group {
              flex-shrink: 0;
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 6px;
              width: 240px;
            }

            .eval-rating-btn {
              height: 38px;
              border-radius: 6px;
              font-size: 13.5px;
              font-weight: 600;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              background: #FFFFFF;
              border: 1px solid #D1D5DB;
              color: #374151;
              transition: all 0.15s ease;
              user-select: none;
              touch-action: manipulation;
            }

            .eval-rating-btn:hover {
              background: #FFF7ED;
              border-color: #FDBA74;
              color: var(--primary, #EA580C);
            }

            .eval-rating-btn.selected {
              background: var(--primary, #EA580C);
              border-color: var(--primary, #EA580C);
              color: #FFFFFF;
              font-weight: 700;
              box-shadow: 0 1px 3px rgba(234, 88, 12, 0.35);
            }

            /* Contextual Low-Score Panel */
            .eval-low-score-box {
              background: #FFFDFB;
              border-top: 1px solid #FED7AA;
              padding: 14px 18px;
            }

            .eval-low-score-heading {
              font-size: 12.5px;
              font-weight: 600;
              color: #9A3412;
              margin: 0 0 3px 0;
            }

            .eval-low-score-desc {
              font-size: 11.5px;
              color: #7C2D12;
              margin: 0 0 10px 0;
            }

            .eval-chips-row {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-bottom: 10px;
            }

            .eval-chip-btn {
              background: #FFFFFF;
              border: 1px solid #FED7AA;
              color: #9A3412;
              font-size: 12px;
              font-weight: 500;
              padding: 5px 11px;
              border-radius: 6px;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 5px;
              transition: all 0.15s ease;
            }

            .eval-chip-btn:hover {
              background: #FFF7ED;
              border-color: #FDBA74;
            }

            .eval-chip-btn.active {
              background: var(--primary, #EA580C);
              border-color: var(--primary, #EA580C);
              color: #FFFFFF;
              font-weight: 600;
            }

            .eval-input-text {
              width: 100%;
              border: 1px solid #D1D5DB;
              border-radius: 6px;
              padding: 8px 12px;
              font-size: 13.5px;
              font-family: inherit;
              box-sizing: border-box;
              background: #FFFFFF;
              color: #0F172A;
              resize: vertical;
            }

            .eval-input-text:focus {
              outline: none;
              border-color: var(--primary, #EA580C);
              box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.18);
            }

            /* Remarks Box */
            .eval-remark-container {
              background: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 16px 18px;
              margin-bottom: 24px;
            }

            .eval-remark-label {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 13px;
              font-weight: 600;
              color: #1E293B;
              margin-bottom: 8px;
            }

            /* Final Step Review Card */
            .eval-final-card {
              background: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 24px 20px;
              margin-bottom: 24px;
            }

            .eval-final-title {
              font-size: 16px;
              font-weight: 700;
              color: #0F172A;
              margin: 0 0 6px 0;
            }

            .eval-final-sub {
              font-size: 13px;
              color: #64748B;
              margin: 0 0 18px 0;
              line-height: 1.5;
            }

            .eval-summary-list {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
              gap: 8px;
              margin-bottom: 20px;
            }

            .eval-summary-item {
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 6px;
              padding: 10px 12px;
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .eval-summary-check {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #FFF7ED;
              color: #EA580C;
              border: 1px solid #FED7AA;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }

            /* Action Buttons */
            .eval-action-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 14px;
              margin-top: 24px;
            }

            .eval-btn-back {
              height: 40px;
              padding: 0 20px;
              border: 1px solid #D1D5DB;
              background: #FFFFFF;
              color: #374151;
              border-radius: 6px;
              font-size: 13.5px;
              font-weight: 500;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .eval-btn-back:hover:not(:disabled) {
              background: #F3F4F6;
              border-color: #9CA3AF;
            }

            .eval-btn-back:disabled {
              opacity: 0.4;
              cursor: not-allowed;
            }

            .eval-btn-primary {
              height: 40px;
              padding: 0 24px;
              background: #EA580C !important;
              color: #FFFFFF !important;
              border: 1px solid #EA580C !important;
              border-radius: 6px;
              font-size: 13.5px;
              font-weight: 600;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .eval-btn-primary:hover:not(.disabled-timer) {
              background: #C2410C !important;
              border-color: #C2410C !important;
            }

            .eval-btn-primary.disabled-timer {
              background: #F8FAFC !important;
              border-color: #E2E8F0 !important;
              color: #94A3B8 !important;
              cursor: not-allowed;
            }

            /* ============================================================ */
            /* MOBILE RESPONSIVE OPTIMIZATIONS (Max-Width 768px)            */
            /* ============================================================ */
            @media (max-width: 768px) {
              .eval-main-wrapper {
                padding: 14px 12px 70px 12px;
              }

              .eval-header-bar {
                padding: 10px 12px;
              }

              .eval-college-logo {
                height: 32px;
              }

              .eval-college-name {
                font-size: 12.5px;
              }

              .eval-portal-name {
                font-size: 11px;
              }

              .eval-confidential-tag {
                display: none; /* Keep header compact on small screens */
              }

              .eval-faculty-card {
                padding: 14px;
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
              }

              .eval-completion-counter {
                width: 100%;
                justify-content: center;
              }

              .eval-section-panel {
                border-radius: 6px;
                margin-bottom: 14px;
              }

              .eval-section-header {
                padding: 10px 14px;
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
              }

              .eval-scale-legend-bar {
                padding: 6px 14px;
                font-size: 11px;
              }

              .eval-question-item {
                flex-direction: column;
                align-items: stretch;
                gap: 12px;
                padding: 14px;
              }

              .eval-question-text {
                flex: none;
                width: 100%;
                font-size: 13.5px;
              }

              .eval-rating-group {
                width: 100%;
                gap: 6px;
              }

              .eval-rating-btn {
                height: 36px;
                font-size: 13.5px;
                border-radius: 6px;
              }

              .eval-low-score-box {
                padding: 12px 14px;
              }

              .eval-chips-row {
                gap: 6px;
              }

              .eval-chip-btn {
                flex: 1 1 45%;
                justify-content: center;
                text-align: center;
                padding: 6px 10px;
                font-size: 11.5px;
              }

              .eval-summary-list {
                grid-template-columns: 1fr;
              }

              /* Compact & Refined Mobile Bottom Bar */
              .eval-action-bar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 50;
                margin-top: 0;
                padding: 8px 16px;
                padding-bottom: max(8px, env(safe-area-inset-bottom, 8px));
                background: #FFFFFF;
                border-top: 1px solid #E2E8F0;
                box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.04);
                display: flex;
                justify-content: space-between;
                align-items: center;
              }

              .eval-btn-back {
                height: 36px;
                padding: 0 14px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                flex-shrink: 0;
              }

              .eval-btn-primary {
                height: 36px;
                padding: 0 18px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                flex: 0 0 auto; /* Natural content width, no stretching! */
                justify-content: center;
              }

              .eval-rating-btn:active,
              .eval-chip-btn:active,
              .eval-btn-primary:active,
              .eval-btn-back:active {
                transform: scale(0.97);
              }
            }
          `}
        </style>

        {/* INSTITUTIONAL HEADER BAR */}
        <header className="eval-header-bar">
          <div className="eval-header-inner">
            <div className="eval-brand-group">
              <img src="/logo.jpeg" alt="MIT Mysore Logo" className="eval-college-logo" />
              <div className="eval-title-block">
                <span className="eval-college-name">Maharaja Institute of Technology Mysore</span>
                <span className="eval-portal-name">Course & Faculty Evaluation Portal</span>
              </div>
            </div>

            <div className="eval-header-meta">
              <span className="eval-confidential-tag">
                <ShieldCheck size={13} /> Anonymous
              </span>
              <span className="eval-step-badge">
                {!isFinalStep ? `Faculty ${currentStep + 1} of ${facultyList.length}` : "Department Remarks"}
              </span>
            </div>
          </div>
        </header>

        <div className="eval-progress-bar-track">
          <div className="eval-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* MAIN EVALUATION CANVAS */}
        <main className="eval-main-wrapper">
          {!isFinalStep && currentFaculty && (
            <div>
              {/* Faculty Information Card */}
              <div className="eval-faculty-card">
                <div>
                  <div className="eval-course-tag">
                    <BookOpen size={13} />
                    <span>{currentFaculty.course_id} — {currentFaculty.course_name}</span>
                  </div>
                  <h2 className="eval-faculty-name">{currentFaculty.faculty_name}</h2>
                  <p className="eval-faculty-id">Faculty ID: {currentFaculty.faculty_id}</p>
                </div>

                <div className={`eval-completion-counter ${isCurrentFacultyComplete ? "done" : ""}`}>
                  {isCurrentFacultyComplete ? (
                    <>
                      <Check size={14} /> Completed ({answeredInCurrentStep}/{totalFacultyQuestions})
                    </>
                  ) : (
                    <span>{answeredInCurrentStep} of {totalFacultyQuestions} Answered</span>
                  )}
                </div>
              </div>

              {/* Evaluation Sections */}
              {(orderedSections.length > 0 
                ? orderedSections 
                : Object.entries(groupedQuestions).map(([heading, questions]) => ({ heading, questions }))
              ).map(({ heading, questions: headingQuestions }) => {
                const sectionAvg = calculateSectionAverage(headingQuestions, currentStep);
                const isLowScore = sectionAvg > 0 && sectionAvg <= 3.0;

                return (
                  <div key={heading} className="eval-section-panel">
                    {/* Section Header */}
                    <div className="eval-section-header">
                      <h3 className="eval-section-title">{heading}</h3>
                      {sectionAvg > 0 && (
                        <span className="eval-section-score">
                          Section Average: <strong>{sectionAvg}</strong> / 5.0
                        </span>
                      )}
                    </div>

                    {/* Scale Legend Guide */}
                    <div className="eval-scale-legend-bar">
                      <span>Rating Scale:</span>
                      <span>1: Unsatisfactory · 2: Needs Improvement · 3: Satisfactory · 4: Good · 5: Excellent</span>
                    </div>

                    {/* Questions Table */}
                    <ul className="eval-question-table">
                      {headingQuestions.map((q, qIndex) => {
                        const selectedRating = feedbackData[currentStep]?.[q.question_id];

                        return (
                          <li key={q.question_id} className="eval-question-item">
                            <div className="eval-question-text">
                              <span className="eval-q-num">{qIndex + 1}.</span>
                              <span>{q.question_text}</span>
                            </div>

                            <div className="eval-rating-group">
                              {[1, 2, 3, 4, 5].map((num) => {
                                const isSelected = selectedRating === num;
                                return (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => handleRatingChange(currentStep, q.question_id, num)}
                                    className={`eval-rating-btn ${isSelected ? "selected" : ""}`}
                                    aria-label={`Score ${num} for question ${q.question_id}`}
                                  >
                                    {num}
                                  </button>
                                );
                              })}
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Contextual Feedback on Low Scores */}
                    {isLowScore && (
                      <div className="eval-low-score-box">
                        <h4 className="eval-low-score-heading">
                          Section Feedback (Current Section Average: {sectionAvg} / 5.0)
                        </h4>
                        <p className="eval-low-score-desc">
                          Please select an area for improvement or enter specific feedback to help improve course delivery:
                        </p>

                        <div className="eval-chips-row">
                          {QUICK_FEEDBACK_OPTIONS.map((chip) => {
                            const isSelected = sectionRemarks[currentStep]?.[heading] === chip;
                            return (
                              <button
                                key={chip}
                                type="button"
                                className={`eval-chip-btn ${isSelected ? "active" : ""}`}
                                onClick={() => {
                                  setSectionRemarks((prev) => ({
                                    ...prev,
                                    [currentStep]: {
                                      ...(prev[currentStep] || {}),
                                      [heading]: isSelected ? "" : chip
                                    }
                                  }));
                                }}
                              >
                                {isSelected && <Check size={12} />} {chip}
                              </button>
                            );
                          })}
                        </div>

                        <textarea
                          className="eval-input-text"
                          rows={2}
                          placeholder="Optional specific suggestion for this section..."
                          value={
                            QUICK_FEEDBACK_OPTIONS.includes(sectionRemarks[currentStep]?.[heading])
                              ? ""
                              : sectionRemarks[currentStep]?.[heading] || ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setSectionRemarks((prev) => ({
                              ...prev,
                              [currentStep]: {
                                ...(prev[currentStep] || {}),
                                [heading]: val
                              }
                            }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* General Remarks for Faculty */}
              <div className="eval-remark-container">
                <div className="eval-remark-label">
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MessageSquare size={15} color="var(--primary, #EA580C)" />
                    General Comments for {currentFaculty.faculty_name}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "normal" }}>Optional</span>
                </div>
                <textarea
                  className="eval-input-text"
                  rows={3}
                  placeholder={`Constructive feedback or general observations for ${currentFaculty.faculty_name}...`}
                  value={facultyRemarks[currentStep] || ""}
                  onChange={(e) => handleFacultyRemarkChange(currentStep, e.target.value)}
                />
              </div>
            </div>
          )}

          {/* FINAL STEP: DEPARTMENT REMARKS & SUBMIT */}
          {isFinalStep && (
            <div className="eval-final-card">
              <h3 className="eval-final-title">Course Evaluation Complete</h3>
              <p className="eval-final-sub">
                You have evaluated all assigned faculty members for this academic session.
                You may review the completed faculty list below and provide any additional comments for the department.
              </p>

              <div className="eval-summary-list">
                {facultyList.map((fac, idx) => (
                  <div key={`${fac.faculty_id}-${fac.course_id || idx}`} className="eval-summary-item">
                    <div className="eval-summary-check">
                      <Check size={12} />
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {fac.faculty_name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748B", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {fac.course_id} — {fac.course_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#1E293B", marginBottom: "6px" }}>
                  Institutional & Department Feedback (Optional)
                </label>
                <textarea
                  className="eval-input-text"
                  rows={4}
                  placeholder="Suggestions regarding laboratory equipment, classroom facilities, academic scheduling, or departmental resources..."
                  value={departmentRemark}
                  onChange={(e) => setDepartmentRemark(e.target.value)}
                />
              </div>

              <p style={{ fontSize: "12px", color: "#64748B", marginTop: "12px", lineHeight: 1.4 }}>
                <strong>Confidentiality Note:</strong> All responses are encrypted and submitted anonymously. Once submitted, answers cannot be edited.
              </p>
            </div>
          )}

          {/* ACTION NAVIGATION CONTROLS */}
          <nav className="eval-action-bar" aria-label="Evaluation form navigation">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="eval-btn-back"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {!isFinalStep ? (
              <button
                type="button"
                onClick={handleNext}
                className="eval-btn-primary"
              >
                {currentStep === facultyList.length - 1 ? "Review & Department Remarks" : "Next Faculty"}
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || timeLeft > 0}
                className={`eval-btn-primary ${timeLeft > 0 ? "disabled-timer" : ""}`}
              >
                {timeLeft > 0 ? (
                  <>
                    <Clock size={15} /> Submit in {formatTimer(timeLeft)}
                  </>
                ) : (
                  <>
                    <Send size={15} /> Submit All Feedback
                  </>
                )}
              </button>
            )}
          </nav>
        </main>
      </div>
    </PageTransition>
  );
}
