# Student configuration and instructor topology tools

## Configuration comparison

Open **Compare configuration** beside the draft status. It compares your current configuration with the configuration loaded when you entered this task. After saving, **Use current configuration as snapshot** captures a new comparison baseline. Changes, additions, removals and row ordering are shown as plain text; long comparisons stop after 200 changes.

Snapshots exist only for the current visit and account/task/version scope. They are not teacher reference solutions, saved revision history, or an undo/apply command. Opening another account or task does not reveal the previous configuration. The panel is closed initially.

## FortiGate interface CLI practice

The native FortiGate interface exercise and instructor-authored `interfaces` lessons include **CLI practice (FortiGate interfaces)**. Supported examples:

```text
config system interface
edit wan1
set ip 192.0.2.2 255.255.255.0
set role wan
set allowaccess ping https ssh
next
end
```

`help` lists the subset; `show` displays the student's current configuration. `unset allowaccess` clears management methods. `abort` discards the whole staged block. Only existing interface names are accepted. Invalid, unknown, oversized or incomplete blocks apply no changes. Changes use normal draft autosave; grading remains a separate action. This never invokes a shell, remote device, arbitrary code or actual network command. It is not a complete FortiOS/PAN-OS terminal.

## Visual exercise topology

In **Admin**, expand **Visual exercise topology** inside a lesson. Add host/firewall/network nodes, labels, zones and addresses. Add named connections using the endpoint selectors. Optional bindings reference identifiers in the public starter configuration. Validate, preview, then publish through the normal private-draft/versioned publishing flow.

Deleting a node removes its connections. Publishing rejects duplicate IDs, dangling links, invalid bindings, more than 20 nodes or more than 40 connections. Diagrams use declarative data and plain text; there are no arbitrary HTML/script/URL renderers. Students receive only the public topology, never the private reference configuration or grading expectations. The diagram offers text details for keyboard/screen-reader access and contained scrolling on narrow displays.

Topologies describe the instructor's teaching network. They do not infer cabling or change the simulator's packet/routing semantics. Native task topology panels remain available independently. Export/import preserves the topology while minting new module/lesson identities.
