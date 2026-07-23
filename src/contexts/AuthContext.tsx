import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

type UserRole = "admin" | "reseller" | "manager" | "seller" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  const ensureProfile = async () => {
    const { error } = await (supabase as any).rpc("ensure_user_bootstrap");
    if (error) {
      console.error("Failed to bootstrap user profile", error);
    }
  };

  const fetchRole = async (userId: string) => {
    // Check ban status first so banned users get signed out immediately.
    const { data: profile } = await supabase
      .from("profiles")
      .select("banned, banned_reason")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.banned) {
      toast.error(`Account banned: ${profile.banned_reason || "Contact support"}`);
      await supabase.auth.signOut();
      setRole(null);
      return;
    }
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("Failed to load user role", error);
      setRole(null);
      return;
    }
    setRole((data?.role as UserRole) || null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Defer to avoid Supabase client deadlock
          setTimeout(async () => {
            try {
              await ensureProfile();
              await fetchRole(session.user.id);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureProfile()
          .then(() => fetchRole(session.user.id))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
