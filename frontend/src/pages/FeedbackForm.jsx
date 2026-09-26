import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";
import { ChevronRight, ChevronLeft, Send, MessageSquare } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { jumbleQuestionsForStudent } from "../utils/shuffleUtils";

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
  const [departmentRemark, setDepartmentRemark] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!session_id) {
      navigate("/student-login");
      return;
    }
    sessionStorage.setItem('active_feedback_session_id', session_id);

    const fetchData = async () => {
      try {
        // Fetch idempotency token for this session
        const tokenRes = await apiClient.get('/feedback/token', { withCredentials: true });
        setIdempotencyKey(tokenRes.data.token);

        const facRes = await apiClient.get(`/student/subjects/${session_id}`);
        setFacultyList(facRes.data);
        
        const qRes = await apiClient.get(`/student/questions/${session_id}`);
        setQuestions(qRes.data);
        
        // Deterministic per-student seed: USN + session_id or persistent session token
        const studentUsn = location.state?.usn || sessionStorage.getItem('student_usn') || '';
        let studentSeed = sessionStorage.getItem('feedback_student_seed');
        if (!studentSeed) {
          studentSeed = `${studentUsn}_${session_id}_${tokenRes.data.token || Date.now()}`;
          sessionStorage.setItem('feedback_student_seed', studentSeed);
        }

        // Jumble sections and questions uniquely for this student
        const { groupedQuestions: jumbledGrouped, orderedSections: jumbledSections } = jumbleQuestionsForStudent(qRes.data, studentSeed);
        setGroupedQuestions(jumbledGrouped);
        setOrderedSections(jumbledSections);
        
        setLoading(false);
      } catch {
        toast.error("Failed to load feedback data");
      }
    };
    
    fetchData();
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

  const validateCurrentStep = () => {
    if (currentStep >= facultyList.length) return true; // Remarks step is always valid (optional)

    // Check if the current faculty has all questions answered
    let missedQuestion = false;
    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      const qId = questions[qIndex].question_id;
      if (!feedbackData[currentStep] || !feedbackData[currentStep][qId]) {
        missedQuestion = true;
        break;
      }
    }
    
    if (missedQuestion) {
      toast.error("Please answer all questions before proceeding.", { duration: 4000 });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!window.confirm("Are you sure you want to submit? You cannot edit later.")) return;

    try {
      const feedbackPayload = facultyList.map((faculty, fIndex) => ({
        faculty_id: faculty.faculty_id,
        course_id: faculty.course_id,
        feedback: feedbackData[fIndex],
        remark: facultyRemarks[fIndex] || "",
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
      try {
        await apiClient.post('/auth/logout');
      } catch (logoutErr) {
        // Continue navigation even if logout times out
      }

      toast.success("Feedback submitted successfully!");
      navigate("/");

    } catch (err) {
      console.error(err.response?.data);
      toast.error(err.response?.data?.error || "Submission error — check backend!");
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: "100vh" }}>
        <h3 style={{ color: "var(--slate)" }}>Loading feedback form...</h3>
      </div>
    );
  }

  const isFinalStep = currentStep === facultyList.length;
  const currentFaculty = !isFinalStep ? facultyList[currentStep] : null;

  return (
    <PageTransition>
      <div className="theme-student container flex-col feedback-container">
        <style>
          {`
            @media (max-width: 600px) {
              .feedback-container {
                padding: 16px 12px !important;
              }
              .feedback-glass-card {
                padding: 16px 12px !important;
                border-radius: 16px !important;
              }
              .feedback-inner-card {
                padding: 16px 12px !important;
              }
              .feedback-remarks-card {
                padding: 24px 14px !important;
              }
              .feedback-section-body {
                padding: 10px 12px !important;
              }
              .feedback-nav-buttons {
                flex-direction: column-reverse !important;
                gap: 12px !important;
              }
              .feedback-nav-buttons button {
                width: 100% !important;
                justify-content: center !important;
              }
              .rating-box-container {
                width: 100%;
                justify-content: space-between !important;
                gap: 6px !important;
              }
              .rating-box-container > div {
                flex: 1;
                max-width: 52px;
              }
            }
          `}
        </style>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2 className="title-large text-gradient" style={{ margin: "0 0 10px 0" }}>Course Feedback</h2>
          
          {/* Progress Indicator */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "20px" }}>
             {facultyList.map((_, idx) => (
               <div key={idx} style={{ 
                 width: "12px", height: "12px", borderRadius: "50%", 
                 background: currentStep >= idx ? "var(--primary)" : "#E2E8F0",
                 border: currentStep === idx ? "2px solid var(--primary)" : "none",
                 transition: "all 0.3s"
               }} />
             ))}
             {/* Final Step Indicator */}
             <div style={{ 
                 width: "12px", height: "12px", borderRadius: "50%", 
                 background: isFinalStep ? "var(--primary)" : "#E2E8F0",
                 border: isFinalStep ? "2px solid var(--primary)" : "none",
                 transition: "all 0.3s"
               }} />
          </div>
          <p style={{ marginTop: "12px", color: "var(--slate)", fontSize: "0.9rem", fontWeight: "500" }}>
            Step {currentStep + 1} of {facultyList.length + 1}
          </p>
        </div>

        <div className="flex-col gap-lg" style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
          
          {/* FACULTY STEP */}
          {!isFinalStep && currentFaculty && (
            <div className="card feedback-glass-card" style={{ width: "100%", maxWidth: "800px", background: "#ffffff", borderRadius: "24px", padding: "var(--space-24)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.05)" }}>
              <div className="flex-col gap-xl">
                <div className="card feedback-inner-card" style={{ padding: "var(--space-24)", borderTop: "5px solid var(--navy)", animation: "fadeIn 0.4s" }}>
                  <div style={{ borderBottom: "1.5px solid #eee", paddingBottom: "15px", marginBottom: "24px" }}>
                    <h3 className="title-medium" style={{ margin: "0 0 5px 0" }}>
                      {currentFaculty.faculty_name} <span style={{ color: "var(--slate)", fontSize: "1rem", fontWeight: "normal" }}>({currentFaculty.faculty_id})</span>
                    </h3>
                    <p style={{ margin: 0, color: "var(--primary)", fontSize: "0.95rem", fontWeight: "600" }}>
                      Course: {currentFaculty.course_name}
                    </p>
                  </div>
                </div>

              <div className="flex-col gap-lg">
                {(orderedSections.length > 0 ? orderedSections : Object.entries(groupedQuestions).map(([heading, questions]) => ({ heading, questions }))).map(({ heading, questions: headingQuestions }, hIndex) => (
                  <div key={heading} style={{ background: "#FAFCFF", border: "1px solid #E2E8F0", borderRadius: "12px", overflow: "hidden" }}>
                    
                    <div style={{ background: "var(--navy)", padding: "12px 20px" }}>
                      <h4 style={{ margin: 0, fontSize: "1.05rem", color: "var(--gold)", fontWeight: "600", letterSpacing: "0.5px" }}>
                        Section {hIndex + 1}: {heading}
                      </h4>
                    </div>

                    <div className="flex-col feedback-section-body" style={{ padding: "10px 20px" }}>
                      {headingQuestions.map((q, qIndex) => (
                        <div key={q.question_id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px", padding: "15px 0", borderBottom: qIndex !== headingQuestions.length - 1 ? "1px solid #E2E8F0" : "none" }}>
                          <label style={{ flex: "1 1 250px", fontWeight: "500", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                            {q.question_text}
                          </label>
                          <div className="rating-box-container" style={{ display: "flex", gap: "12px" }}>
                            {[1, 2, 3, 4, 5].map((num) => {
                              const isSelected = feedbackData[currentStep] && feedbackData[currentStep][q.question_id] == num;
                              return (
                                <div
                                  key={num}
                                  onClick={() => handleRatingChange(currentStep, q.question_id, Number(num))}
                                  style={{
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    width: "38px", height: "38px", cursor: "pointer", borderRadius: "8px",
                                    background: isSelected ? "var(--primary)" : "var(--bg-light)",
                                    color: isSelected ? "#fff" : "var(--slate)",
                                    border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--border-color)"}`,
                                    fontWeight: isSelected ? "700" : "600", fontSize: "1rem", transition: "all 0.2s",
                                    boxShadow: isSelected ? "0 4px 10px rgba(0, 0, 0, 0.1)" : "none"
                                  }}
                                >
                                  {num}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Faculty Remarks Textarea */}
              <div style={{ marginTop: "24px", background: "#FAFCFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                   <label style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "0.95rem" }}>
                     Remarks for {currentFaculty.faculty_name} <span style={{ color: "var(--slate)", fontWeight: "normal", fontSize: "0.85rem" }}>(Optional)</span>
                   </label>
                   <span style={{ fontSize: "0.75rem", background: "#E2E8F0", color: "var(--slate)", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>100% Anonymous</span>
                </div>
                <textarea 
                  className="form-input"
                  placeholder={`Share constructive feedback for ${currentFaculty.faculty_name}...`}
                  rows={3}
                  value={facultyRemarks[currentStep] || ""}
                  onChange={(e) => handleFacultyRemarkChange(currentStep, e.target.value)}
                  style={{ width: "100%", padding: "12px", resize: "vertical", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                />
              </div>

            </div>
          </div>
        )}

          {/* FINAL STEP: REMARKS */}
          {isFinalStep && (
            <div className="card feedback-remarks-card" style={{ padding: "40px 30px", borderTop: "5px solid var(--gold)", animation: "fadeIn 0.4s", textAlign: "center" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "var(--bg-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold", border: "2px solid var(--focus-ring)", margin: "0 auto 20px auto" }}>
                <MessageSquare size={36} color="var(--gold)" />
              </div>
              <h3 className="title-medium" style={{ margin: "0 0 10px 0" }}>Almost Done!</h3>
              <p style={{ margin: "0 0 30px 0", color: "var(--slate)", lineHeight: "1.6" }}>
                Thank you for evaluating your faculties. If you have any additional suggestions, remarks, or general feedback for the department, please leave them below. 
                <br/><strong style={{ color: "var(--navy)" }}>This is completely anonymous.</strong>
              </p>

              <div style={{ textAlign: "left", marginBottom: "20px" }}>
                 <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)", fontSize: "14px" }}>
                   Department Remarks (Optional)
                 </label>
                 <textarea 
                   className="form-input"
                   placeholder="Enter your anonymous suggestions here..."
                   rows={5}
                   value={departmentRemark}
                   onChange={(e) => setDepartmentRemark(e.target.value)}
                   style={{ width: "100%", padding: "16px", resize: "vertical" }}
                 />
              </div>
            </div>
          )}

          {/* WIZARD NAVIGATION BUTTONS */}
          <div className="feedback-nav-buttons" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", paddingBottom: "40px" }}>
            <button 
              className="btn hoverable" 
              onClick={handlePrevious} 
              disabled={currentStep === 0}
              style={{ 
                padding: "12px 24px", display: "flex", alignItems: "center", gap: "8px", 
                background: currentStep === 0 ? "#E2E8F0" : "#F1F5F9", 
                color: currentStep === 0 ? "#94A3B8" : "var(--navy)", 
                border: "none", cursor: currentStep === 0 ? "not-allowed" : "pointer", fontWeight: "600"
              }}
            >
              <ChevronLeft size={18} /> Previous
            </button>

            {!isFinalStep ? (
              <button 
                className="btn btn-primary hoverable" 
                onClick={handleNext}
                style={{ padding: "12px 32px", display: "flex", alignItems: "center", gap: "8px", fontSize: "1rem" }}
              >
                {currentStep === facultyList.length - 1 ? "Continue to Remarks" : "Next Faculty"} <ChevronRight size={18} />
              </button>
            ) : (
              <button 
                className="btn hoverable" 
                onClick={handleSubmit}
                disabled={loading}
                style={{ padding: "12px 40px", display: "flex", alignItems: "center", gap: "10px", fontSize: "1.1rem", background: "var(--gold)", color: "var(--navy)", border: "none", fontWeight: "700" }}
              >
                Submit Feedback <Send size={18} />
              </button>
            )}
          </div>
          
        </div>
      </div>
    </PageTransition>
  );
}
