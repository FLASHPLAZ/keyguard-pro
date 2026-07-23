import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import { createElement } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function toastText(value: unknown, fallback: string) {
  if (!value) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
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
      // Leave it to the fallback below.
    }
  }
  return fallback;
}

const toast = Object.assign(sonnerToast, {
  error: (message: unknown, data?: Parameters<typeof sonnerToast.error>[1]) =>
    sonnerToast.error(toastText(message, "Something went wrong. Please try again."), data),
  success: (message: unknown, data?: Parameters<typeof sonnerToast.success>[1]) =>
    sonnerToast.success(toastText(message, "Done."), data),
  warning: (message: unknown, data?: Parameters<typeof sonnerToast.warning>[1]) =>
    sonnerToast.warning(toastText(message, "Please check this and try again."), data),
  info: (message: unknown, data?: Parameters<typeof sonnerToast.info>[1]) =>
    sonnerToast.info(toastText(message, "Heads up."), data),
});

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border/60 group-[.toaster]:shadow-xl group-[.toaster]:shadow-background/30 group-[.toaster]:backdrop-blur-md group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:text-xs group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          closeButton: "group-[.toast]:bg-secondary group-[.toast]:border-border group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground",
          success: "group-[.toaster]:!border-emerald-500/20 group-[.toaster]:!bg-emerald-950/40",
          error: "group-[.toaster]:!border-red-500/20 group-[.toaster]:!bg-red-950/40",
          warning: "group-[.toaster]:!border-amber-500/20 group-[.toaster]:!bg-amber-950/40",
          info: "group-[.toaster]:!border-blue-500/20 group-[.toaster]:!bg-blue-950/40",
        },
      }}
      icons={{
        success: createElement(CheckCircle, { className: "h-4 w-4 text-emerald-400" }),
        error: createElement(XCircle, { className: "h-4 w-4 text-red-400" }),
        warning: createElement(AlertTriangle, { className: "h-4 w-4 text-amber-400" }),
        info: createElement(Info, { className: "h-4 w-4 text-blue-400" }),
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
