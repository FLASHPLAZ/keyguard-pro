import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

interface MobileNavProps {
  children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm text-foreground shadow-lg md:hidden transition-all duration-200 hover:border-primary/30 active:scale-95"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay + Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          open ? "visible" : "invisible"
        }`}
      >
        <div
          className={`absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 w-60 transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      </div>
    </>
  );
}
