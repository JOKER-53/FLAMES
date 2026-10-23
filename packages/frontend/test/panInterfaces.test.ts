import { expect, it } from 'vitest';
import { gradePanInterfaces } from '../src/course/panInterfaceGrader';
const valid = [
  { id: 'ethernet1/1', type: 'layer3', zone: 'Untrust', ip: '203.0.113.1/30' },
  { id: 'ethernet1/2', type: 'layer3', zone: 'Trust', ip: '10.0.0.1/24' },
  { id: 'management', type: 'management', zone: '—', ip: '192.168.1.1/24' },
];
it('accepts the requested branch interface configuration', () => {
  expect(gradePanInterfaces(valid).every(check => check.pass)).toBe(true);
});
it('rejects a management port changed to a data-plane interface or security zone', () => {
  for (const change of [{ type: 'layer3' }, { zone: 'Trust' }]) {
    expect(gradePanInterfaces(valid.map(i => i.id === 'management' ? { ...i, ...change } : i)).every(check => check.pass)).toBe(false);
  }
});
