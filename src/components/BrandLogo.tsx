import gxLogo from "@/assets/gxauth-logo.png";
import { cn } from "@/lib/utils";

export function BrandLogo({ size = "md", showText = true, className = "" }: { size?: "sm" | "md" | "lg"; showText?: boolean; className?: string }) {
  const imageSize = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const titleSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={gxLogo}
        alt="GX Auth"
        className={cn(imageSize, "shrink-0 rounded-lg object-cover shadow-lg shadow-primary/15")}
      />
      {showText && (
        <span className={cn("font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent", titleSize)}>
          GX Auth
        </span>
      )}
    </div>
  );
}
