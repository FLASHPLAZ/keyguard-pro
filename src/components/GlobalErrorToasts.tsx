import { useEffect } from "react";
import { toast } from "@/components/ui/sonner";

function getErrorMessage(value: unknown) {
  if (!value) return "Something went wrong. Please try again.";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || "Something went wrong. Please try again.";
  if (typeof value === "object") {
    const error = value as { message?: unknown; error?: unknown; details?: unknown };
    for (const item of [error.message, error.error, error.details]) {
      if (typeof item === "string" && item.trim()) return item;
    }
    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

export function GlobalErrorToasts() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      toast.error(getErrorMessage(event.reason));
    };
    const onError = (event: ErrorEvent) => {
      toast.error(getErrorMessage(event.error || event.message));
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
