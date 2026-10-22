import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { AccountProvider, useAccount } from "./hooks/useAccount";
import { AccountPage } from "./pages/AccountPage";
import { ClassroomPage } from "./pages/ClassroomPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CourseShell }       from "./components/shell/CourseShell";
import { FORTIGATE_COURSE, PALOALTO_COURSE } from "./course/curriculum";
import { CourseOverviewPage, ModulePage } from "./pages/course/CoursePages";
import { VendorSelect }      from "./pages/VendorSelect";
const DashboardPlaceholder = lazy(() => import("./pages/DashboardPlaceholder").then(module => ({ default: module.DashboardPlaceholder })));
const FirewallPolicyPage = lazy(() => import("./pages/FirewallPolicyPage").then(module => ({ default: module.FirewallPolicyPage })));
const AddressesPage = lazy(() => import("./pages/AddressesPage").then(module => ({ default: module.AddressesPage })));
const ServicesPage = lazy(() => import("./pages/ServicesPage").then(module => ({ default: module.ServicesPage })));
const InterfacesPage = lazy(() => import("./pages/InterfacesPage").then(module => ({ default: module.InterfacesPage })));
const RoutingPage = lazy(() => import("./pages/RoutingPage").then(module => ({ default: module.RoutingPage })));
const PanDashboard = lazy(() => import("./pages/pan/PanDashboard").then(module => ({ default: module.PanDashboard })));
const PanSecurityPolicy = lazy(() => import("./pages/pan/PanSecurityPolicy").then(module => ({ default: module.PanSecurityPolicy })));
const PanZones = lazy(() => import("./pages/pan/PanZones").then(module => ({ default: module.PanZones })));
const PanAppID = lazy(() => import("./pages/pan/PanAppID").then(module => ({ default: module.PanAppID })));
const PanNAT = lazy(() => import("./pages/pan/PanNAT").then(module => ({ default: module.PanNAT })));
const PanInterfaces = lazy(() => import("./pages/pan/PanInterfaces").then(module => ({ default: module.PanInterfaces })));
const PanPortAssignment = lazy(() => import("./pages/pan/PanPortAssignment").then(module => ({ default: module.PanPortAssignment })));
import { useScenarioSession }    from "./hooks/useScenarioSession";
import { usePanSession }         from "./hooks/usePanSession";

function TrainingAccess({ children }: { children: ReactNode }) {
  const { loading, authRequired, user } = useAccount();
  if (loading) return <p className="p-8 text-muted" role="status">Checking lab access…</p>;
  if (authRequired && !user) return <Navigate to="/account" replace />;
  return <>{children}</>;
}

function ProgressWarning({ error }: { error: string | null }) {
  return error ? <p className="lab-sync-warning" role="status">Progress is kept on this device, but cloud saving failed: {error} Reopen the lab to retry.</p> : null;
}

function FortiGateApp() {
  const session = useScenarioSession();
  const course = FORTIGATE_COURSE;
  return (
    <CourseShell course={course} completed={session.completedTaskIds}>
      <ProgressWarning error={session.syncError} />
      <Routes>
        <Route path="/"                       element={<CourseOverviewPage course={course} completed={session.completedTaskIds} />} />
        <Route path="/modules/:moduleId"      element={<ModulePage course={course} completed={session.completedTaskIds} />} />
        <Route path="/hardware"               element={<DashboardPlaceholder session={session} />} />
        <Route path="/policy/firewall-policy" element={<FirewallPolicyPage session={session} />} />
        <Route path="/policy/addresses"       element={<AddressesPage session={session} />} />
        <Route path="/policy/services"        element={<ServicesPage session={session} />} />
        <Route path="/network/interfaces"     element={<InterfacesPage session={session} />} />
        <Route path="/network/routing"        element={<RoutingPage session={session} />} />
        {/* Earlier URLs */}
        <Route path="/tasks"                  element={<Navigate to="/fortigate" replace />} />
        <Route path="/tasks/:track"           element={<LegacyTrackRedirect base="/fortigate" map={{ policy: "policy", interface: "interface", port: "port" }} />} />
        <Route path="/network"                element={<Navigate to="/fortigate/modules/interface" replace />} />
        <Route path="*" element={<Navigate to="/fortigate" replace />} />
      </Routes>
    </CourseShell>
  );
}

function PaloAltoApp() {
  const session = usePanSession();
  const course = PALOALTO_COURSE;
  return (
    <CourseShell course={course} completed={session.completedTaskIds}>
      <ProgressWarning error={session.syncError} />
      <Routes>
        <Route path="/"                  element={<CourseOverviewPage course={course} completed={session.completedTaskIds} />} />
        <Route path="/modules/:moduleId" element={<ModulePage course={course} completed={session.completedTaskIds} />} />
        <Route path="/hardware"          element={<PanDashboard session={session} />} />
        <Route path="/security"          element={<PanSecurityPolicy session={session} />} />
        <Route path="/zones"             element={<PanZones session={session} />} />
        <Route path="/appid"             element={<PanAppID />} />
        <Route path="/nat"               element={<PanNAT session={session} />} />
        <Route path="/interfaces"        element={<PanInterfaces session={session} />} />
        <Route path="/port"              element={<PanPortAssignment session={session} />} />
        {/* Earlier URLs */}
        <Route path="/tasks"             element={<Navigate to="/paloalto" replace />} />
        <Route path="/tasks/:track"      element={<LegacyTrackRedirect base="/paloalto" map={{ security: "security", zones: "zones", nat: "nat" }} />} />
        <Route path="*" element={<Navigate to="/paloalto" replace />} />
      </Routes>
    </CourseShell>
  );
}

function LegacyTrackRedirect({ base, map }: { base: string; map: Record<string, string> }) {
  const { track = "" } = useParams();
  return <Navigate to={map[track] ? `${base}/modules/${map[track]}` : base} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AccountProvider><ErrorBoundary><Suspense fallback={<p className="p-8 text-muted" role="status">Loading…</p>}>
      <Routes>
        <Route path="/"            element={<VendorSelect />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/classroom" element={<ClassroomPage />} />
        <Route path="/fortigate/*" element={<TrainingAccess><FortiGateApp /></TrainingAccess>} />
        <Route path="/paloalto/*"  element={<TrainingAccess><PaloAltoApp /></TrainingAccess>} />
        <Route path="/tasks/*"     element={<Navigate to="/fortigate" replace />} />
        <Route path="/policy/*"    element={<Navigate to="/fortigate/policy/firewall-policy" replace />} />
        <Route path="/network/*"   element={<Navigate to="/fortigate/modules/interface" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense></ErrorBoundary></AccountProvider>
    </BrowserRouter>
  );
}
