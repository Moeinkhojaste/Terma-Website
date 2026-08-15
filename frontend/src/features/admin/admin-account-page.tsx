"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { AdminSession, getAdminSession, logoutAdmin } from "@/features/admin/auth-api";

export function AdminAccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then((result) => {
        if (active) setSession(result);
      })
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof ApiError && caught.status === 401) {
          router.replace("/admin/login?reason=expired");
          return;
        }
        setError("اطلاعات حساب دریافت نشد. لطفاً دوباره تلاش کنید.");
      });
    return () => { active = false; };
  }, [router]);

  async function handleLogout() {
    setPending(true);
    setError(undefined);
    try {
      await logoutAdmin();
      router.replace("/admin/login");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        router.replace("/admin/login?reason=expired");
      } else {
        setError("خروج از حساب انجام نشد. دوباره تلاش کنید.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-labelledby="admin-account-title">
        <p className="section-eyebrow">حساب مدیر</p>
        <h1 id="admin-account-title">مدیریت ترما</h1>

        {!session && !error && <p className="admin-auth-loading" role="status">در حال بررسی نشست…</p>}
        {error && <p className="admin-auth-message admin-auth-message--error" role="alert">{error}</p>}

        {session && (
          <dl className="admin-session-details">
            <div><dt>ایمیل</dt><dd dir="ltr">{session.email}</dd></div>
            <div><dt>نقش</dt><dd>{session.role === "Admin" ? "مدیر" : session.role}</dd></div>
            <div>
              <dt>پایان نشست</dt>
              <dd>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.expiresAtUtc))}</dd>
            </div>
          </dl>
        )}

        <div className="admin-account-actions">
          <button className="button button--primary" type="button" onClick={handleLogout} disabled={!session || pending}>
            {pending ? "در حال خروج…" : "خروج از حساب"}
          </button>
          <Link className="button button--secondary" href="/">بازگشت به فروشگاه</Link>
        </div>
      </section>
    </main>
  );
}
