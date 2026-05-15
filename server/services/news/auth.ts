import { crypto } from "@std/crypto";

// Simple in-memory maps for challenges and sessions.
// For scaled production, replace with Redis or database table.
export const authChallenges = new Map<string, { nonce: string; expires: number }>();
export const authSessions = new Map<string, { address: string; expires: number }>();

const CHALLENGE_TTL = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateChallenge(address: string): string {
  const nonce = crypto.randomUUID();
  authChallenges.set(address, {
    nonce,
    expires: Date.now() + CHALLENGE_TTL,
  });
  return nonce;
}

export function getChallenge(address: string): string | null {
  const challenge = authChallenges.get(address);
  if (!challenge) return null;
  if (Date.now() > challenge.expires) {
    authChallenges.delete(address);
    return null;
  }
  return challenge.nonce;
}

export function clearChallenge(address: string): void {
    authChallenges.delete(address);
}

export function createSession(address: string): string {
  const sessionId = crypto.randomUUID();
  authSessions.set(sessionId, {
    address,
    expires: Date.now() + SESSION_TTL,
  });
  return sessionId;
}

export function verifySession(sessionId: string): string | null {
  const session = authSessions.get(sessionId);
  if (!session) return null;
  if (Date.now() > session.expires) {
    authSessions.delete(sessionId);
    return null;
  }
  return session.address;
}

export function destroySession(sessionId: string): void {
  authSessions.delete(sessionId);
}
