import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import PageTransition from "./components/PageTransition";

import AdminLogin from "./pages/AdminLogin";
import StudentLogin from "./pages/StudentLogin";
import FacultyLogin from "./pages/FacultyLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import FacultyLayout from "./components/FacultyLayout";
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultySettings from "./pages/FacultySettings";
import FacultyProfile from "./pages/FacultyProfile";
import DepartmentPage from "./pages/DepartmentPage";
import AddCoursePage from "./pages/AddCoursepage";
import FeedbackForm from "./pages/FeedbackForm";

import AdminLayout from "./components/AdminLayout";
import AdminMainDashboard from "./pages/admin/AdminMainDashboard";
import AdminDepartments from "./pages/admin/AdminDepartments";
import AdminFacultyCenter from "./pages/admin/AdminFacultyCenter";
import AdminStudentCenter from "./pages/admin/AdminStudentCenter";
import AdminSessionCenter from "./pages/admin/AdminSessionCenter";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminReports from "./pages/admin/AdminReports";
import AdminSystemLogs from "./pages/admin/AdminSystemLogs";
import AdminSettings from "./pages/admin/AdminSettings";

// Popup modal component
import FacultyRegistrationModal from "./components/FacultyRegistrationModal";

// Department Flow
import DepartmentLogin from "./pages/DepartmentLogin";
import DepartmentLayout from "./components/DepartmentLayout";
import DepartmentDashboard from "./pages/DepartmentDashboard";
import HomePortal from "./pages/HomePortal";
import ManageStudents from "./pages/ManageStudents";
import ManageFaculty from "./pages/ManageFaculty";
import ManageSessions from "./pages/ManageSessions";
import ManageQuestions from "./pages/ManageQuestions";
import DepartmentRemarks from "./pages/DepartmentRemarks";
import AuditLogs from "./pages/AuditLogs";
import DepartmentSettings from "./pages/DepartmentSettings";


function App() {
  const navigate = useNavigate();
  
  return (
    <>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { 
            background: 'var(--navy)', 
            color: 'var(--cream)', 
            border: '1px solid var(--gold)',
            boxShadow: '0 8px 32px 0 rgba(13, 27, 42, 0.3)',
            borderRadius: '10px'
          } 
        }} 
      />

      <Routes>
        <Route path="/" element={<HomePortal />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/department-login" element={<DepartmentLogin />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/faculty-login" element={<FacultyLogin />} />
        
        {/* ================= NEW GLOBAL ADMIN SPA ROUTES ================= */}
        <Route element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route path="/admin-dashboard" element={<AdminMainDashboard />} />
          <Route path="/admin/departments" element={<AdminDepartments />} />
          <Route path="/admin/faculty" element={<AdminFacultyCenter />} />
          <Route path="/admin/students" element={<AdminStudentCenter />} />
          <Route path="/admin/sessions" element={<AdminSessionCenter />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/system-logs" element={<AdminSystemLogs />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
        
        {/* ================= DEPARTMENT SPA ROUTES ================= */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'department']}><DepartmentLayout /></ProtectedRoute>}>
          <Route path="/department-dashboard/:dept_id" element={<DepartmentDashboard />} />
          <Route path="/manage-sessions/:dept_id" element={<ManageSessions />} />
          <Route path="/manage-faculty/:dept_id" element={<ManageFaculty />} />
          <Route path="/add-course/:dept_id" element={<AddCoursePage />} />
          <Route path="/manage-students/:dept_id" element={<ManageStudents />} />
          <Route path="/manage-questions/:dept_id" element={<ManageQuestions />} />
          <Route path="/department-remarks/:dept_id" element={<DepartmentRemarks />} />
          <Route path="/audit-logs/:dept_id" element={<AuditLogs />} />
          <Route path="/department-settings/:dept_id" element={<DepartmentSettings />} />
        </Route>

        {/* ================= FACULTY SPA ROUTES ================= */}
        <Route element={<ProtectedRoute allowedRoles={['faculty']}><FacultyLayout /></ProtectedRoute>}>
          <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
          <Route path="/faculty-settings" element={<FacultySettings />} />
          <Route path="/faculty-profile" element={<FacultyProfile />} />
        </Route>

        <Route path="/department/:dept_id" element={<DepartmentPage />} />
        <Route path="/feedback" element={<FeedbackForm />} />
      </Routes>
    </>
  );
}

export default App;
