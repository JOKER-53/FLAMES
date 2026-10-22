import fs from "fs";

try {
  fs.copyFileSync("/home/kadhir/Projects/fortisim/pa-220-firewall.glb", "/home/kadhir/Projects/fortisim/packages/frontend/public/pa-220-firewall.glb");
  console.log("SUCCESS: Copied pa-220-firewall.glb to packages/frontend/public/");
} catch (e) {
  console.error("ERROR copying file:", e);
}
