// path: src/modules/inventory/inventory.errors.ts

export type InventoryDomainErrorCode =
  | "UNAUTHORIZED"
  | "ACTIVE_BUSINESS_REQUIRED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "NO_NEGATIVE_STOCK"
  | "RATE_LIMITED"
  | "UNKNOWN";

export class InventoryDomainError extends Error {
  code: InventoryDomainErrorCode;
  details?: unknown;

  constructor(code: InventoryDomainErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "InventoryDomainError";
    this.code = code;
    this.details = details;
  }
}

// Map backend failures into a stable front-end domain error.
export function toInventoryDomainError(err: unknown): InventoryDomainError {
  const anyErr = err as any;
  const status = anyErr?.response?.status as number | undefined;
  const payload = anyErr?.response?.data;

  const codeFromPayload = (payload?.code || payload?.error?.code || payload?.data?.code) as string | undefined;
  const details = payload?.data ?? payload?.error?.data ?? payload;

  const isStockError =
    codeFromPayload === "NO_NEGATIVE_STOCK" ||
    codeFromPayload === "INSUFFICIENT_STOCK" ||
    codeFromPayload === "OUT_OF_STOCK";

  if (status === 401) return new InventoryDomainError("UNAUTHORIZED", "Please sign in again.");
  if (status === 403 && codeFromPayload === "ACTIVE_BUSINESS_REQUIRED")
    return new InventoryDomainError("ACTIVE_BUSINESS_REQUIRED", "Please finish business setup first.", details);

  if (status === 404) return new InventoryDomainError("NOT_FOUND", "Item not found.", details);

  if (status === 429) return new InventoryDomainError("RATE_LIMITED", "Too many requests. Try again shortly.", details);

  if (isStockError || status === 409) {
    return new InventoryDomainError("NO_NEGATIVE_STOCK", "Not enough stock for that adjustment.", details);
  }

  if (status === 400) {
    return new InventoryDomainError("VALIDATION_ERROR", "Please check your input.", details);
  }

  const msg = typeof payload?.message === "string" ? payload.message : "Something went wrong.";
  return new InventoryDomainError("UNKNOWN", msg, details ?? anyErr);
}

export function mapInventoryErrorToMessage(err: InventoryDomainError): string {
  switch (err.code) {
    case "UNAUTHORIZED":
      return "Your session expired. Please sign in again.";
    case "ACTIVE_BUSINESS_REQUIRED":
      return "You need an active business to use Inventory.";
    case "NOT_FOUND":
      return "This product no longer exists.";
    case "NO_NEGATIVE_STOCK": {
      const detail = err.details as any;
      const onHand = typeof detail?.onHandCached === "number" ? detail.onHandCached : detail?.data?.onHandCached;
      if (typeof onHand === "number" && Number.isFinite(onHand)) {
        return `Only ${onHand} on hand. Reduce the quantity and try again.`;
      }
      return "That would result in negative stock. Adjust the quantity and try again.";
    }
    case "RATE_LIMITED":
      return "You are doing that too quickly. Try again in a bit.";
    case "VALIDATION_ERROR":
      return "Some fields look invalid. Please review and try again.";
    default:
      return "Unexpected error. Please try again.";
  }
}
