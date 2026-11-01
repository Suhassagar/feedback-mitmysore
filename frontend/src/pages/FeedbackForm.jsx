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
  MessageSquare,
  Lock,
  EyeOff,
  UserCheck,
  AlertTriangle
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import { jumbleQuestionsForStudent } from "../utils/shuffleUtils";
import ConfirmModal from "../components/ui/ConfirmModal";
import "./FeedbackForm.css";

const QUICK_FEEDBACK_OPTIONS = [
  "Teaching pace too fast",
  "Explanations need more clarity",
  "Need more practical examples",
  "Syllabus coverage rushed",
  "More interactive discussions needed",
  "Additional study materials required"
];

// Helper to extract clean initials from faculty names (handles Dr., Prof., etc.)
function getFacultyInitials(name) {
  if (!name || typeof name !== 'string') return 'F';
  const cleanName = name.replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.charAt(0).toUpperCase();
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Clean Faculty Avatar Component with Fail-Safe Initials Fallback
function FacultyAvatar({ photoUrl, name, size = 56, className = "" }) {
  const [imgError, setImgError] = useState(false);
  const initials = getFacultyInitials(name);

  // Reset error state if current faculty/photoUrl changes during wizard step navigation
  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  const hasValidPhoto = Boolean(photoUrl && typeof photoUrl === 'string' && photoUrl.trim() !== '' && !imgError);

  return (
    <div 
      className={`eval-faculty-avatar-container ${className}`}
      style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px` }}
      aria-label={`Profile photo of ${name || 'Faculty'}`}
    >
      {hasValidPhoto ? (
        <img
          src={photoUrl}
          alt={name || "Faculty Member"}
          className="eval-faculty-avatar-img"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="eval-faculty-avatar-fallback">
          <span>{initials}</span>
        </div>
      )}
    </div>
  );
}

export default function FeedbackForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const session_id = location.state?.session_id || sessionStorage.getItem('active_feedback_session_id');

  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [groupedQuestions, setGroupedQuestions] = useState({});
  const [orderedSections, setOrderedSections] = useState([]);
  
  const draftKey = session_id ? `feedback_draft_${session_id}` : null;

  const [feedbackData, setFeedbackData] = useState(() => {
    try {
      if (draftKey) {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) return JSON.parse(saved).feedbackData || {};
      }
    } catch {
      // Ignore JSON parse errors
    }
    return {};
  });

  const [facultyRemarks, setFacultyRemarks] = useState(() => {
    try {
      if (draftKey) {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) return JSON.parse(saved).facultyRemarks || {};
      }
    } catch {
      // Ignore JSON parse errors
    }
    return {};
  });

  const [sectionRemarks, setSectionRemarks] = useState(() => {
    try {
      if (draftKey) {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) return JSON.parse(saved).sectionRemarks || {};
      }
    } catch {
      // Ignore JSON parse errors
    }
    return {};
  });

  const [departmentRemark, setDepartmentRemark] = useState(() => {
    try {
      if (draftKey) {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) return JSON.parse(saved).departmentRemark || "";
      }
    } catch {
      // Ignore JSON parse errors
    }
    return "";
  });

  const [idempotencyKey, setIdempotencyKey] = useState(null);
  
  // Dynamic timer state (configured by department, default 300)
  const [minTimeSec, setMinTimeSec] = useState(() => {
    const cached = sessionStorage.getItem('feedback_min_time_sec');
    return cached !== null ? parseInt(cached, 10) : 300;
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const cached = sessionStorage.getItem('feedback_min_time_sec');
    const target = cached !== null ? parseInt(cached, 10) : 300;
    if (target === 0) return 0;
    const startTime = sessionStorage.getItem('feedback_start_time_local');
    if (startTime) {
      const elapsed = Math.floor((Date.now() - parseInt(startTime, 10)) / 1000);
      return Math.max(0, target - elapsed);
    }
    return target;
  });
  
  // Wizard step (0 to facultyList.length)
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      if (draftKey) {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) return JSON.parse(saved).currentStep || 0;
      }
    } catch {
      // Ignore JSON parse errors
    }
    return 0;
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Feedback Authenticity Guard state
  const [submissionAttempt, setSubmissionAttempt] = useState(1);
  const [justificationRemark, setJustificationRemark] = useState("");
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [detectedUniformScore, setDetectedUniformScore] = useState(null);
  const [showJustificationInput, setShowJustificationInput] = useState(false);

  // Auto-sync draft to sessionStorage to protect against accidental tab reload or phone lock
  useEffect(() => {
    if (draftKey && (Object.keys(feedbackData).length > 0 || departmentRemark || currentStep > 0)) {
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({
          feedbackData,
          facultyRemarks,
          sectionRemarks,
          departmentRemark,
          currentStep
        }));
      } catch (e) {
        console.warn("Draft auto-sync warning:", e);
      }
    }
  }, [draftKey, feedbackData, facultyRemarks, sectionRemarks, departmentRemark, currentStep]);

  // Professional Anonymity & Privacy Guarantee Modal State
  const [showAnonymityModal, setShowAnonymityModal] = useState(() => {
    return !sessionStorage.getItem('feedback_anonymity_acknowledged');
  });

  const handleAcknowledgeAnonymity = () => {
    sessionStorage.setItem('feedback_anonymity_acknowledged', 'true');
    setShowAnonymityModal(false);
  };

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

        // Fetch dynamic submission timer configured by department
        try {
          const timingRes = await apiClient.get(`/feedback/timing/${session_id}`);
          if (timingRes.data && typeof timingRes.data.min_time_sec === 'number') {
            const configuredSec = timingRes.data.min_time_sec;
            sessionStorage.setItem('feedback_min_time_sec', configuredSec);
            setMinTimeSec(configuredSec);
            if (configuredSec === 0) {
              setTimeLeft(0);
            } else {
              const startT = sessionStorage.getItem('feedback_start_time_local') || Date.now();
              const elapsed = Math.floor((Date.now() - parseInt(startT, 10)) / 1000);
              setTimeLeft(Math.max(0, configuredSec - elapsed));
            }
          }
        } catch {
          // Graceful fallback to default
        }

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
      const cachedMin = sessionStorage.getItem('feedback_min_time_sec');
      const activeMin = cachedMin !== null ? parseInt(cachedMin, 10) : minTimeSec;
      if (activeMin === 0) {
        setTimeLeft(0);
        clearInterval(timerInterval);
        return;
      }
      const elapsed = Math.floor((Date.now() - parseInt(startTime, 10)) / 1000);
      const remaining = Math.max(0, activeMin - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(timerInterval);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [session_id, navigate, minTimeSec]);

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

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    const feedbackPayload = facultyList.map((faculty, fIndex) => ({
      faculty_id: faculty.faculty_id,
      course_id: faculty.course_id,
      feedback: feedbackData[fIndex],
      remark: facultyRemarks[fIndex] || "",
      section_remarks: sectionRemarks[fIndex] || {},
    }));

    const maxAttempts = 3;
    let attempt = 0;
    let success = false;
    let lastError = null;
    let integrityInterception = false;

    while (attempt < maxAttempts && !success) {
      attempt++;
      try {
        if (attempt > 1) {
          toast.loading(`Network interrupted. Retrying submission (Attempt ${attempt}/${maxAttempts})...`, { id: 'retry-toast' });
        }

        await apiClient.post(
          "/submit-feedback",
          {
            session_id,
            facultyList: feedbackPayload,
            department_remark: departmentRemark,
            idempotency_key: idempotencyKey,
            submission_attempt: submissionAttempt,
            justification_remark: justificationRemark,
          },
          { withCredentials: true, timeout: 15000 }
        );

        success = true;
        toast.dismiss('retry-toast');
      } catch (err) {
        lastError = err;

        // Dynamic Feedback Authenticity Guard: Intercept HTTP 422
        if (err.response?.status === 422) {
          const resp = err.response.data;
          if (resp?.code === "INTEGRITY_RETRY_REQUIRED") {
            integrityInterception = true;
            setDetectedUniformScore(resp.detected_score);
            setSubmissionAttempt(2);
            setShowSubmitModal(false);
            setShowIntegrityModal(true);
            break;
          } else if (resp?.code === "JUSTIFICATION_REQUIRED") {
            integrityInterception = true;
            setDetectedUniformScore(resp.detected_score);
            setSubmissionAttempt(2);
            setShowJustificationInput(true);
            setShowSubmitModal(false);
            setShowIntegrityModal(true);
            break;
          }
        }

        // If client error (bad request, duplicate token, dwell timer, unauthorized), do not retry
        if (err.response?.status === 403 || err.response?.status === 400 || err.response?.status === 401 || err.response?.status === 422) {
          break;
        }
        // If network disconnect or server 5xx, wait and retry with exponential backoff
        if (attempt < maxAttempts) {
          const backoffDelay = attempt * 1500;
          await new Promise(res => setTimeout(res, backoffDelay));
        }
      }
    }

    if (success) {
      if (draftKey) sessionStorage.removeItem(draftKey);
      sessionStorage.removeItem('active_feedback_session_id');
      sessionStorage.removeItem('student_usn');
      sessionStorage.removeItem('feedback_student_seed');
      sessionStorage.removeItem('feedback_start_time_local');
      sessionStorage.removeItem('feedback_anonymity_acknowledged');
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // continue
      }

      toast.success("Feedback submitted successfully.");
      setShowSubmitModal(false);
      setShowIntegrityModal(false);
      navigate("/");
    } else if (!integrityInterception) {
      toast.dismiss('retry-toast');
      console.error("Submission failed after attempts:", lastError?.response?.data || lastError?.message);
      toast.error(lastError?.response?.data?.error || "Submission failed due to weak network. Your answers are saved as draft! Please check your connection and tap Submit again.", { duration: 6000 });
    }
    setIsSubmitting(false);
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
        {/* ============================================================ */}
        {/* ANONYMITY & PRIVACY PLEDGE MODAL (ON FIRST LOGIN)            */}
        {/* ============================================================ */}
        {showAnonymityModal && (
          <div className="anonymity-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="anonymity-modal-title">
            <div className="anonymity-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="anonymity-modal-header">
                <div className="anonymity-badge-icon">
                  <ShieldCheck size={24} />
                </div>
                <div className="anonymity-header-text">
                  <span className="anonymity-college-tag">Maharaja Institute of Technology Mysore</span>
                  <h3 id="anonymity-modal-title" className="anonymity-modal-title">Anonymity &amp; Privacy Guarantee</h3>
                </div>
              </div>

              <div className="anonymity-modal-body">
                <p className="anonymity-intro-p">
                  Welcome to <strong>MITM ABHIPRAYA</strong>. Before you begin your course evaluation, please review how your identity and ratings are protected:
                </p>

                <div className="anonymity-pillar">
                  <div className="anonymity-pillar-icon">
                    <Lock size={16} />
                  </div>
                  <div className="anonymity-pillar-content">
                    <h4>100% Cryptographic Anonymity</h4>
                    <p>Your USN is verified solely to confirm your registration and record completion. It is strictly decoupled and never saved with your feedback ratings.</p>
                  </div>
                </div>

                <div className="anonymity-pillar">
                  <div className="anonymity-pillar-icon">
                    <EyeOff size={16} />
                  </div>
                  <div className="anonymity-pillar-content">
                    <h4>Zero Faculty Visibility</h4>
                    <p>Professors and department heads receive only consolidated class averages, radar charts, and anonymous remarks. Individual responses cannot be traced.</p>
                  </div>
                </div>

                <div className="anonymity-pillar">
                  <div className="anonymity-pillar-icon">
                    <UserCheck size={16} />
                  </div>
                  <div className="anonymity-pillar-content">
                    <h4>Authentic Academic Impact</h4>
                    <p>Your honest evaluation guides teaching quality, curriculum delivery, and institutional accreditation. Please evaluate each question thoughtfully.</p>
                  </div>
                </div>
              </div>

              <div className="anonymity-modal-footer">
                <button
                  type="button"
                  className="anonymity-btn-proceed"
                  onClick={handleAcknowledgeAnonymity}
                  autoFocus
                >
                  <span>I Understand &amp; Begin Evaluation</span>
                  <ChevronRight size={17} />
                </button>
                <p className="anonymity-footer-note">
                  <Lock size={11} /> End-to-end encrypted session • NBA &amp; NAAC compliant appraisal
                </p>
              </div>
            </div>
          </div>
        )}

        {/* INSTITUTIONAL HEADER BAR */}
        <header className="eval-header-bar">
          <div className="eval-header-inner">
            <div className="eval-brand-group">
              <img src="/logo.jpeg" alt="MITM ABHIPRAYA Logo" className="eval-college-logo" />
              <div className="eval-title-block">
                <span className="eval-college-name">Maharaja Institute of Technology Mysore</span>
                <span className="eval-portal-name">MITM ABHIPRAYA • Course & Faculty Evaluation Portal</span>
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
              {/* Faculty Information Card with Photo Avatar */}
              <div className="eval-faculty-card">
                <div className="eval-faculty-profile-group">
                  <FacultyAvatar 
                    photoUrl={currentFaculty.profile_picture_url} 
                    name={currentFaculty.faculty_name} 
                    size={56} 
                  />
                  <div className="eval-faculty-meta">
                    <div className="eval-course-tag">
                      <BookOpen size={13} />
                      <span>{currentFaculty.course_id} — {currentFaculty.course_name}</span>
                    </div>
                    <h2 className="eval-faculty-name">{currentFaculty.faculty_name}</h2>
                    <div className="eval-faculty-subtext">
                      {currentFaculty.designation && (
                        <span className="eval-faculty-designation">{currentFaculty.designation}</span>
                      )}
                      {currentFaculty.designation && <span className="eval-faculty-dot">•</span>}
                      <span className="eval-faculty-id">Faculty ID: {currentFaculty.faculty_id}</span>
                    </div>
                  </div>
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
                    <FacultyAvatar 
                      photoUrl={fac.profile_picture_url} 
                      name={fac.faculty_name} 
                      size={28} 
                      className="eval-summary-avatar"
                    />
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

        {/* CONFIRMATION MODAL FOR FEEDBACK SUBMISSION */}
        <ConfirmModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onConfirm={executeSubmit}
          title="Submit Course Evaluation"
          message="Are you sure you want to finalize and submit your feedback responses?"
          subtext="Once submitted, your confidential evaluation is encrypted and cannot be modified or re-taken."
          confirmText="Confirm & Submit"
          isDestructive={false}
          isLoading={isSubmitting}
        />

        {/* ============================================================ */}
        {/* REFLECTION & RE-EVALUATION AUTHENTICITY MODAL                */}
        {/* ============================================================ */}
        {showIntegrityModal && (
          <div className="anonymity-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="integrity-modal-title">
            <div className="anonymity-modal-card integrity-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="anonymity-modal-header integrity-modal-header">
                <div className="integrity-badge-icon">
                  <AlertTriangle size={24} />
                </div>
                <div className="anonymity-header-text">
                  <span className="integrity-college-tag">NBA &amp; NAAC Institutional Quality Standard</span>
                  <h3 id="integrity-modal-title" className="anonymity-modal-title">Feedback Authenticity Review</h3>
                </div>
              </div>

              <div className="anonymity-modal-body">
                <div className="integrity-alert-banner">
                  <div className="integrity-alert-title">
                    Uniform Rating Detected ({detectedUniformScore}/5 Across All Courses)
                  </div>
                  <p className="integrity-alert-desc">
                    All faculty questions were marked with an identical score of <strong>{detectedUniformScore}/5</strong>. Thoughtful, differentiated evaluation is vital for meaningful faculty growth and educational quality.
                  </p>
                </div>

                {!showJustificationInput ? (
                  <>
                    <p className="anonymity-intro-p">
                      Maharaja Institute of Technology Mysore asks that students reflect on each instructor&apos;s distinct teaching style, clarity, responsiveness, and course pacing:
                    </p>

                    <div className="integrity-action-card">
                      <div className="integrity-action-title">Option 1: Review &amp; Adjust Ratings (Recommended)</div>
                      <p className="integrity-action-desc">
                        Your selections have been preserved on the form. Revisit individual teacher sections to fine-tune scores where instructional delivery differed.
                      </p>
                      <button
                        type="button"
                        className="eval-btn-primary integrity-review-btn"
                        onClick={() => {
                          setShowIntegrityModal(false);
                          setCurrentStep(0);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Review &amp; Adjust Ratings
                      </button>
                    </div>

                    <div className="integrity-divider">
                      <span>OR</span>
                    </div>

                    <div className="integrity-action-card secondary">
                      <div className="integrity-action-title">Option 2: Confirm Uniform Scores</div>
                      <p className="integrity-action-desc">
                        If all instructors genuinely delivered an identical standard of education across every metric, you may confirm by providing a brief explanation.
                      </p>
                      <button
                        type="button"
                        className="integrity-secondary-btn"
                        onClick={() => setShowJustificationInput(true)}
                      >
                        Proceed to Provide Justification &rarr;
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="integrity-justification-section">
                    <p className="anonymity-intro-p">
                      Please provide a brief justification (minimum 10 characters) explaining why this uniform rating accurately reflects your academic experience across all instructors:
                    </p>

                    <textarea
                      className="integrity-textarea"
                      rows={3}
                      placeholder="e.g., Every instructor showed exceptional commitment and curriculum clarity this semester."
                      value={justificationRemark}
                      onChange={(e) => setJustificationRemark(e.target.value)}
                    />

                    <div className="integrity-char-counter">
                      <span>{justificationRemark.trim().length} / 10 characters minimum</span>
                      {justificationRemark.trim().length >= 10 && (
                        <span className="integrity-valid-text"><Check size={14} /> Requirement met</span>
                      )}
                    </div>

                    <div className="integrity-justification-actions">
                      <button
                        type="button"
                        className="integrity-back-btn"
                        onClick={() => setShowJustificationInput(false)}
                      >
                        &larr; Back
                      </button>
                      <button
                        type="button"
                        className="eval-btn-primary"
                        disabled={isSubmitting || justificationRemark.trim().length < 10}
                        onClick={executeSubmit}
                      >
                        {isSubmitting ? "Submitting..." : "Confirm & Submit Feedback"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="anonymity-modal-footer">
                <span className="anonymity-footer-note">
                  Feedback is strictly anonymous. Your USN is never stored with ratings or remarks.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
