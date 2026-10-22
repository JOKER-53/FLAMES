import dotenv from "dotenv";
dotenv.config();
import { resolve } from "node:path";
import { createApp } from "./app";
import { PlatformStore } from "./platform/store";
import { hashPassword } from "./platform/auth";

async function main() {
  const store = new PlatformStore(process.env.DATABASE_PATH || resolve("data/fortisim.sqlite"));
  const email = process.env.INSTRUCTOR_EMAIL?.trim().toLowerCase();
  const password = process.env.INSTRUCTOR_PASSWORD;
  if (email && password) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INSTRUCTOR_EMAIL must be a valid email address.");
    if (password.length < 12 || password.length > 128) throw new Error("INSTRUCTOR_PASSWORD must contain 12–128 characters.");
    const existing = store.findEmail(email);
    if (existing && existing.user.role !== "instructor") throw new Error("The bootstrap instructor email belongs to a student. Use a different email.");
    if (!existing) store.createUser(email, "Instructor", await hashPassword(password), "instructor");
  } else if (email || password) {
    throw new Error("Set both INSTRUCTOR_EMAIL and INSTRUCTOR_PASSWORD, or neither.");
  }
  const server = createApp(store).listen(Number(process.env.PORT) || 4000, () => console.log("FortiSim API ready"));
  const shutdown = () => {
    server.close(() => { store.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
main().catch(error => { console.error(error.message); process.exit(1); });
