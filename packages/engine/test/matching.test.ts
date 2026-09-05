import { describe, it, expect } from 'vitest';
import { ipToInt, parseCidr, parseIpRange, ipMatchesAddressValue, portMatchesServiceValue } from "../src/matching";

describe('matching logic', () => {
  describe('ipToInt', () => {
    it('should correctly parse IP strings to integers', () => {
      expect(ipToInt("0.0.0.0")).toBe(0);
      expect(ipToInt("255.255.255.255")).toBe(0xffffffff);
      expect(ipToInt("10.0.1.5")).toBe(10 * 256 ** 3 + 0 * 256 ** 2 + 1 * 256 + 5);
    });
  });

  describe('parseCidr', () => {
    it('should parse CIDR boundaries correctly', () => {
      const p1 = parseCidr("10.0.2.0/24");
      expect(p1.start).toBe(ipToInt("10.0.2.0"));
      expect(p1.end).toBe(ipToInt("10.0.2.255"));

      const p2 = parseCidr("10.0.2.10/32");
      expect(p2.start).toBe(p2.end);
      expect(p2.start).toBe(ipToInt("10.0.2.10"));

      const p3 = parseCidr("0.0.0.0/0");
      expect(p3.start).toBe(0);
      expect(p3.end).toBe(0xffffffff);
    });
  });

  describe('parseIpRange', () => {
    it('should parse IP ranges correctly', () => {
      const { start, end } = parseIpRange("10.0.1.10-10.0.1.20");
      expect(start).toBe(ipToInt("10.0.1.10"));
      expect(end).toBe(ipToInt("10.0.1.20"));
    });
  });

  describe('ipMatchesAddressValue', () => {
    it('should correctly match IPs against subnets and ranges', () => {
      expect(ipMatchesAddressValue("10.0.2.10", "subnet", "10.0.2.0/24")).toBe(true);
      expect(ipMatchesAddressValue("10.0.3.10", "subnet", "10.0.2.0/24")).toBe(false);
      expect(ipMatchesAddressValue("10.0.2.255", "subnet", "10.0.2.0/24")).toBe(true);
      expect(ipMatchesAddressValue("10.0.3.0", "subnet", "10.0.2.0/24")).toBe(false);
      expect(ipMatchesAddressValue("203.0.113.50", "subnet", "all")).toBe(true);
      expect(ipMatchesAddressValue("10.0.1.15", "range", "10.0.1.10-10.0.1.20")).toBe(true);
      expect(ipMatchesAddressValue("10.0.1.21", "range", "10.0.1.10-10.0.1.20")).toBe(false);
    });
  });

  describe('portMatchesServiceValue', () => {
    it('should match ports exactly or by range', () => {
      expect(portMatchesServiceValue(443, "443")).toBe(true);
      expect(portMatchesServiceValue(80, "443")).toBe(false);
      expect(portMatchesServiceValue(8080, "1024-65535")).toBe(true);
      expect(portMatchesServiceValue(80, "1024-65535")).toBe(false);
    });
  });
});
