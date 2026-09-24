# 📖 FortiSim & PAN-Sim: Comprehensive Master Learning Guide

Welcome to the ultimate learning manual for **FortiSim** (Fortinet FortiOS) and **PAN-Sim** (Palo Alto PAN-OS). This comprehensive guide explains every single module, task, button, parameter, acronym, and underlying networking/security concept built into this application.

---

# 📑 TABLE OF CONTENTS
1. [Module 1: Fundamental Concepts & Acronyms](#module-1-fundamental-concepts--acronyms)
2. [Module 2: Palo Alto Networks (PAN-OS) Deep Dive](#module-2-palo-alto-networks-pan-os-deep-dive)
   - [2.1 Physical Port Assignment & 3D Chassis](#21-physical-port-assignment--3d-chassis)
   - [2.2 Security Zones & Interfaces](#22-security-zones--interfaces)
   - [2.3 Security Policy Engine](#23-security-policy-engine)
   - [2.4 NAT (Network Address Translation) Policy](#24-nat-network-address-translation-policy)
   - [2.5 App-ID & Application Control](#25-app-id--application-control)
3. [Module 3: Fortinet (FortiOS) Deep Dive](#module-3-fortinet-fortios-deep-dive)
   - [3.1 Interface Configuration & Administrative Access](#31-interface-configuration--administrative-access)
   - [3.2 Firewall Addresses & Services](#32-firewall-addresses--services)
   - [3.3 Firewall Policies & Inspection Modes](#33-firewall-policies--inspection-modes)
   - [3.4 Static Routing & SD-WAN](#34-static-routing--sd-wan)
   - [3.5 Security Profiles (AV, IPS, SSL Decryption)](#35-security-profiles-av-ips-ssl-decryption)
4. [Module 4: Grader & Engine Mechanics](#module-4-grader--engine-mechanics)

---

# Module 1: Fundamental Concepts & Acronyms

### **Networking Essentials**
* **IP (Internet Protocol):** The unique numerical address assigned to every device on a network (e.g., `192.168.1.100` for IPv4).
* **MAC Address (Media Access Control):** The permanent physical hardware address baked into a network card (e.g., `00:1A:2B:3C:4D:5E`).
* **Subnet / Netmask:** Defines which part of an IP address represents the network vs. the host device. 
  * `255.255.255.0` (`/24` CIDR) allows 254 host devices.
* **Gateway / Default Gateway:** The IP address of the firewall/router that devices use to leave their local network and reach the Internet.
* **Port Number:** A numerical identifier (0–65535) used by transport protocols (TCP/UDP) to distinguish different network services.
  * `80`: HTTP (Unencrypted Web)
  * `443`: HTTPS (Encrypted Web)
  * `22`: SSH (Secure Remote Shell)
  * `53`: DNS (Domain Name System resolution)
  * `3389`: RDP (Remote Desktop Protocol)

### **Firewall & Security Acronyms**
* **NGFW (Next-Generation Firewall):** A modern firewall that inspects traffic at Layer 7 (Application layer), analyzing actual content rather than just IP addresses and port numbers.
* **DMZ (Demilitarized Zone):** A perimeter network segment isolated between the private internal network (LAN) and the public Internet (WAN). Public Web and Mail servers sit here.
* **NAT (Network Address Translation):**
  * **SNAT (Source NAT):** Replaces private source IPs with a public IP so LAN devices can access the Internet.
  * **DNAT (Destination NAT / Port Forwarding):** Replaces public destination IPs with private IPs so Internet users can reach a DMZ server.
  * **PAT (Port Address Translation):** Allows thousands of LAN devices to share a single public IP address by assigning unique source ports.
* **IPS (Intrusion Prevention System):** Scans active network streams for known hacker exploits, buffer overflows, and malicious payloads, dropping the attack automatically.
* **AV (Antivirus):** Scans file transfers in real-time for malware signatures (viruses, trojans, ransomware).
* **SSL/TLS Decryption:** Man-in-the-Middle inspection where the firewall decrypts HTTPS traffic, scans it for threats, and re-encrypts it before forwarding.

---

# Module 2: Palo Alto Networks (PAN-OS) Deep Dive

## 2.1 Physical Port Assignment & 3D Chassis
* **Hardware Model:** Simulated **PA-220** desktop firewall.
* **Ports Explained:**
  * **`MGT` (Management):** Out-of-band management port for administrative web/SSH access.
  * **`HA1` / `HA2`:** High Availability control and data synchronization links.
  * **`ethernet1/1` to `ethernet1/4`:** Commonly configured for external/untrusted links (**Untrust**).
  * **`ethernet1/5` to `ethernet1/8`:** Commonly configured for internal/trusted links (**Trust**).
* **LED Statuses:**
  * **Off / Black:** Unassigned / Link Down.
  * **Green:** Assigned to `Trust` zone.
  * **Red:** Assigned to `Untrust` zone.
  * **Orange:** Assigned to `DMZ` zone.
  * **Purple:** Assigned to `Management` zone.

## 2.2 Security Zones & Interfaces
* **Interface Types in PAN-OS:**
  * **Layer 3 (L3):** Performs routing, has an IP address assigned, and connects different IP networks.
  * **Layer 2 (L2):** Performs switching without routing.
  * **Virtual Wire (V-Wire):** Binds two ports together in transparent inline mode without needing IP addresses.
  * **Tap:** Receives mirrored traffic from a switch monitor port for passive monitoring.
* **Security Zones:**
  * In PAN-OS, **all interfaces must belong to a Security Zone**.
  * Traffic cannot flow between interfaces unless a Security Policy allows traffic between their respective zones.

## 2.3 Security Policy Engine
* **Rule Syntax:**
  `Name | Source Zone | Source IP | Destination Zone | Destination IP | Application | Service | Action`
* **Core PAN-OS Principles:**
  1. **Top-Down First Match:** Rules are evaluated from top to bottom. The first rule that matches the traffic criteria is executed.
  2. **Implicit Intra-Zone Allow:** Traffic *within the same zone* (e.g., `Trust` to `Trust`) is allowed by default.
  3. **Implicit Inter-Zone Deny:** Traffic *between different zones* (e.g., `Untrust` to `Trust`) is denied by default unless an explicit rule exists.
  4. **Post-NAT IP Matching:** In PAN-OS, security rules use **Pre-NAT Zones** but **Post-NAT IP addresses** for destination matching.

## 2.4 NAT (Network Address Translation) Policy
* **Source NAT Types:**
  * **Dynamic IP and Port (DIP/PAT):** Hides internal host IPs behind a single public IP.
  * **Static IP:** Maps one private IP directly to one public IP (1:1 mapping).
* **Destination NAT (Port Forwarding):**
  * Original Destination IP: Public IP address on the WAN interface.
  * Translated Destination IP: Private IP of the DMZ web server.

## 2.5 App-ID & Application Control
* **What makes App-ID unique:** Traditional firewalls filter by port numbers (e.g., Port 80 = Web). Malicious applications (like BitTorrent) bypass this by running over Port 80.
* **App-ID Inspects Signatures:** PAN-OS identifies the application regardless of what port it uses.
* **Scenario Tasks:**
  * **Web Browsing:** Requires both `web-browsing` (HTTP) and `ssl` (HTTPS) App-IDs.
  * **Office 365:** Requires `office365` App-ID.
  * **Evasive Protocols:** Block `bittorrent` and `unknown-tcp` to minimize attack surface.

---

# Module 3: Fortinet (FortiOS) Deep Dive

## 3.1 Interface Configuration & Administrative Access
* **Interface Roles:** `LAN`, `WAN`, `DMZ`, `Undefined`.
* **Administrative Access Flags:** Controls how admins can log into the firewall through that interface:
  * **`HTTPS`:** Web GUI access (Port 443).
  * **`SSH`:** Secure command-line access (Port 22).
  * **`PING`:** ICMP echo test for connectivity diagnostics.
  * **`FMG-Access`:** FortiManager centralized management portal connection.

## 3.2 Firewall Addresses & Services
* **Address Objects:**
  * **IP/Netmask:** e.g., `10.0.1.0/24` (Subnet) or `10.0.1.50/32` (Single Host).
  * **IP Range:** e.g., `192.168.1.10 - 192.168.1.50`.
  * **FQDN:** Fully Qualified Domain Name (e.g., `api.github.com`).
* **Service Objects:** Defines TCP/UDP protocols and destination port ranges (e.g., `HTTP` = TCP 80, `HTTPS` = TCP 443).

## 3.3 Firewall Policies & Inspection Modes
* **Policy Parameters:**
  `Name | Incoming Interface | Outgoing Interface | Source | Destination | Service | Action | NAT`
* **Inspection Modes:**
  * **Flow-Based:** Fast, packet-by-packet inspection using hardware acceleration (NP7/CP9 chips).
  * **Proxy-Based:** Deep, full-stream buffering and reconstruction for complex web filtering and SSL inspection.

## 3.4 Static Routing & SD-WAN
* **Static Route Fields:**
  * **Destination IP/Mask:** `0.0.0.0/0` for Default Internet Route.
  * **Gateway:** Next-hop IP address of the ISP router.
  * **Distance (Administrative Distance):** Lower value = higher route priority (e.g., Distance 10 preferred over Distance 20).
  * **Priority:** Used to break ties between routes with equal Distance.
* **SD-WAN (Software-Defined WAN):**
  * Bundles multiple physical WAN links (`wan1`, `wan2`) into a single virtual interface.
  * **Performance SLA / Health Check:** Sends PING/HTTP probes to target servers (`8.8.8.8`) to measure latency and loss.

## 3.5 Security Profiles (AV, IPS, SSL Decryption)
* **Antivirus (AV):** Blocks virus signatures during HTTP/FTP file downloads.
* **Intrusion Prevention (IPS):** Detects and drops network exploit signatures.
* **SSL Inspection:** Certificate inspection vs Deep SSL Inspection.

---

# Module 4: Grader & Engine Mechanics

* **Location:** `@fortisim/engine` (`packages/engine`).
* **Evaluation Pipeline:**
  1. Frontend captures user configuration state.
  2. Sent via REST API to Express backend controller (`packages/backend/src/controllers/submissionController.ts`).
  3. Engine evaluators run deterministic checks:
     * `evaluateRoutingConfiguration()`
     * `evaluateSecurityProfiles()`
     * `interfaceGrader()`
     * `portGrader()`
  4. If grading fails, backend invokes **NVIDIA NIM AI Service** (`nimFeedback.ts`) to provide personalized, step-by-step tutoring hints based on the failed checks.
