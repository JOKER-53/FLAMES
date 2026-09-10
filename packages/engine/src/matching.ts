// ============================================================================
// Low-level matching primitives: IP <-> integer, CIDR containment,
// IP range containment, port containment. No FortiGate-specific logic here,
// just correct network arithmetic.
// ============================================================================

export function ipToInt(ip: string): number {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) {
    throw new Error(`Invalid IPv4 address: "${ip}"`);
  }
  let result = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) {
      throw new Error(`Invalid IPv4 octet in "${ip}": "${part}"`);
    }
    result = result * 256 + n;
  }
  return result >>> 0;
}

export function parseCidr(cidr: string): { start: number; end: number } {
  const [ipPart, prefixPart] = cidr.split("/");
  if (!ipPart || prefixPart === undefined) {
    throw new Error(`Invalid CIDR notation: "${cidr}"`);
  }
  const prefix = Number(prefixPart);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid CIDR prefix length in "${cidr}"`);
  }
  const base = ipToInt(ipPart);
  const hostBits = 32 - prefix;
  const blockSize = hostBits === 32 ? 0x100000000 : 1 << hostBits;
  const mask = hostBits === 32 ? 0 : (~0 << hostBits) >>> 0;
  const network = (base & mask) >>> 0;
  const end = hostBits === 32 ? 0xffffffff : (network + blockSize - 1) >>> 0;
  return { start: network, end };
}

export function parseIpRange(range: string): { start: number; end: number } {
  const parts = range.split("-").map((s) => s.trim());
  if (parts.length !== 2) {
    throw new Error(`Invalid IP range notation: "${range}"`);
  }
  const start = ipToInt(parts[0]);
  const end = ipToInt(parts[1]);
  if (end < start) {
    throw new Error(`IP range end is before start in: "${range}"`);
  }
  return { start, end };
}

export function ipMatchesAddressValue(
  ip: string,
  type: "subnet" | "range",
  value: string
): boolean {
  if (value.trim().toLowerCase() === "all" || value.trim().toLowerCase() === "any") {
    return true;
  }
  const target = ipToInt(ip);
  const { start, end } = type === "subnet" ? parseCidr(value) : parseIpRange(value);
  return target >= start && target <= end;
}

export function portMatchesServiceValue(port: number, portSpec: string): boolean {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid packet port: "${port}"`);
  }
  if (portSpec.includes("-")) {
    const parts = portSpec.split("-").map((s) => s.trim());
    if (parts.length !== 2) throw new Error(`Invalid port range: "${portSpec}"`);
    const [startStr, endStr] = parts;
    const start = Number(startStr);
    const end = Number(endStr);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 65535 || start > end) {
      throw new Error(`Invalid port range: "${portSpec}"`);
    }
    return port >= start && port <= end;
  }
  const single = Number(portSpec.trim());
  if (!Number.isInteger(single) || single < 0 || single > 65535) {
    throw new Error(`Invalid port value: "${portSpec}"`);
  }
  return port === single;
}
