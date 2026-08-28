import re

with open('packages/frontend/src/pages/pan/PanDashboard.tsx', 'r') as f:
    content = f.read()

# We need to add the import
import_stmt = 'import { PanChassisDiagram, PanPortAssignment } from "../../components/policyObjects/PanChassisDiagram";\n'
if 'PanChassisDiagram' not in content:
    content = content.replace('import { usePanSession }', import_stmt + 'import { usePanSession }')

# Find the Front Panel section
start_marker = '<div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 14 }}>PA-220 — Front Panel</div>'
end_marker = '        {/* PAN-OS vs FortiOS comparison */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_section = """        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 14 }}>PA-220 — 3D Hardware View</div>
        <div style={{ background: "#0d1117", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
          <PanChassisDiagram 
            ports={[
              { id: "ethernet1/1", zone: "Untrust", label: "eth1/1" },
              { id: "ethernet1/2", zone: "Untrust", label: "eth1/2" },
              { id: "ethernet1/3", zone: "Untrust", label: "eth1/3" },
              { id: "ethernet1/4", zone: "Untrust", label: "eth1/4" },
              { id: "ethernet1/5", zone: "Trust", label: "eth1/5" },
              { id: "ethernet1/6", zone: "Trust", label: "eth1/6" },
              { id: "ethernet1/7", zone: "Trust", label: "eth1/7" },
              { id: "ethernet1/8", zone: "Trust", label: "eth1/8" },
              { id: "management",  zone: "Management", label: "MGT" }
            ] as PanPortAssignment[]} 
            onChange={() => {}} 
          />
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#64748b", marginBottom: 24, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed" }} /> Management/HA</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} /> Untrust (E1/1-4)</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} /> Trust (E1/5-8)</div>
        </div>

"""
    content = content[:start_idx] + new_section + content[end_idx:]

with open('packages/frontend/src/pages/pan/PanDashboard.tsx', 'w') as f:
    f.write(content)
print("Updated dashboard!")
