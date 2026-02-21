// path: src/modules/audit/audit.service.ts

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AuditAction, AuditStatus } from "@prisma/client";

function maskEmail(email: string): string {
	const trimmed = String(email ?? "")
		.trim()
		.toLowerCase();
	const at = trimmed.indexOf("@");
	if (at <= 0) return "***";
	const local = trimmed.slice(0, at);
	const domain = trimmed.slice(at + 1);
	const keep = Math.min(2, local.length);
	return `${local.slice(0, keep)}***@${domain}`;
}

/**
 * Global audit dedupe (in-memory)
 * - Prevents accidental double-writes from layered calls (middleware + service, etc.)
 * - TTL should be short: we only want to squash immediate duplicates
 */
const auditDedupe = new Map<string, number>();

function shouldWriteAudit(dedupeKey: string, ttlMs: number): boolean {
	const now = Date.now();
	const exp = auditDedupe.get(dedupeKey);
	if (exp && exp > now) return false;
	auditDedupe.set(dedupeKey, now + ttlMs);
	return true;
}

export type AuditWriteInput = {
	action: AuditAction;
	status: AuditStatus;

	userId?: string | null;
	email?: string | null; // will be masked
	contextKey?: string | null;
	reason?: string | null;

	ip?: string | null;
	userAgent?: string | null;
	correlationId?: string | null;
};

/**
 * Write once per "event signature".
 * If correlationId exists, it becomes the primary idempotency anchor.
 * If not, we fall back to a stable hash of key attributes.
 */
async function writeAuditLogOnce(input: AuditWriteInput, ttlMs = 5_000): Promise<void> {
	const emailMasked = input.email ? maskEmail(input.email) : null;

	const stable = [
		input.action,
		input.status,
		input.correlationId ?? "",
		input.userId ?? "",
		input.contextKey ?? "",
		input.reason ?? "",
		emailMasked ?? "",
		input.ip ?? "",
	].join("|");

	const dedupeKey = crypto.createHash("sha256").update(stable).digest("hex");

	if (!shouldWriteAudit(dedupeKey, ttlMs)) return;

	try {
		await prisma.auditLog.create({
			data: {
				id: crypto.randomUUID(),
				action: input.action,
				status: input.status,
				userId: input.userId ?? null,
				contextKey: input.contextKey ?? null,
				reason: input.reason ?? null,
				correlationId: input.correlationId ?? null,
				emailMasked,
				ip: input.ip ?? null,
				userAgent: input.userAgent ?? null,
			},
		});
	} catch (err) {
		// Never block core flows if audit fails.
		// eslint-disable-next-line no-console
		console.warn("[AUDIT][WRITE_FAILED]", input.action, input.status, err);
	}
}

export async function writeAuditLog(input: AuditWriteInput): Promise<void> {
	// default to once-gate to prevent duplicates
	return writeAuditLogOnce(input, 5_000);
}

// Convenience wrappers (keeps call sites clean)
export async function auditAuthRegister(params: Omit<AuditWriteInput, "action">) {
	return writeAuditLog({ ...params, action: AuditAction.AUTH_REGISTER });
}

export async function auditAuthLogin(params: Omit<AuditWriteInput, "action">) {
	return writeAuditLog({ ...params, action: AuditAction.AUTH_LOGIN });
}

export async function auditAuthLogout(params: Omit<AuditWriteInput, "action">) {
	return writeAuditLog({ ...params, action: AuditAction.AUTH_LOGOUT });
}

export async function auditPasswordReset(params: Omit<AuditWriteInput, "action">) {
	return writeAuditLog({ ...params, action: AuditAction.PASSWORD_RESET });
}

export async function auditUserEmailChange(params: Omit<AuditWriteInput, "action">) {
	return writeAuditLog({ ...params, action: AuditAction.USER_EMAIL_CHANGE });
}

export async function auditBusinessCreate(params: Omit<AuditWriteInput, "action">) {
	return writeAuditLog({ ...params, action: AuditAction.BUSINESS_CREATE });
}

/**
 * IMPORTANT:
 * We intentionally DO NOT persist RATE_LIMIT to AuditLog.
 * Rate limiting is high-volume and will bloat the DB.
 *
 * If you want visibility, rely on requestLogger/console/observability instead.
 */
