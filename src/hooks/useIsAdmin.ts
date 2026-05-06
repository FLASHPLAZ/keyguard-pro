import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { role } = useAuth();
  return role === "admin";
}