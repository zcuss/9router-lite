import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./rbac";

const encoder = new TextEncoder();
const DEFAULT_SECRET = "dev-only-secret-change-me";

function getJwtSecret() {
  return encoder.encode(process.env.JWT_SECRET || DEFAULT_SECRET);
}

export type AuthUser = {
  id: string;
  username: string;
  role: Role;
  status?: string;
};

export async function signAuthToken(user: AuthUser) {
  return new SignJWT({
    sub: user.id,
    username: user.username,
    role: user.role,
    status: user.status || "approved",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return {
    id: String(payload.sub || ""),
    username: String(payload.username || ""),
    role: String(payload.role || "user") as Role,
    status: String(payload.status || "approved"),
  } satisfies AuthUser;
}
