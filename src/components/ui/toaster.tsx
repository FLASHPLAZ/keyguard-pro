import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

function renderToastText(value: unknown, fallback: string) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (value instanceof Error && value.message) return value.message;
  if (typeof value === "object") {
    const error = value as { message?: unknown; error?: unknown; error_description?: unknown; details?: unknown };
    for (const item of [error.message, error.error_description, error.error, error.details]) {
      if (typeof item === "string" && item.trim()) return item;
    }
    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // Use fallback.
    }
  }
  return fallback;
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{renderToastText(title, "Something went wrong")}</ToastTitle>}
              {description && <ToastDescription>{renderToastText(description, "")}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
