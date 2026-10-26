import { useLearningAccess } from "./course/useLearningAccess";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { AccountProvider, useAccount } from "./hooks/useAccount";
import { AccountPage } from "./pages/AccountPage";
import { ClassroomPage } from "./pages/ClassroomPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CourseShell }       from "./components/shell/CourseShell";
import { CourseCatalogProvider, useCourseCatalog } from "./course/CourseCatalog";
const LearningPage = lazy(() => import("./pages/course/LearningPage").then(module => ({ default: module.LearningPage })));
const CreditsPage = lazy(() => import("./pages/CreditsPage").then(module => ({ default: module.CreditsPage })));
const AdminPage = lazy(() => import("./pages/admin/AdminPage").then(module => ({ default: module.AdminPage })));
const AuthoredLessonPage = lazy(() => import("./pages/course/AuthoredLessonPage").then(module => ({ default: module.AuthoredLessonPage })));
import { CourseOverviewPage, ModulePage } from "./pages/course/CoursePages";
import { VendorSelect }      from "./pages/VendorSelect";
const FortiGateHardwarePage = lazy(() => import("./pages/fortigate/FortiGateHardwarePage").then(module => ({ default: module.FortiGateHardwarePage })));
const FirewallPolicyPage = lazy(() => import("./pages/fortigate/FirewallPolicyPage").then(module => ({ default: module.FirewallPolicyPage })));
const AddressesPage = lazy(() => import("./pages/fortigate/AddressesPage").then(module => ({ default: module.AddressesPage })));
const ServicesPage = lazy(() => import("./pages/fortigate/ServicesPage").then(module => ({ default: module.ServicesPage })));
const InterfacesPage = lazy(() => import("./pages/fortigate/InterfacesPage").then(module => ({ default: module.InterfacesPage })));
const RoutingPage = lazy(() => import("./pages/fortigate/RoutingPage").then(module => ({ default: module.RoutingPage })));
const PanHardwarePage = lazy(() => import("./pages/pan/PanHardwarePage").then(module => ({ default: module.PanHardwarePage })));
const PanSecurityPolicy = lazy(() => import("./pages/pan/PanSecurityPolicy").then(module => ({ default: module.PanSecurityPolicy })));
const PanZones = lazy(() => import("./pages/pan/PanZones").then(module => ({ default: module.PanZones })));
const PanAppID = lazy(() => import("./pages/pan/PanAppID").then(module => ({ default: module.PanAppID })));
const PanNAT = lazy(() => import("./pages/pan/PanNAT").then(module => ({ default: module.PanNAT })));
const PanInterfaces = lazy(() => import("./pages/pan/PanInterfaces").then(module => ({ default: module.PanInterfaces })));
const PanPortAssignment = lazy(() => import("./pages/pan/PanPortAssignment").then(module => ({ default: module.PanPortAssignment })));
import { useScenarioSession }    from "./hooks/useScenarioSession";
import { usePanSession }         from "./hooks/usePanSession";

const CertificatesPage = lazy(() => import("./pages/CertificatesPage").then(module => ({ default: module.CertificatesPage })));

function TrainingAccess({ children }: { children: ReactNode }) {
  const { loading, authRequired, user, integration, error } = useAccount();
  if (loading) return <p className="p-8 text-muted" role="status">Checking lab access…</p>;
  if (error && !integration) return <p className="p-8 text-danger" role="alert">Could not load lab settings. Reload to retry: {error}</p>;
  if (integration?.mode === "academy" && !user) return <div className="min-h-screen bg-canvas p-8 text-body"><h1 className="text-2xl font-semibold">Open this lab from Academy</h1><p className="mt-3">{error || "Your Academy login is required. Return to Academy and open the firewall lab."}</p><a className="btn-primary mt-5" href={integration.parentUrl ?? "/"} target="_top">Return to Academy</a></div>;
  if (authRequired && !user) return <Navigate to="/account" replace />;
  return <>{integration?.ephemeralDemo && <p role="status" className="bg-warning-soft px-4 py-2 text-sm text-body">Temporary demo: server data may reset. Use this deployment for demonstrations only.</p>}{children}</>;
}

function LearningAccess() {
  const { canView, loading } = useLearningAccess();
  if (loading) return <p role="status" className="text-muted">Checking learning guide availability…</p>;
  if (!canView) return <section><h1 className="text-2xl font-semibold text-ink">Learning guide unavailable</h1><p className="mt-3 text-sm text-muted">Your administrator has not opened the learning guide to students.</p></section>;
  return <LearningPage />;
}

function ProgressWarning({ error }: { error: string | null }) {
  return error ? <p className="lab-sync-warning" role="status">Progress saving failed: {error} Reopen the lab to retry.</p> : null;
}

function FortiGateApp() {
  const session = useScenarioSession();
  const course = useCourseCatalog().courses.fortigate;
  return (
    <CourseShell course={course} completed={session.completedTaskIds}>
      <ProgressWarning error={session.syncError} />
      <Routes>
        <Route path="/"                       element={<CourseOverviewPage course={course} completed={session.completedTaskIds} />} />
        <Route path="/learn" element={<LearningAccess />} />
        <Route path="/modules/:moduleId"      element={<ModulePage course={course} completed={session.completedTaskIds} />} />
        <Route path="/lessons/:lessonId" element={<AuthoredLessonPage complete={session.markTaskComplete} />} />
        <Route path="/hardware"               element={<FortiGateHardwarePage session={session} />} />
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
  const course = useCourseCatalog().courses.paloalto;
  return (
    <CourseShell course={course} completed={session.completedTaskIds}>
      <ProgressWarning error={session.syncError} />
      <Routes>
        <Route path="/"                  element={<CourseOverviewPage course={course} completed={session.completedTaskIds} />} />
        <Route path="/learn" element={<LearningAccess />} />
        <Route path="/modules/:moduleId" element={<ModulePage course={course} completed={session.completedTaskIds} />} />
        <Route path="/lessons/:lessonId" element={<AuthoredLessonPage complete={session.markTaskComplete} />} />
        <Route path="/hardware"          element={<PanHardwarePage session={session} />} />
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
      <AccountProvider><CourseCatalogProvider><ErrorBoundary><Suspense fallback={<p className="p-8 text-muted" role="status">Loading…</p>}>
      <Routes>
        <Route path="/"            element={<VendorSelect />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/certificates" element={<CertificatesPage />} />
        <Route path="/credits" element={<CreditsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/classroom" element={<ClassroomPage />} />
        <Route path="/fortigate/*" element={<TrainingAccess><FortiGateApp /></TrainingAccess>} />
        <Route path="/paloalto/*"  element={<TrainingAccess><PaloAltoApp /></TrainingAccess>} />
        <Route path="/tasks/*"     element={<Navigate to="/fortigate" replace />} />
        <Route path="/policy/*"    element={<Navigate to="/fortigate/policy/firewall-policy" replace />} />
        <Route path="/network/*"   element={<Navigate to="/fortigate/modules/interface" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense></ErrorBoundary></CourseCatalogProvider></AccountProvider>
    </BrowserRouter>
  );
}
