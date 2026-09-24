# 📚 FortiSim & PAN-Sim: Comprehensive Networking & Security Glossary

Welcome to the creator's educational reference guide for **FortiSim** and **PAN-Sim**. This document breaks down every physical component, networking protocol, security abbreviation, and vendor-specific concept featured in your project.

---

## 🔌 1. Physical Hardware & Layer 1 Concepts

### **RJ-45 (Registered Jack 45)**
* **What it is:** The standard 8-pin Ethernet connector used on copper network cables (UTP/STP).
* **Where it's used in your project:** The physical ports (`ethernet1/1` through `ethernet1/8` or `port1`-`port8`) on the 3D PA-220 chassis and FortiGate panel.
* **Speed:** Typically supports 10/100/1000 Mbps (1 Gbps Ethernet).

### **SFP / SFP+ (Small Form-factor Pluggable)**
* **What it is:** Modular transceiver slots used for high-speed fiber-optic or copper connections.
* **Difference:** **SFP** supports up to 1 Gbps; **SFP+** supports up to 10 Gbps.

### **MGT (Management Port)**
* **What it is:** A dedicated, isolated physical port used exclusively for Out-of-Band (OOB) administration.
* **Why it matters:** Management traffic (SSH, Web GUI, API) is separated from production user data traffic so network floods don't lock administrators out.

### **HA1 / HA2 (High Availability Ports)**
* **What it is:** Dedicated ports linking two firewalls together in an Active/Passive or Active/Active cluster.
* **HA1 (Control Link):** Synchronizes configuration files, heartbeats, and user sessions.
* **HA2 (Data Link):** Synchronizes state tables (so active connections don't drop if one firewall fails).

---

## 🌐 2. Network Architecture & Segmentation (Layers 2 & 3)

### **LAN (Local Area Network)**
* **What it is:** The internal private network (e.g., corporate laptops, office printers, internal servers).
* **Security Zone:** Trusted (**Trust**).

### **WAN (Wide Area Network)**
* **What it is:** The public, untrusted network (the Internet or external provider link).
* **Security Zone:** Untrusted (**Untrust**).

### **DMZ (Demilitarized Zone)**
* **What it is:** A semi-trusted perimeter network buffer zone hosting publicly accessible servers (e.g., Web servers, Mail servers).
* **Why it's used:** If a public web server in the DMZ gets hacked, the firewall prevents the attacker from pivoting into the sensitive internal **LAN**.

### **VLAN (Virtual Local Area Network)**
* **What it is:** A logical breakdown of a physical switch into isolated virtual networks at Layer 2.
* **Example:** Accounting (VLAN 10) and Engineering (VLAN 20) sharing the same physical switch without being able to talk to each other without a firewall.

### **CIDR (Classless Inter-Domain Routing)**
* **What it is:** IP address notation showing the network prefix length (e.g., `192.168.1.0/24`).
* **`/24`** = `255.255.255.0` (256 IP addresses, 254 usable hosts).
* **`/32`** = `255.255.255.255` (A single specific host IP).
* **`/0`** = `0.0.0.0/0` (Any IP address / Default route).

---

## 🔀 3. Routing & Traffic Flow

### **Default Route (`0.0.0.0/0`)**
* **What it is:** The fallback route used by a router/firewall when it doesn't have a specific destination route in its routing table. Points out to the Internet Gateway.

### **OSPF (Open Shortest Path First)**
* **What it is:** A dynamic interior gateway routing protocol (IGP) that automatically discovers network paths using Dijkstra's algorithm.

### **SD-WAN (Software-Defined Wide Area Network)**
* **What it is:** Automated traffic routing across multiple Internet connections (e.g., ISP 1 + ISP 2) based on real-time performance (latency, jitter, packet loss).

---

## 🛡️ 4. Firewall & Security Concepts (Layers 4 & 7)

### **NGFW (Next-Generation Firewall)**
* **What it is:** A modern firewall that inspects traffic beyond IP addresses and port numbers (Layer 3/4), delving deep into application payloads (Layer 7 App-ID, Antivirus, IPS).

### **NAT (Network Address Translation)**
* **What it is:** Rewriting IP addresses as packets pass through the firewall.
* **SNAT (Source NAT):** Translates private internal IP (`10.0.0.5`) to public WAN IP (`203.0.113.1`) so devices can browse the web.
* **DNAT (Destination NAT / Port Forwarding):** Translates incoming public traffic (`203.0.113.1:80`) to an internal DMZ web server (`192.168.2.10:80`).

### **App-ID (Application Identification)**
* **What it is:** Palo Alto Networks' signature-based inspection technology that identifies exact applications regardless of port, encryption, or evasion tactics (e.g., detecting BitTorrent even if it runs over port 80).

### **AV (Antivirus)**
* **What it is:** Scanning file downloads (HTTP, FTP, SMTP) in real time for known malware signatures (e.g., EICAR test virus).

### **IPS / IDS (Intrusion Prevention / Detection System)**
* **What it is:** Inspecting packet contents for exploit payloads, buffer overflows, and CVE vulnerabilities (e.g., Log4j exploits).
* **IDS:** Only alerts; **IPS:** Actively drops the malicious traffic.

### **SSL / TLS Decryption (Deep Packet Inspection)**
* **What it is:** Man-in-the-Middle (MitM) inspection where the firewall decrypts HTTPS traffic to inspect it for viruses and threats before re-encrypting it and sending it to the destination.

---

## ⚔️ 5. Palo Alto (PAN-OS) vs. Fortinet (FortiOS) Terminology

| Concept | Palo Alto (PAN-OS) | Fortinet (FortiOS) |
| :--- | :--- | :--- |
| **Security Architecture** | **Zone-Based** (Rules apply between source/destination Zones) | **Interface/Zone-Based** (Rules apply between interfaces/zones) |
| **Application Filtering** | **App-ID** natively built into every security rule | **Application Control Profile** attached to security policy |
| **NAT Rule Processing** | **Separate NAT Policy Table**, evaluated *after* security rules | **Inline SNAT Checkbox** or Central NAT table |
| **Default Rule Policy** | Intra-zone **ALLOW**, Inter-zone **DENY** | Implicit **DENY ALL** |
