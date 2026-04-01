import { randomUUID } from "node:crypto";
import type { DebateSessionState } from "../engine/orchestrator.js";
import { ValidationError } from "../types/errors.js";

const sessions = new Map<string, DebateSessionState>();

export function createDebateSession(state: DebateSessionState): string {
  const sessionId = randomUUID();
  sessions.set(sessionId, state);
  return sessionId;
}

export function getDebateSession(sessionId: string): DebateSessionState {
  const state = sessions.get(sessionId);
  if (!state) {
    throw new ValidationError(
      `unknown sessionId '${sessionId}'. Start with debate_start to create a new debate session.`
    );
  }
  return state;
}

export function setDebateSession(sessionId: string, state: DebateSessionState): void {
  sessions.set(sessionId, state);
}

export function deleteDebateSession(sessionId: string): void {
  sessions.delete(sessionId);
}
