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

export type AdminPasswordResetResponse = {
  challengeId: string;
  expiresInSeconds: number;
  developmentCode?: string;
  message: string;
};

export type AdminPasswordResetConfirmResponse = {
  message: string;
};

export async function requestAdminPasswordReset(email: string): Promise<AdminPasswordResetResponse> {
  const result = await apiRequest<AdminPasswordResetResponse>("/api/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });
  resetAntiforgeryToken();
  return result;
}

export async function confirmAdminPasswordReset(
  challengeId: string,
  code: string,
  newPassword: string,
  confirmPassword?: string,
): Promise<AdminPasswordResetConfirmResponse> {
  const result = await apiRequest<AdminPasswordResetConfirmResponse>("/api/auth/password-reset/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeId,
      code,
      newPassword,
      confirmPassword: confirmPassword ?? newPassword,
    }),
    cache: "no-store",
  });
  resetAntiforgeryToken();
  return result;
}

