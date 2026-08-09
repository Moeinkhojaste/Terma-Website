import { apiRequest, resetAntiforgeryToken } from "@/lib/api-client";

export type AdminSession = {
  email: string;
  role: string | null;
  expiresAtUtc: string;
};

export async function loginAdmin(email: string, password: string) {
  const session = await apiRequest<AdminSession>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  resetAntiforgeryToken();
  return session;
}

export function getAdminSession() {
  return apiRequest<AdminSession>("/api/auth/me", { cache: "no-store" });
}

export async function logoutAdmin() {
  await apiRequest<void>("/api/auth/logout", { method: "POST", cache: "no-store" });
  resetAntiforgeryToken();
}
