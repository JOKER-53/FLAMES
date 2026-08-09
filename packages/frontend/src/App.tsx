import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/shell/AppShell";
import { DashboardPlaceholder } from "./pages/DashboardPlaceholder";
import { TasksOverviewPage } from "./pages/TasksOverviewPage";
import { TrackTasksPage } from "./pages/TrackTasksPage";
import { FirewallPolicyPage } from "./pages/FirewallPolicyPage";
import { AddressesPage } from "./pages/AddressesPage";
import { ServicesPage } from "./pages/ServicesPage";
import { InterfacesPage } from "./pages/InterfacesPage";
import { useScenarioSession } from "./hooks/useScenarioSession";

export default function App() {
  const session = useScenarioSession();

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPlaceholder session={session} />} />
          <Route path="/tasks" element={<TasksOverviewPage session={session} />} />
          <Route path="/tasks/policy" element={<TrackTasksPage session={session} track="policy" />} />
          <Route path="/tasks/interface" element={<TrackTasksPage session={session} track="interface" />} />
          <Route path="/tasks/port" element={<TrackTasksPage session={session} track="port" />} />
          <Route path="/policy/firewall-policy" element={<FirewallPolicyPage session={session} />} />
          <Route path="/policy/addresses" element={<AddressesPage session={session} />} />
          <Route path="/policy/services" element={<ServicesPage session={session} />} />
          <Route path="/network/interfaces" element={<InterfacesPage session={session} />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
