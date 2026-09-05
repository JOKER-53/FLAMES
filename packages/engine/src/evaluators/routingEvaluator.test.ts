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
});
