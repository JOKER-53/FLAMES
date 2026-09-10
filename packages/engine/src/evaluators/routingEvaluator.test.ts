import { describe, it, expect } from 'vitest';
import { evaluateRoutingConfiguration } from './routingEvaluator';

describe('evaluateRoutingConfiguration', () => {
  it('should fail if no routing configuration is provided', () => {
    const result = evaluateRoutingConfiguration(null as any, {});
    expect(result.success).toBe(false);
    expect(result.message).toBe("No routing configuration provided.");
  });

  it('should pass with dummy configuration', () => {
    const result = evaluateRoutingConfiguration(
      { staticRoutes: [], sdwanMembers: [], sdwanRules: [] },
      {}
    );
    expect(result.success).toBe(true);
    expect(result.message).toBe("Routing configuration passes.");
  });

  it('should reject a missing required static route', () => {
    const result = evaluateRoutingConfiguration(
      { staticRoutes: [], sdwanMembers: [], sdwanRules: [] },
      { staticRoutes: [{ id: 'expected', destination: '0.0.0.0/0', gateway: '192.168.1.254', interfaceName: 'port1', distance: 10 }] }
    );
    expect(result.success).toBe(false);
  });
});
