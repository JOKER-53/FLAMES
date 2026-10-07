// Render-only checks: no browser automation, WebGL, or DOM effects are involved.
import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AccountProvider } from "../../frontend/src/hooks/useAccount";
import { AccountPage } from "../../frontend/src/pages/AccountPage";
import { ClassroomPage } from "../../frontend/src/pages/ClassroomPage";
import { PanNAT } from "../../frontend/src/pages/pan/PanNAT";
import { PanZones } from "../../frontend/src/pages/pan/PanZones";
import { PanSecurityPolicy } from "../../frontend/src/pages/pan/PanSecurityPolicy";
import { VendorSelect } from "../../frontend/src/pages/VendorSelect";

// Supports classic JSX transform used by the engine's test runner for imported TSX.
(globalThis as unknown as { React: typeof React }).React = React;
const session = { completedTaskIds: new Set<string>(), markTaskComplete: () => {}, syncError: null };
function render(page: React.ReactElement, path: string) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(AccountProvider, null, page)));
}
describe("frontend render smoke checks", () => {
  it("renders vendor selection and accessible sign-in fields", () => {
    expect(render(React.createElement(VendorSelect), "/")).toContain("Choose Your Platform");
    const account = render(React.createElement(AccountPage), "/account");
    expect(account).toContain('type="email"');
    expect(account).toContain('type="password"');
  });
  it("does not render an instructor roster for a guest", () => {
    const classroom = render(React.createElement(ClassroomPage), "/classroom");
    expect(classroom).not.toContain("classroom-table");
  });
  it("opens the requested NAT final instead of the first exercise", () => {
    expect(render(React.createElement(PanNAT, { session }), "/paloalto/nat?task=pan-nat-final")).toContain("Combine Trust");
  });
  it("opens the requested zone final", () => {
    expect(render(React.createElement(PanZones, { session }), "/paloalto/zones?task=pan-zone-final")).toContain("Every interface belongs to only one zone");
  });
  it("opens the requested security final", () => {
    expect(render(React.createElement(PanSecurityPolicy, { session }), "/paloalto/security?task=pan-sec-final")).toContain("Combine the outbound");
  });
});
