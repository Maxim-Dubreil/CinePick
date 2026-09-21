import { useContext } from "react";
import { ProfileContext, type ProfileContextValue } from "@/contexts/ProfileContext";

export type { UserProfile } from "@/contexts/ProfileContext";

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
