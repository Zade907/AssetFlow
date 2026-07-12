import { BarChart3, BookOpen, Boxes, ClipboardCheck, Wrench } from "lucide-react";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { SignupPage } from "./features/auth/pages/SignupPage";
import { DashboardPage } from "./features/dashboard/pages/DashboardPage";
import { CategoriesPage } from "./features/org-setup/pages/CategoriesPage";
import { DepartmentsPage } from "./features/org-setup/pages/DepartmentsPage";
import { EmployeesPage } from "./features/org-setup/pages/EmployeesPage";
import { OrgSetupLayout } from "./features/org-setup/pages/OrgSetupLayout";
import { ModulePlaceholderPage } from "./features/shared/pages/ModulePlaceholderPage";
import { NotFoundPage } from "./features/shared/pages/NotFoundPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicOnlyRoute } from "./routes/PublicOnlyRoute";
import { RoleGate } from "./routes/RoleGate";

export const router = createBrowserRouter([
  { path: "/login", element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute> },
  { path: "/signup", element: <PublicOnlyRoute><SignupPage /></PublicOnlyRoute> },
  {
    path: "/",
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "assets", element: <ModulePlaceholderPage title="Assets" description="Search and track the organization’s physical assets." emptyTitle="Asset registry is coming in Phase 2" emptyDescription="Asset managers will register assets, inspect custody, and prevent double allocation here." icon={Boxes} /> },
      { path: "bookings", element: <ModulePlaceholderPage title="Bookings" description="Reserve shared resources without overlapping time slots." emptyTitle="Booking calendar is coming in Phase 3" emptyDescription="Employees will book rooms, vehicles, and shared equipment from this workspace." icon={BookOpen} /> },
      { path: "maintenance", element: <ModulePlaceholderPage title="Maintenance" description="Raise, approve, and resolve asset maintenance requests." emptyTitle="Maintenance workflow is coming in Phase 3" emptyDescription="Approved requests will move assets into maintenance and keep repair progress visible." icon={Wrench} /> },
      { path: "audits", element: <ModulePlaceholderPage title="Audits" description="Verify assets through assigned, structured audit cycles." emptyTitle="Audit cycles are coming in Phase 4" emptyDescription="Auditors will verify asset condition and report discrepancies from this workspace." icon={ClipboardCheck} /> },
      { path: "reports", element: <ModulePlaceholderPage title="Reports" description="Review allocation, utilization, maintenance, and booking patterns." emptyTitle="Operational reports are coming in Phase 4" emptyDescription="Authorized roles will see scoped metrics and downloadable reports here." icon={BarChart3} /> },
      {
        path: "org-setup",
        element: <RoleGate roles={["ADMIN"]}><OrgSetupLayout /></RoleGate>,
        children: [
          { index: true, element: <Navigate to="departments" replace /> },
          { path: "departments", element: <DepartmentsPage /> },
          { path: "categories", element: <CategoriesPage /> },
          { path: "employees", element: <EmployeesPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
