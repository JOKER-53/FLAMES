import { describe, it, expect } from 'vitest';
import { evaluateSecurityProfiles, SecurityProfile } from './securityProfileEvaluator';

describe('evaluateSecurityProfiles', () => {
  it('should fail if no profiles are configured', () => {
    const res = evaluateSecurityProfiles([], ['av'], 'block');
    expect(res.success).toBe(false);
  });

  it('should pass if correct profiles are configured', () => {
    const profiles: SecurityProfile[] = [
      { id: "1", type: 'av', action: 'block' },
      { id: "2", type: 'ips', action: 'block' }
    ];
    const res = evaluateSecurityProfiles(profiles, ['av', 'ips'], 'block');
    expect(res.success).toBe(true);
  });
});
