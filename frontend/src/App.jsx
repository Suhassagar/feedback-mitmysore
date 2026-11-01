import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingFallback from "./components/ui/LoadingFallback";

// Public & Student Core
const HomePortal = lazy(() => import("./pages/HomePortal"));
const StudentLogin = lazy(() => import("./pages/StudentLogin"));
const FeedbackForm = lazy(() => import("./pages/FeedbackForm"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const DepartmentLogin = lazy(() => import("./pages/DepartmentLogin"));
const FacultyLogin = lazy(() => import("./pages/FacultyLogin"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin Domain
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminMainDashboard = lazy(() => import("./pages/admin/AdminMainDashboard"));
const AdminDepartments = lazy(() => import("./pages/admin/AdminDepartments"));
const AdminFacultyCenter = lazy(() => import("./pages/admin/AdminFacultyCenter"));
const AdminStudentCenter = lazy(() => import("./pages/admin/AdminStudentCenter"));
const AdminSessionCenter = lazy(() => import("./pages/admin/AdminSessionCenter"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSystemLogs = lazy(() => import("./pages/admin/AdminSystemLogs"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

// Department Domain
const DepartmentLayout = lazy(() => import("./components/DepartmentLayout"));
const DepartmentDashboard = lazy(() => import("./pages/DepartmentDashboard"));
const ManageStudents = lazy(() => import("./pages/ManageStudents"));
const ManageFaculty = lazy(() => import("./pages/ManageFaculty"));
const ManageSessions = lazy(() => import("./pages/ManageSessions"));
const ManageQuestions = lazy(() => import("./pages/ManageQuestions"));
const AddCoursePage = lazy(() => import("./pages/AddCoursepage"));
const DepartmentRemarks = lazy(() => import("./pages/DepartmentRemarks"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const DepartmentSettings = lazy(() => import("./pages/DepartmentSettings"));

// Faculty Domain
const FacultyLayout = lazy(() => import("./components/FacultyLayout"));
const FacultyDashboard = lazy(() => import("./pages/FacultyDashboard"));
const FacultySettings = lazy(() => import("./pages/FacultySettings"));
const FacultyProfile = lazy(() => import("./pages/FacultyProfile"));

function DepartmentRedirect() {
  const { dept_id } = useParams();
  return <Navigate to={`/department-dashboard/${dept_id}`} replace />;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'MITM ABHIPRAYA | Faculty & Course Feedback Evaluation System',
      '/admin-login': 'Admin Login | MITM ABHIPRAYA',
      '/department-login': 'Department Login | MITM ABHIPRAYA',
      '/student-login': 'Student Login | MITM ABHIPRAYA',
      '/faculty-login': 'Faculty Login | MITM ABHIPRAYA',
      '/admin-dashboard': 'Admin Dashboard | MITM ABHIPRAYA',
      '/faculty-dashboard': 'Faculty Dashboard | MITM ABHIPRAYA',
      '/faculty-settings': 'Faculty Settings | MITM ABHIPRAYA',
      '/faculty-profile': 'Faculty Profile | MITM ABHIPRAYA',
      '/feedback': 'Student Feedback Evaluation | MITM ABHIPRAYA'
    };

    if (titles[location.pathname]) {
      document.title = titles[location.pathname];
    } else if (location.pathname.startsWith('/department-dashboard')) {
      document.title = 'Department Dashboard | MITM ABHIPRAYA';
    } else if (location.pathname.startsWith('/manage-') || location.pathname.startsWith('/add-course') || location.pathname.startsWith('/department-')) {
      document.title = 'Department Management | MITM ABHIPRAYA';
    } else if (location.pathname.startsWith('/admin/')) {
      document.title = 'Admin Center | MITM ABHIPRAYA';
    }
  }, [location.pathname]);

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

      <Suspense fallback={<LoadingFallback />}>
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

          {/* Legacy Department Route Redirect */}
          <Route path="/department/:dept_id" element={<DepartmentRedirect />} />
          <Route path="/feedback" element={<ProtectedRoute allowedRoles={['student']}><FeedbackForm /></ProtectedRoute>} />

          {/* Global Catch-All 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
