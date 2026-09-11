import { Outlet, useParams } from "react-router-dom";
import PageTransition from "./PageTransition";
import { useUIStore } from "../store/useUIStore";
import Sidebar from "./layout/Sidebar";
import TopNavbar from "./layout/TopNavbar";
import CopilotWidget from "./copilot/CopilotWidget";

export default function DepartmentLayout() {
  const { dept_id } = useParams();
  const { isSidebarCollapsed } = useUIStore();

  return (
    <div className="dashboard-layout theme-department">
      {/* 1. The Modular Sidebar */}
      <Sidebar dept_id={dept_id} />

      {/* 2. The Modular Top Navbar (Header) */}
      <TopNavbar dept_id={dept_id} />

      {/* 3. The Actual Page Content */}
      <main className="dashboard-main">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      
      {/* 4. The Agentic Copilot */}
      <CopilotWidget />
    </div>
  );
}
