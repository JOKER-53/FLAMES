# Project review — 2026-10-01

Historical review. For the newer implementation and verification results, see [the 2026-10-02 upgrade report](UPGRADE_2026-10-02.md). Bundle and dependency observations below describe the earlier state.

## Confirmed defects corrected

- Frontend compilation: Three.js 0.128 runtime was paired with incompatible 0.185 types. Align the types with the runtime and run TypeScript before production builds.
- Missing Three.js type import in the legacy hardware page.
- Task list array inference widened track identifiers to arbitrary strings.
- PAN task action used invalid `fontShrink` instead of `flexShrink`.
- Network canvas resize callback lacked a null/parent guard.
- Network simulation startup timeout could fire after unmount; cancel it during cleanup.
- Hardware port click handler retained the initial empty connection state; read current connections from a ref so occupied ports can be unplugged.
- Hardware renderer did not track viewport size; update renderer and camera with ResizeObserver.
- Rebuilt cable meshes leaked geometry/material resources; dispose removed meshes.
- Scenario switches retained previous exercise objects during loading/failure; clear them when switching.
- Browser storage failures could break task completion; retain in-memory completion when persistence fails.
- Network matching accepted blank, hexadecimal, or exponent octets/ports, empty CIDR prefixes, and extra CIDR segments; validate decimal syntax and use exponentiation for CIDR block sizes.

## Verification and limits

Engine regression tests, frontend TypeScript plus production build, backend TypeScript, and diff whitespace checks pass. No Playwright was used.

This is a static and automated-check review, not exhaustive visual or end-to-end acceptance. Actual socket alignment and connector shapes still require visual confirmation. The production JavaScript bundle remains approximately 961 kB before compression. The package installation reported two moderate vulnerabilities; the offline audit cannot establish current advisory status. External AI feedback services were not exercised.
