import { Menu, X } from "lucide-react";
import { useState } from "react";

interface MobileNavProps {
  children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div className="sidebar-overlay md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-60 md:hidden animate-slide-in">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <div onClick={() => setOpen(false)}>{children}</div>
          </div>
        </>
      )}
    </>
  );
}
