import { describe, it, expect } from 'vitest';
import { evaluateRoutingConfiguration } from '../src/evaluators/routingEvaluator';

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

const required = { id: 'required', destination: '0.0.0.0/0', gateway: '192.168.1.254', interfaceName: 'port1', distance: 10 };
const checkRoutes = (routes: typeof required[]) => evaluateRoutingConfiguration({ staticRoutes: routes, sdwanMembers: [], sdwanRules: [] }, { staticRoutes: [required] });
it('rejects a wrong preferred route and an equal-cost competing route', () => {
  for (const distance of [1, 10]) {
    expect(checkRoutes([required, { ...required, id: 'bad', gateway: '10.0.0.254', distance }]).success).toBe(false);
  }
});
it('allows a less preferred backup route and equivalent CIDR spelling', () => {
  expect(checkRoutes([{ ...required, destination: '192.0.2.1/0' }, { ...required, id: 'backup', gateway: '10.0.0.254', distance: 20 }]).success).toBe(true);
});
it('returns a failure for invalid routing inputs', () => {
  expect(checkRoutes([{ ...required, destination: 'invalid' }]).success).toBe(false);
  expect(checkRoutes([{ ...required, gateway: '999.0.0.1' }]).success).toBe(false);
});
