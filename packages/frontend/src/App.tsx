import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/shell/AppShell";
import { PanAppShell } from "./components/panShell/PanAppShell";
import { VendorSelect } from "./pages/VendorSelect";
import { DashboardPlaceholder } from "./pages/DashboardPlaceholder";
import { TasksOverviewPage } from "./pages/TasksOverviewPage";
import { TrackTasksPage } from "./pages/TrackTasksPage";
import { FirewallPolicyPage } from "./pages/FirewallPolicyPage";
import { AddressesPage } from "./pages/AddressesPage";
import { ServicesPage } from "./pages/ServicesPage";
import { InterfacesPage } from "./pages/InterfacesPage";
import { PanDashboard } from "./pages/pan/PanDashboard";
import { PanSecurityPolicy } from "./pages/pan/PanSecurityPolicy";
import { useScenarioSession } from "./hooks/useScenarioSession";

function FortiGateApp() {
  const session = useScenarioSession();
  return (
    <AppShell>
      <Routes>
        <Route path="/"                     element={<DashboardPlaceholder session={session} />} />
        <Route path="/tasks"                element={<TasksOverviewPage session={session} />} />
        <Route path="/tasks/policy"         element={<TrackTasksPage session={session} track="policy" />} />
        <Route path="/tasks/interface"      element={<TrackTasksPage session={session} track="interface" />} />
        <Route path="/tasks/port"           element={<TrackTasksPage session={session} track="port" />} />
        <Route path="/policy/firewall-policy" element={<FirewallPolicyPage session={session} />} />
        <Route path="/policy/addresses"     element={<AddressesPage session={session} />} />
        <Route path="/policy/services"      element={<ServicesPage session={session} />} />
        <Route path="/network/interfaces"   element={<InterfacesPage session={session} />} />
      </Routes>
    </AppShell>
  );
}

function PaloAltoApp() {
  return (
    <PanAppShell>
      <Routes>
        <Route path="/"          element={<PanDashboard />} />
        <Route path="/security"  element={<PanSecurityPolicy />} />
        <Route path="/nat"       element={<div style={{color:"#64748b",padding:20}}>NAT Policy — Coming Soon</div>} />
        <Route path="/zones"     element={<div style={{color:"#64748b",padding:20}}>Zone Configuration — Coming Soon</div>} />
        <Route path="/interfaces" element={<div style={{color:"#64748b",padding:20}}>Interface Management — Coming Soon</div>} />
        <Route path="/appid"     element={<div style={{color:"#64748b",padding:20}}>App-ID Explorer — Coming Soon</div>} />
      </Routes>
    </PanAppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Vendor selection landing */}
        <Route path="/"             element={<VendorSelect />} />

        {/* FortiGate sim — all existing routes under /fortigate/* */}
        <Route path="/fortigate/*"  element={<FortiGateApp />} />

        {/* Palo Alto sim */}
        <Route path="/paloalto/*"   element={<PaloAltoApp />} />

        {/* Legacy redirect — old direct links still work */}
        <Route path="/tasks/*"      element={<Navigate to="/fortigate/tasks" replace />} />
        <Route path="/policy/*"     element={<Navigate to="/fortigate/policy" replace />} />
        <Route path="/network/*"    element={<Navigate to="/fortigate/network" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
