import { expect, it } from 'vitest';
import { gradeInterfaceSubmission } from '../src/interfaces/interfaceGrader';
import type { InterfaceScenario, InterfaceSubmission } from '../src/interfaces/interfaceTypes';

it('accepts every contiguous dotted IPv4 mask and slash prefix', () => {
  for (let prefix = 0; prefix <= 32; prefix++) {
    const bits = '1'.repeat(prefix) + '0'.repeat(32 - prefix);
    const mask = [0, 8, 16, 24].map(offset => parseInt(bits.slice(offset, offset + 8), 2)).join('.');
    const scenario = { id: 'test', checks: [{ interfaceName: 'port1', field: 'subnet', expectedValue: String(prefix), description: 'mask' }] } as InterfaceScenario;
    for (const subnet of [mask, `/${prefix}`]) {
      const submission = { scenarioId: 'test', interfaces: [{ name: 'port1', subnet }] } as InterfaceSubmission;
      expect(gradeInterfaceSubmission(scenario, submission).overallPassed).toBe(true);
    }
  }
});
