import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { AccountProvider, useAccount } from "./hooks/useAccount";
import { AccountPage } from "./pages/AccountPage";
import { ClassroomPage } from "./pages/ClassroomPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell }          from "./components/shell/AppShell";
import { PanAppShell }       from "./components/panShell/PanAppShell";
import { VendorSelect }      from "./pages/VendorSelect";
const DashboardPlaceholder = lazy(() => import("./pages/DashboardPlaceholder").then(module => ({ default: module.DashboardPlaceholder })));
const TasksOverviewPage = lazy(() => import("./pages/TasksOverviewPage").then(module => ({ default: module.TasksOverviewPage })));
const TrackTasksPage = lazy(() => import("./pages/TrackTasksPage").then(module => ({ default: module.TrackTasksPage })));
const FirewallPolicyPage = lazy(() => import("./pages/FirewallPolicyPage").then(module => ({ default: module.FirewallPolicyPage })));
const AddressesPage = lazy(() => import("./pages/AddressesPage").then(module => ({ default: module.AddressesPage })));
const ServicesPage = lazy(() => import("./pages/ServicesPage").then(module => ({ default: module.ServicesPage })));
const InterfacesPage = lazy(() => import("./pages/InterfacesPage").then(module => ({ default: module.InterfacesPage })));
const RoutingPage = lazy(() => import("./pages/RoutingPage").then(module => ({ default: module.RoutingPage })));
const PanDashboard = lazy(() => import("./pages/pan/PanDashboard").then(module => ({ default: module.PanDashboard })));
const PanTasksOverview = lazy(() => import("./pages/pan/PanTasksOverview").then(module => ({ default: module.PanTasksOverview })));
const PanTrackTasks = lazy(() => import("./pages/pan/PanTrackTasks").then(module => ({ default: module.PanTrackTasks })));
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
  if (loading) return <p className="p-5" role="status">Checking lab access…</p>;
  if (authRequired && !user) return <Navigate to="/account" replace />;
  return <>{children}</>;
}

function ProgressWarning({ error }: { error: string | null }) {
  return error ? <p className="lab-sync-warning" role="status">Progress is kept on this device, but cloud saving failed: {error} Reopen the lab to retry.</p> : null;
}

function FortiGateApp() {
  const session = useScenarioSession();
  return (
    <AppShell>
      <ProgressWarning error={session.syncError} />
      <Routes>
        <Route path="/"                       element={<DashboardPlaceholder session={session} />} />
        <Route path="/tasks"                  element={<TasksOverviewPage session={session} />} />
        <Route path="/tasks/policy"           element={<TrackTasksPage session={session} track="policy" />} />
        <Route path="/tasks/interface"        element={<TrackTasksPage session={session} track="interface" />} />
        <Route path="/tasks/port"             element={<TrackTasksPage session={session} track="port" />} />
        <Route path="/policy/firewall-policy" element={<FirewallPolicyPage session={session} />} />
        <Route path="/policy/addresses"       element={<AddressesPage session={session} />} />
        <Route path="/policy/services"        element={<ServicesPage session={session} />} />
        <Route path="/network"              element={<Navigate to="/fortigate/network/interfaces" replace />} />
        <Route path="/network/interfaces"     element={<InterfacesPage session={session} />} />
        <Route path="/network/routing"        element={<RoutingPage session={session} />} />
        <Route path="*" element={<Navigate to="/fortigate" replace />} />
      </Routes>
    </AppShell>
  );
}

function PaloAltoApp() {
  const session = usePanSession();
  return (
    <PanAppShell>
      <ProgressWarning error={session.syncError} />
      <Routes>
        <Route path="/"                  element={<PanDashboard session={session} />} />
        <Route path="/tasks"             element={<PanTasksOverview session={session} />} />
        <Route path="/tasks/security"    element={<PanTrackTasks session={session} track="security" />} />
        <Route path="/tasks/zones"       element={<PanTrackTasks session={session} track="zones" />} />
        <Route path="/tasks/nat"         element={<PanTrackTasks session={session} track="nat" />} />
        <Route path="/security"          element={<PanSecurityPolicy session={session} />} />
        <Route path="/zones"             element={<PanZones session={session} />} />
        <Route path="/appid"             element={<PanAppID />} />
        <Route path="/nat"               element={<PanNAT session={session} />} />
        <Route path="/interfaces"        element={<PanInterfaces session={session} />} />
        <Route path="/port"              element={<PanPortAssignment session={session} />} />
        <Route path="*" element={<Navigate to="/paloalto" replace />} />
      </Routes>
    </PanAppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AccountProvider><ErrorBoundary><Suspense fallback={<p className="p-5" role="status">Loading lab…</p>}>
      <Routes>
        <Route path="/"            element={<VendorSelect />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/classroom" element={<ClassroomPage />} />
        <Route path="/fortigate/*" element={<TrainingAccess><FortiGateApp /></TrainingAccess>} />
        <Route path="/paloalto/*"  element={<TrainingAccess><PaloAltoApp /></TrainingAccess>} />
        <Route path="/tasks/*"     element={<Navigate to="/fortigate/tasks" replace />} />
        <Route path="/policy/*"    element={<Navigate to="/fortigate/policy/firewall-policy" replace />} />
        <Route path="/network/*"   element={<Navigate to="/fortigate/network" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense></ErrorBoundary></AccountProvider>
    </BrowserRouter>
  );
}
