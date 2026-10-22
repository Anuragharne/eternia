"use client";

import { AuthProvider } from "../../hooks/useAuth";

export function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
