import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { User } from "./models/User";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "replace-this-secret-for-production-change-me";

const EXPIRY = "7d";
const COOKIE_NAME = "auth-token";

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const signToken = async (payload: { userId: string; email: string }) => {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime(EXPIRY).sign(secret);
};

export const verifyToken = async (token: string) => {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jwtVerify<{ userId: string; email: string }>(token, secret);
  return payload;
};

export const setAuthCookie = async (token: string) => {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
};

export const clearAuthCookie = async () => {
  const store = await cookies();
  store.delete(COOKIE_NAME);
};

export const getSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return payload;
  } catch {
    return null;
  }
};

export const ensureDbAndUserModel = async () => {
  await getDb();
  return User;
};

export const getSessionFromHeaders = async () => {
  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie");
  if (!cookieHeader) return null;
  const token = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return payload;
  } catch {
    return null;
  }
};

export type SessionPayload = { userId: string; email: string } | null;
