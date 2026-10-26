import { ContentStore } from "./content/store";
import dotenv from "dotenv";
dotenv.config();
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "./app";
import { PlatformStore } from "./platform/store";
import { hashPassword, verifyPassword } from "./platform/auth";

export async function createRuntimeApp() {
  const databasePath = process.env.DATABASE_PATH || resolve(process.env.VERCEL ? tmpdir() : ".", process.env.VERCEL ? "flames-demo/fortisim.sqlite" : "data/fortisim.sqlite");
  const academy = process.env.PLATFORM_MODE === "academy";
  const store = new PlatformStore(academy ? ":memory:" : databasePath);
  const content = new ContentStore(process.env.CONTENT_DATABASE_PATH || resolve(dirname(databasePath), "content.sqlite"));
  const email = academy ? undefined : process.env.INSTRUCTOR_EMAIL?.trim().toLowerCase();
  const password = academy ? undefined : process.env.INSTRUCTOR_PASSWORD;
  if (email && password) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INSTRUCTOR_EMAIL must be a valid email address.");
    if (password.length < 12 || password.length > 128) throw new Error("INSTRUCTOR_PASSWORD must contain 12–128 characters.");
    const existing = store.findEmail(email);
    if (existing && existing.user.role !== "instructor") throw new Error("The bootstrap instructor email belongs to a student. Use a different email.");
    if (!existing) store.createUser(email, "Instructor", await hashPassword(password), "instructor");
  } else if (email || password) {
    throw new Error("Set both INSTRUCTOR_EMAIL and INSTRUCTOR_PASSWORD, or neither.");
  }
  if (!academy && process.env.NODE_ENV === "production") {
    for (const hash of store.instructorPasswords()) {
      if (await verifyPassword("admin123", hash)) throw new Error("The checking-only administrator password must be rotated before production. Run admin:create -- --reset-password in a maintenance terminal.");
    }
  }
  const app = createApp(store, content);
  app.locals.closeStores = () => { store.close(); content.close(); };
  return app;
}

async function main() {
  const app = await createRuntimeApp();
  const server = app.listen(Number(process.env.PORT) || 4000, () => console.log("FLAMES API ready"));
  const shutdown = () => {
    server.close(() => { app.locals.closeStores(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exit(1); });
