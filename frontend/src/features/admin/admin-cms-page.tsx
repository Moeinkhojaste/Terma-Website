"use client";

import { useEffect, useState, FormEvent } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import {
  getContent,
  upsertContent,
  deleteContent,
  type StoreContent,
} from "@/features/admin/store-api";
import { getApiErrorMessage } from "@/lib/api-client";

function PageError({ error }: { error?: string }) {
  return error ? <div className="admin-alert admin-alert--error" role="alert">{error}</div> : null;
}

type ContentPreset = {
  name: string;
  badge: string;
  pageKey: string;
  sectionKey: string;
  title: string;
  body: string;
  linkUrl?: string;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  description: string;
};

const PRESETS: ContentPreset[] = [
  {
    name: "📢 پیام اعلان بالای سایت",
    badge: "هدر و عمومی",
    pageKey: "common",
    sectionKey: "header_announcement",
    title: "اعلان ویژه بالای سایت",
    body: "ارسال رایگان برای خریدهای بالای ۱ میلیون تومان | حراج فصل ترما",
    description: "نمایش در بالاترین قسمت سایت بالای منوی اصلی",
  },
  {
    name: "🏠 بنر اصلی (Hero Banner)",
    badge: "صفحه اصلی",
    pageKey: "home",
    sectionKey: "hero",
    title: "نقش ایرانی، در خانه شما",
    body: "سفره‌های ترمه اصیل با آستر ساتن و لبه‌دوزی دقیق؛ مناسب برای چیدمان روی میز یا زمین.",
    linkUrl: "/products",
    imageUrl: "/images/firoozeh-folded.jpeg",
    description: "عنوان و متن اصلی که کاربر در لحظه ورود به صفحه نخست می‌بیند",
  },
  {
    name: "💎 ارزش‌ها و کیفیت ترما",
    badge: "صفحه اصلی",
    pageKey: "home",
    sectionKey: "values",
    title: "اصالت بافت و دقت در جزئیات",
    body: "رویه ترمه با نقوش اصیل ایرانی، دوخت تمیز و آستر ساتن هم‌رنگ برای ماندگاری و زیبایی طولانی‌مدت.",
    description: "معرفی ارزش‌های محصول در صفحه اصلی",
  },
  {
    name: "📖 داستان برند ترما",
    badge: "درباره ما",
    pageKey: "about",
    sectionKey: "story",
    title: "میان اصالت و سادگی",
    body: "ترما با هدف احیای زیبایی ترمه اصیل ایرانی در چیدمان خانه‌های امروزی شکل گرفت. تمرکز ما بر اصالت نقش، کیفیت پارچه و دوخت تمیز است.",
    imageUrl: "/images/lajvard-table.png",
    description: "متن اصلی معرفی و داستان شکل‌گیری برند ترما در صفحه درباره ما",
  },
  {
    name: "📞 اطلاعات تماس و پشتیبانی",
    badge: "تماس با ما",
    pageKey: "contact",
    sectionKey: "details",
    title: "اطلاعات تماس و ساعات پاسخ‌گویی",
    body: "تلفن: ۰۲۱-۸۸۸۸۸۸۸۸ | ایمیل: info@terma.ir | ساعات پاسخ‌گویی: شنبه تا چهارشنبه ۹ الی ۱۸",
    description: "نمایش کانال‌های ارتباطی در صفحه تماس با ما",
  },
  {
    name: "❓ سوال متداول (FAQ)",
    badge: "تماس / FAQ",
    pageKey: "contact",
    sectionKey: "faq_1",
    title: "چطور ابعاد مناسب سفره ترمه را انتخاب کنم؟",
    body: "طول و عرض میز خود را اندازه بگیرید. ابعاد سفره باید به گونه‌ای باشد که از اطراف میز حدود ۱۵ الی ۲۵ سانتی‌متر آویزان شود یا دقیقا وسط میز قرار گیرد.",
    description: "درج پرسش و پاسخ متداول در صفحه تماس و راهنمای خرید",
  },
  {
    name: "🦶 متن معرفی در فوتر",
    badge: "پانویس سایت",
    pageKey: "common",
    sectionKey: "footer_tagline",
    title: "ترما | سفره‌های ترمه ایرانی",
    body: "ترما عرضه‌کننده سفره‌های ترمه اصیل ایرانی با آستر ساتن و دوخت سفارشی برای خانه‌های ماندگار.",
    description: "متن خلاصه معرفی برند در پایین کلیه صفحات سایت",
  },
  {
    name: "🌐 سئوی صفحه اصلی",
    badge: "تنظیمات سئو",
    pageKey: "home",
    sectionKey: "seo",
    title: "تنظیمات متاتگ سئو صفحه اصلی",
    body: "خرید آنلاین انواع سفره ترمه ۴ نفره، ۶ نفره و ۸ نفره با بهترین کیفیت آستر ساتن و دوخت اصیل.",
    seoTitle: "ترما | خرید آنلاین سفره ترمه اصیل ایرانی",
    seoDescription: "ترما عرضه‌کننده سفره‌های ترمه باکیفیت و اصیل ایرانی در طرح‌های فیروزه، لاجورد و نیلا.",
    description: "تنظیم متاتگ‌های عنوان و توضیحات مرورگر و موتورهای جستجو",
  },
];

const PAGES_LIST = [
  { key: "all", label: "همه بخش‌ها", icon: "📦" },
  { key: "common", label: "عمومی و هدر/فوتر", icon: "📢" },
  { key: "home", label: "صفحه اصلی", icon: "🏠" },
  { key: "about", label: "درباره ما", icon: "ℹ️" },
  { key: "contact", label: "تماس با ما", icon: "📞" },
  { key: "faq", label: "سوالات متداول", icon: "❓" },
  { key: "seo", label: "تنظیمات سئو", icon: "🌐" },
];

export function AdminContentPage() {
  const [items, setItems] = useState<StoreContent[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Modal / Form state
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<StoreContent> | null>(null);

  // Preset picker modal
  const [showPresets, setShowPresets] = useState<boolean>(false);

  const reloadItems = async () => {
    const filterKey = activeTab === "all" || activeTab === "faq" || activeTab === "seo" ? undefined : activeTab;
    const data = await getContent(filterKey);
    setItems(data);
    setError(undefined);
  };

  useEffect(() => {
    let isMounted = true;
    const filterKey = activeTab === "all" || activeTab === "faq" || activeTab === "seo" ? undefined : activeTab;
    getContent(filterKey)
      .then((data) => {
        if (isMounted) {
          setItems(data);
          setError(undefined);
        }
      })
      .catch((e) => {
        if (isMounted) setError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Filtering
  const filteredItems = items.filter((item) => {
    // Tab filter logic
    if (activeTab === "faq") {
      if (!item.sectionKey.toLowerCase().includes("faq") && item.pageKey.toLowerCase() !== "faq") {
        return false;
      }
    } else if (activeTab === "seo") {
      if (item.sectionKey.toLowerCase() !== "seo" && !item.seoTitle && !item.seoDescription) {
        return false;
      }
    } else if (activeTab !== "all" && item.pageKey !== activeTab) {
      return false;
    }

    // Status filter
    if (statusFilter === "published" && !item.isPublished) return false;
    if (statusFilter === "draft" && item.isPublished) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchBody = item.body.toLowerCase().includes(q);
      const matchSection = item.sectionKey.toLowerCase().includes(q);
      const matchPage = item.pageKey.toLowerCase().includes(q);
      if (!matchTitle && !matchBody && !matchSection && !matchPage) return false;
    }

    return true;
  });

  // Actions
  async function handleTogglePublish(item: StoreContent) {
    setPendingId(item.id);
    try {
      await upsertContent({
        ...item,
        isPublished: !item.isPublished,
      });
      await reloadItems();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(item: StoreContent) {
    if (!window.confirm(`آیا از حذف بخش محتوایی «${item.title}» اطمینان دارید؟`)) return;
    setPendingId(item.id);
    try {
      await deleteContent(item.id);
      await reloadItems();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setPendingId(null);
    }
  }

  function handleOpenCreate(preset?: ContentPreset) {
    if (preset) {
      setEditingItem({
        pageKey: preset.pageKey,
        sectionKey: preset.sectionKey,
        title: preset.title,
        body: preset.body,
        linkUrl: preset.linkUrl ?? null,
        imageUrl: preset.imageUrl ?? null,
        seoTitle: preset.seoTitle ?? null,
        seoDescription: preset.seoDescription ?? null,
        isPublished: true,
      });
      setShowPresets(false);
    } else {
      setEditingItem({
        pageKey: activeTab === "all" || activeTab === "faq" || activeTab === "seo" ? "home" : activeTab,
        sectionKey: "",
        title: "",
        body: "",
        linkUrl: null,
        imageUrl: null,
        seoTitle: null,
        seoDescription: null,
        isPublished: true,
      });
    }
    setShowEditor(true);
  }

  function handleOpenEdit(item: StoreContent) {
    setEditingItem({ ...item });
    setShowEditor(true);
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingItem || !editingItem.pageKey || !editingItem.sectionKey || !editingItem.title || !editingItem.body) {
      alert("لطفاً کلیه فیلدهای الزامی (صفحه، شناسه بخش، عنوان و متن) را تکمیل کنید.");
      return;
    }

    setPendingId("form");
    setError(undefined);
    try {
      await upsertContent({
        id: editingItem.id,
        pageKey: editingItem.pageKey.trim().toLowerCase(),
        sectionKey: editingItem.sectionKey.trim().toLowerCase(),
        title: editingItem.title.trim(),
        body: editingItem.body.trim(),
        linkUrl: editingItem.linkUrl?.trim() || null,
        imageUrl: editingItem.imageUrl?.trim() || null,
        seoTitle: editingItem.seoTitle?.trim() || null,
        seoDescription: editingItem.seoDescription?.trim() || null,
        isPublished: editingItem.isPublished ?? true,
      });
      setShowEditor(false);
      setEditingItem(null);
      await reloadItems();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AdminShell title="مدیریت جامع محتوای سایت (CMS)">
      <PageError error={error} />

      {/* Header controls & stats */}
      <div className="admin-cms-header" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 700 }}>مدیریت بخش‌ها و متون سایت</h2>
            <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.875rem" }}>
              مدیریت آسان متون، بنرها، تصاویر، سوالات متداول و سئوی کلیه صفحات سایت ترما
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setShowPresets(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <span>⚡ قالب‌های آماده</span>
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => handleOpenCreate()}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <span>➕ افزودن بخش جدید</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-cms-tabs" style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
        {PAGES_LIST.map((tab) => {
          const count = items.filter((i) => {
            if (tab.key === "all") return true;
            if (tab.key === "faq") return i.sectionKey.includes("faq") || i.pageKey === "faq";
            if (tab.key === "seo") return i.sectionKey === "seo" || i.seoTitle || i.seoDescription;
            return i.pageKey === tab.key;
          }).length;

          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "8px 8px 0 0",
                border: "none",
                background: isActive ? "var(--accent)" : "transparent",
                color: isActive ? "#ffffff" : "var(--foreground)",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.9rem",
                transition: "all 0.2s ease",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "999px",
                  background: isActive ? "rgba(255,255,255,0.25)" : "var(--surface-subtle)",
                  color: isActive ? "#ffffff" : "var(--muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div
        className="admin-cms-toolbar"
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          background: "var(--surface)",
          padding: "1rem",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
          <input
            type="text"
            placeholder="🔍 جستجو در عنوان، شناسه بخش یا متن..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ width: "100%", paddingRight: "1rem" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>وضعیت:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
            className="input"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.875rem" }}
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="published">🟢 منتشر شده</option>
            <option value="draft">⚪ پیش‌نویس</option>
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>در حال دریافت اطلاعات محتوا...</div>
      ) : filteredItems.length === 0 ? (
        <div
          style={{
            padding: "3rem 1.5rem",
            textAlign: "center",
            background: "var(--surface)",
            borderRadius: "12px",
            border: "1px dashed var(--border)",
          }}
        >
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.5rem" }}>
            هیچ بخش محتوایی یافت نشد
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            می‌توانید با استفاده از «قالب‌های آماده» یا دکمه «افزودن بخش جدید»، اولین محتوای این بخش را ایجاد کنید.
          </p>
          <button type="button" className="button button--secondary" onClick={() => setShowPresets(true)}>
            مشاهده قالب‌های آماده ⚡
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filteredItems.map((item) => {
            const isPending = pendingId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  background: "var(--surface)",
                  borderRadius: "12px",
                  border: `1px solid ${item.isPublished ? "var(--border)" : "rgba(220, 38, 38, 0.3)"}`,
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  opacity: isPending ? 0.6 : 1,
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
              >
                <div>
                  {/* Card Header Tags */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          background: "var(--surface-subtle)",
                          color: "var(--muted)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        📄 {item.pageKey}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          background: "rgba(184, 134, 11, 0.1)",
                          color: "var(--accent)",
                          fontFamily: "monospace",
                        }}
                      >
                        #{item.sectionKey}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleTogglePublish(item)}
                      title="کلیک برای تغییر وضعیت انتشار"
                      style={{
                        border: "none",
                        background: item.isPublished ? "rgba(16, 185, 129, 0.1)" : "rgba(156, 163, 175, 0.15)",
                        color: item.isPublished ? "#059669" : "#6b7280",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <span>{item.isPublished ? "🟢 منتشر شده" : "⚪ پیش‌نویس"}</span>
                    </button>
                  </div>

                  {/* Title & Body */}
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.5rem", lineHeight: 1.4 }}>
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--muted)",
                      margin: "0 0 1rem",
                      lineHeight: 1.6,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.body}
                  </p>

                  {/* Image preview if exists */}
                  {item.imageUrl && (
                    <div style={{ marginBottom: "0.75rem", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border)", height: "90px", position: "relative", background: "#f8f9fa" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}

                  {/* Extras: Link / SEO badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.75rem", color: "var(--muted)" }}>
                    {item.linkUrl && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                        🔗 <code>{item.linkUrl}</code>
                      </span>
                    )}
                    {item.seoTitle && (
                      <span style={{ color: "#2563eb", background: "rgba(37, 99, 235, 0.08)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                        🔍 SEO OK
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1.25rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => handleOpenEdit(item)}
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                  >
                    ✏️ ویرایش
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(item)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      padding: "0.35rem 0.5rem",
                    }}
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && editingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "650px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                {editingItem.id ? "✏️ ویرایش بخش محتوایی" : "➕ ایجاد بخش محتوایی جدید"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditor(false);
                  setEditingItem(null);
                }}
                style={{ border: "none", background: "none", fontSize: "1.25rem", cursor: "pointer" }}
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="form-field">
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>صفحه مقصد (Page Key) *</span>
                  <select
                    value={editingItem.pageKey || "home"}
                    onChange={(e) => setEditingItem({ ...editingItem, pageKey: e.target.value })}
                    required
                    className="input"
                  >
                    <option value="home">صفحه اصلی (home)</option>
                    <option value="about">درباره ما (about)</option>
                    <option value="contact">تماس با ما (contact)</option>
                    <option value="common">عمومی و پانویس (common)</option>
                    <option value="faq">سوالات متداول (faq)</option>
                  </select>
                </label>

                <label className="form-field">
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>شناسه بخش (Section Key) *</span>
                  <input
                    type="text"
                    value={editingItem.sectionKey || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, sectionKey: e.target.value })}
                    placeholder="مثلاً hero, values, story, faq_1..."
                    required
                    dir="ltr"
                    className="input"
                  />
                </label>
              </div>

              <label className="form-field">
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>عنوان بخش *</span>
                <input
                  type="text"
                  value={editingItem.title || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="عنوان اصلی که کاربر در صفحه مشاهده می‌کند..."
                  required
                  className="input"
                />
              </label>

              <label className="form-field">
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>متن اصلی محتوا *</span>
                <textarea
                  rows={4}
                  value={editingItem.body || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, body: e.target.value })}
                  placeholder="شرح کامل، توضیحات یا متن این بخش..."
                  required
                  className="input"
                  style={{ resize: "vertical" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="form-field">
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>آدرس لینک (Call-To-Action Link)</span>
                  <input
                    type="text"
                    value={editingItem.linkUrl || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, linkUrl: e.target.value })}
                    placeholder="مثلاً /products یا https://..."
                    dir="ltr"
                    className="input"
                  />
                </label>

                <label className="form-field">
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>آدرس تصویر / بنر (Image URL)</span>
                  <input
                    type="text"
                    value={editingItem.imageUrl || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                    placeholder="/images/firoozeh-folded.jpeg"
                    dir="ltr"
                    className="input"
                  />
                </label>
              </div>

              {/* SEO Expandable Fields */}
              <details style={{ background: "var(--surface-subtle)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <summary style={{ fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>🔍 تنظیمات متاتگ‌های سئو (اختیاری)</summary>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
                  <label className="form-field">
                    <span style={{ fontSize: "0.8rem" }}>عنوان سئو (SEO Meta Title)</span>
                    <input
                      type="text"
                      value={editingItem.seoTitle || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, seoTitle: e.target.value })}
                      placeholder="عنوان جهت نمایش در نوار مرورگر و گوگل..."
                      className="input"
                    />
                  </label>
                  <label className="form-field">
                    <span style={{ fontSize: "0.8rem" }}>توضیحات سئو (SEO Meta Description)</span>
                    <textarea
                      rows={2}
                      value={editingItem.seoDescription || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, seoDescription: e.target.value })}
                      placeholder="توضیحات خلاصه جهت نمایش در نتایج گوگل..."
                      className="input"
                    />
                  </label>
                </div>
              </details>

              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginTop: "0.25rem" }}>
                <input
                  type="checkbox"
                  checked={editingItem.isPublished ?? true}
                  onChange={(e) => setEditingItem({ ...editingItem, isPublished: e.target.checked })}
                />
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>منتشر شده و قابل مشاهده در سایت</span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => {
                    setShowEditor(false);
                    setEditingItem(null);
                  }}
                >
                  انصراف
                </button>
                <button type="submit" className="button button--primary" disabled={pendingId === "form"}>
                  {pendingId === "form" ? "در حال ذخیره..." : "ذخیره بخش محتوایی"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset Generator Modal */}
      {showPresets && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "750px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>⚡ قالب‌های آماده محتوایی (Presets)</h3>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                  یکی از بخش‌های زیر را انتخاب کنید تا فرم ایجاد محتوا با مقادیر استاندارد پیش‌فرض پر شود.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPresets(false)}
                style={{ border: "none", background: "none", fontSize: "1.25rem", cursor: "pointer" }}
              >
                ✖
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
              {PRESETS.map((preset) => (
                <div
                  key={preset.name}
                  style={{
                    background: "var(--surface-subtle)",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{preset.name}</strong>
                      <span style={{ fontSize: "0.7rem", background: "rgba(184, 134, 11, 0.15)", color: "var(--accent)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                        {preset.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
                      {preset.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => handleOpenCreate(preset)}
                    style={{ width: "100%", marginTop: "0.5rem" }}
                  >
                    استفاده از این قالب ➕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
