import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import type { PlatformStore, User } from "./store";

const derive = promisify(scrypt);
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, encoded] = stored.split(":");
  if (!salt || !encoded) return false;
  const expected = Buffer.from(encoded, "hex");
  const actual = await derive(password, salt, 64) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const COOKIE = "fortisim_session";
export function sessionToken(req: Request): string {
  const cookie = req.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`));
  return cookie?.slice(COOKIE.length + 1) ?? "";
}
export function requestUser(req: Request, store: PlatformStore): User | undefined {
  return store.session(sessionToken(req));
}
export function startSession(res: Response, store: PlatformStore, user: User) {
  const token = randomBytes(32).toString("hex");
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  store.createSession(user.id, token, Date.now() + maxAge);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
}
export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}
