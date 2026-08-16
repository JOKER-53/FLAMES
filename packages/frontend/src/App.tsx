import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell }      from "./components/shell/AppShell";
import { PanAppShell }   from "./components/panShell/PanAppShell";
import { VendorSelect }  from "./pages/VendorSelect";
import { DashboardPlaceholder } from "./pages/DashboardPlaceholder";
import { TasksOverviewPage }    from "./pages/TasksOverviewPage";
import { TrackTasksPage }       from "./pages/TrackTasksPage";
import { FirewallPolicyPage }   from "./pages/FirewallPolicyPage";
import { AddressesPage }        from "./pages/AddressesPage";
import { ServicesPage }         from "./pages/ServicesPage";
import { InterfacesPage }       from "./pages/InterfacesPage";
import { PanDashboard }         from "./pages/pan/PanDashboard";
import { PanSecurityPolicy }    from "./pages/pan/PanSecurityPolicy";
import { PanZones }             from "./pages/pan/PanZones";
import { PanAppID }             from "./pages/pan/PanAppID";
import { PanNAT }               from "./pages/pan/PanNAT";
import { PanInterfaces }        from "./pages/pan/PanInterfaces";
import { useScenarioSession }   from "./hooks/useScenarioSession";

function FortiGateApp() {
  const session = useScenarioSession();
  return (
    <AppShell>
      <Routes>
        <Route path="/"                       element={<DashboardPlaceholder session={session} />} />
        <Route path="/tasks"                  element={<TasksOverviewPage session={session} />} />
        <Route path="/tasks/policy"           element={<TrackTasksPage session={session} track="policy" />} />
        <Route path="/tasks/interface"        element={<TrackTasksPage session={session} track="interface" />} />
        <Route path="/tasks/port"             element={<TrackTasksPage session={session} track="port" />} />
        <Route path="/policy/firewall-policy" element={<FirewallPolicyPage session={session} />} />
        <Route path="/policy/addresses"       element={<AddressesPage session={session} />} />
        <Route path="/policy/services"        element={<ServicesPage session={session} />} />
        <Route path="/network/interfaces"     element={<InterfacesPage session={session} />} />
      </Routes>
    </AppShell>
  );
}

function PaloAltoApp() {
  return (
    <PanAppShell>
      <Routes>
        <Route path="/"            element={<PanDashboard />} />
        <Route path="/security"    element={<PanSecurityPolicy />} />
        <Route path="/zones"       element={<PanZones />} />
        <Route path="/appid"       element={<PanAppID />} />
        <Route path="/nat"         element={<PanNAT />} />
        <Route path="/interfaces"  element={<PanInterfaces />} />
      </Routes>
    </PanAppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<VendorSelect />} />
        <Route path="/fortigate/*" element={<FortiGateApp />} />
        <Route path="/paloalto/*"  element={<PaloAltoApp />} />
        {/* Legacy redirects */}
        <Route path="/tasks/*"     element={<Navigate to="/fortigate/tasks" replace />} />
        <Route path="/policy/*"    element={<Navigate to="/fortigate/policy" replace />} />
        <Route path="/network/*"   element={<Navigate to="/fortigate/network" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
