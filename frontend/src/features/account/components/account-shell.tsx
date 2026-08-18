"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import {
  DashboardIcon,
  PackageIcon,
  MapPinIcon,
  HeartIcon,
  UserIcon,
  LogOutIcon,
  ShieldCheckIcon,
  XIcon,
} from "@/components/ui/icons";
import { getCustomerProfile, logoutCustomer, type CustomerProfile } from "../account-api";
import { ApiError } from "@/lib/api-client";

const navItems = [
  { href: "/account", label: "داشبورد", shortLabel: "داشبورد", icon: DashboardIcon, exact: true },
  { href: "/account/orders", label: "سفارش‌های من", shortLabel: "سفارش‌ها", icon: PackageIcon, exact: false },
  { href: "/account/addresses", label: "آدرس‌های من", shortLabel: "آدرس‌ها", icon: MapPinIcon, exact: false },
  { href: "/account/wishlist", label: "علاقه‌مندی‌ها", shortLabel: "علاقه‌مندی", icon: HeartIcon, exact: false },
  { href: "/account/profile", label: "اطلاعات حساب", shortLabel: "پروفایل", icon: UserIcon, exact: false },
];

type AccountShellProps = {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
};

export function AccountShell({ children, title, breadcrumbs }: AccountShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    getCustomerProfile()
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/account/login?returnUrl=${encodeURIComponent(pathname)}`);
        }
      })
      .finally(() => setLoading(false));
  }, [router, pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutCustomer();
      router.replace("/account/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
      setLogoutModalOpen(false);
    }
  }

  const userInitial = profile?.fullName
    ? profile.fullName.trim().charAt(0)
    : "ت";

  return (
    <>
      <Header />
      <main className="commerce-page account-layout-page">
        <Container>
          <nav className="breadcrumbs commerce-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link>
            <span>/</span>
            <Link href="/account">حساب کاربری</Link>
            {breadcrumbs?.map((bc, idx) => (
              <span key={idx}>
                <span>/</span>
                {bc.href ? <Link href={bc.href}>{bc.label}</Link> : <span>{bc.label}</span>}
              </span>
            ))}
          </nav>

          <div className="account-layout-grid">
            {/* Sidebar / Profile Card */}
            <aside className="account-sidebar">
              <div className="account-profile-card">
                <div className="account-avatar">
                  <span>{userInitial}</span>
                </div>
                <div className="account-profile-info">
                  <h2 className="account-profile-name">
                    {profile?.fullName || (loading ? "در حال بارگذاری…" : "کاربر گرامی")}
                  </h2>
                  {profile && (
                    <div className="account-phone-badge">
                      <ShieldCheckIcon className="size-4 text-emerald-600" />
                      <span dir="ltr">{profile.phone}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(true)}
                  className="account-profile-logout-btn"
                  title="خروج از حساب کاربری"
                  aria-label="خروج از حساب کاربری"
                >
                  <LogOutIcon className="size-4" />
                  <span className="account-profile-logout-text">خروج</span>
                </button>
              </div>

              {/* Navigation Menu */}
              <div className="account-nav-scroll-wrapper">
                <nav className="account-nav" aria-label="منوی حساب کاربری">
                  {navItems.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`account-nav-item ${isActive ? "account-nav-item--active" : ""}`}
                      >
                        <Icon className="account-nav-icon" />
                        <span className="account-nav-label-desktop">{item.label}</span>
                        <span className="account-nav-label-mobile">{item.shortLabel}</span>
                      </Link>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setLogoutModalOpen(true)}
                    className="account-nav-item account-nav-item--logout"
                  >
                    <LogOutIcon className="account-nav-icon" />
                    <span>خروج از حساب</span>
                  </button>
                </nav>
              </div>
            </aside>

            {/* Main Account Content Area */}
            <section className="account-content">
              {title && (
                <div className="account-content-header">
                  <h1>{title}</h1>
                </div>
              )}
              {children}
            </section>
          </div>
        </Container>
      </main>

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className="account-modal-card">
            <div className="account-modal-header account-modal-header--danger">
              <div className="account-modal-title-wrap">
                <div className="account-modal-icon-badge account-modal-icon-badge--danger">
                  <LogOutIcon className="size-5" />
                </div>
                <h3 id="logout-title">خروج از حساب کاربری</h3>
              </div>
              <button
                type="button"
                className="account-modal-close"
                onClick={() => setLogoutModalOpen(false)}
                aria-label="بستن"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <p className="account-modal-description">
              آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟ برای دسترسی دوباره به سوابق سفارش‌ها و آدرس‌ها، باید مجدداً با شماره موبایل خود وارد شوید.
            </p>
            <div className="account-modal-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setLogoutModalOpen(false)}
                disabled={loggingOut}
              >
                انصراف
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "در حال خروج…" : "بله، خروج از حساب"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
