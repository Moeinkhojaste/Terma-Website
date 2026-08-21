"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api-client";
import { getAdminSession, logoutAdmin, type AdminSession } from "@/features/admin/auth-api";

const links = [
  ["/admin", "داشبورد"],
  ["/admin/products", "محصولات"],
  ["/admin/categories", "دسته‌بندی‌ها"],
  ["/admin/orders", "سفارش‌ها"],
  ["/admin/customers", "مشتریان"],
  ["/admin/reviews", "نظرات و امتیازها"],
  ["/admin/promotions", "تخفیف‌ها"],
  ["/admin/shipping", "ارسال"],
  ["/admin/content", "محتوای سایت"],
  ["/admin/messages", "پیام‌ها"],
  ["/admin/reports", "گزارش‌ها"],
  ["/admin/settings", "تنظیمات"],
] as const;

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AdminSession>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then((value) => active && setSession(value))
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401)
          router.replace("/admin/login?reason=expired");
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    await logoutAdmin();
    router.replace("/admin/login");
    router.refresh();
  }

  if (!session)
    return (
      <main className="admin-loading" role="status">
        در حال بررسی نشست مدیر…
      </main>
    );

  return (
    <div className="admin-app" dir="rtl">
      <a className="skip-link" href="#admin-main">
        رفتن به محتوای اصلی
      </a>
      <button
        className="admin-mobile-toggle"
        type="button"
        aria-label={open ? "بستن منو" : "باز کردن منوی مدیریت"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            stroke="currentColor"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            stroke="currentColor"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        )}
      </button>
      {open && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`admin-sidebar${open ? " admin-sidebar--open" : ""}`}>
        <div className="admin-brand">
          <span className="admin-brand-mark">ت</span>
          <div>
            <strong>مدیریت ترما</strong>
            <small>فروشگاه ترمه ایرانی</small>
          </div>
        </div>
        <nav aria-label="منوی مدیریت" className="admin-nav">
          {links.map(([href, label]) => (
            <Link
              key={href}
              className={
                pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`))
                  ? "admin-nav__link admin-nav__link--active"
                  : "admin-nav__link"
              }
              href={href}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <span dir="ltr">{session.email}</span>
          <button type="button" onClick={logout}>
            خروج
          </button>
        </div>
      </aside>
      <main id="admin-main" className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="section-eyebrow">پنل مدیریت</p>
            <h1>{title}</h1>
          </div>
          <Link className="button button--secondary admin-store-link" href="/">
            مشاهده فروشگاه
          </Link>
        </header>
        {children}
      </main>
    </div>
  );
}
