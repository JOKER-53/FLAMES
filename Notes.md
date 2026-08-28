# FortiSim Development Notes

## Current Sprint Focus
1. **Routing & SD-WAN**: Introducing static routing, OSPF, and basic SD-WAN link balancing to teach users that traffic must route before it can be allowed by policy.
2. **Security Profiles**: Upgrading the engine to process Antivirus, IPS, and SSL Inspection profiles instead of just Web Filtering.
3. **App-ID Interactivity**: Upgrading the `PanAppID` component from a static dictionary to an interactive, graded exercise.
4. **Interactive 3D Hardware Views**: Enhancing the `three.js` canvases to dynamically reflect link state, plugged cables, and adding a 3D Palo Alto Networks chassis (`pa220.glb` or similar).
5. **Testing Suite**: Integrating `vitest` for robust unit testing of the `@fortisim/engine` rule-matching logic.

## Refactoring Progress
- Refactoring Express backend to standard MVC-like architecture (`controllers/`, `routes/`, `services/`, `middlewares/`).
- Frontend static assets are being moved to `src/assets/`.
- UI/UX standardisation across Fortinet and Palo Alto interfaces.
