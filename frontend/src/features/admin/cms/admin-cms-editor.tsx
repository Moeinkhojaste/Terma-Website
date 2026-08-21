"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { CmsDocumentRenderer, resolveCmsMediaUrl } from "@/features/content/cms-renderer";
import {
  archiveCmsPage,
  getCmsPage,
  getCmsRevisions,
  listCmsMedia,
  publishCmsPage,
  restoreCmsRevision,
  saveCmsDraft,
  scheduleCmsPage,
} from "@/features/content/cms-api";
import type {
  CmsBlock,
  CmsBlockData,
  CmsPageDetail,
  CmsRevision,
  MediaAsset,
  RichTextNode,
} from "@/features/content/cms-types";
import { RichTextEditor } from "./rich-text-editor";

const blockCatalog = [
  ["hero", "بنر اصلی"],
  ["announcement", "نوار اعلان"],
  ["richText", "متن دیداری"],
  ["imageText", "متن و تصویر"],
  ["featureGrid", "کارت‌های ویژگی"],
  ["faq", "پرسش‌های رایج"],
  ["cta", "دعوت به اقدام"],
  ["contactInfo", "اطلاعات تماس"],
  ["linkList", "فهرست لینک‌ها"],
  ["productShowcase", "نمایش محصولات"],
  ["categoryLinks", "لینک دسته‌بندی‌ها"],
] as const;
const labels = Object.fromEntries(blockCatalog);

function template(type: string): CmsBlock {
  const common = { title: labels[type] ?? "بخش جدید", text: "" };
  const data: CmsBlockData =
    type === "hero"
      ? {
          ...common,
          eyebrow: "ترمه، برای خانه امروز",
          imageUrl: "/images/firoozeh-folded.webp",
          imageAlt: "سفره ترمه فیروزه با نقش‌های آبی، کرم و مسی",
          images: [
            { url: "/images/firoozeh-folded.webp", alt: "سفره ترمه فیروزه با نقش‌های آبی، کرم و مسی" },
            { url: "/images/lajvard-folded.webp", alt: "سفره ترمه لاجورد با نقش‌های سفید و مسی" },
            { url: "/images/nila-folded.webp", alt: "سفره ترمه نیلا با نقش‌های بته‌جقه آبی" },
          ],
          primaryLabel: "دیدن محصولات",
          primaryHref: "/products",
          secondaryLabel: "راهنمای انتخاب",
          secondaryHref: "/#راهنمای-خرید",
        }
      : type === "announcement"
        ? { text: "پیام کوتاه اعلان" }
        : type === "richText"
          ? {
              title: "عنوان بخش",
              content: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "متن خود را بنویسید." }],
                  },
                ],
              },
            }
          : ["featureGrid", "faq", "linkList", "categoryLinks"].includes(type)
            ? { ...common, items: [] }
            : type === "contactInfo"
              ? {
                  ...common,
                  brandName: "",
                  tagline: "",
                  logoUrl: "",
                  email: "",
                  phone: "",
                  instagramUrl: "",
                  telegramUrl: "",
                  whatsappUrl: "",
                  responseHours: "",
                }
              : type === "productShowcase"
                ? { ...common, count: 3 }
                : type === "cta"
                  ? { ...common, label: "مشاهده", href: "/products" }
                  : {
                      ...common,
                      imageUrl: "",
                      imageAlt: "",
                      imageSide: "right",
                    };
  return { id: crypto.randomUUID(), type, data };
}

function editableSnapshot(page: CmsPageDetail) {
  return JSON.stringify({
    name: page.name,
    slug: page.slug,
    document: page.document,
  });
}

export function AdminCmsEditor({ id }: { id: string }) {
  const router = useRouter();
  const [page, setPage] = useState<CmsPageDetail>();
  const [selectedId, setSelectedId] = useState<string>();
  const [revisions, setRevisions] = useState<CmsRevision[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [error, setError] = useState<string>();
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [previewSize, setPreviewSize] = useState<
    "mobile" | "tablet" | "desktop"
  >("desktop");
  const [scheduleAt, setScheduleAt] = useState("");
  const [draggedId, setDraggedId] = useState<string>();
  const lastSaved = useRef("");
  const backupKey = `terma-cms-draft-${id}`;

  const refreshRevisions = useCallback(
    () =>
      getCmsRevisions(id)
        .then(setRevisions)
        .catch(() => undefined),
    [id],
  );
  useEffect(() => {
    Promise.all([getCmsPage(id), getCmsRevisions(id), listCmsMedia()])
      .then(([loaded, history, assets]) => {
        const backup = localStorage.getItem(backupKey);
        const serverSnapshot = editableSnapshot(loaded);
        let recoveredBackup = false;
        if (backup) {
          if (
            window.confirm(
              "یک نسخه ذخیره‌نشده در این مرورگر پیدا شد. بازیابی شود؟",
            )
          ) {
            try {
              const recovered = JSON.parse(backup) as CmsPageDetail;
              loaded.name = recovered.name;
              loaded.slug = recovered.slug;
              loaded.document = recovered.document;
              recoveredBackup = true;
            } catch {
              localStorage.removeItem(backupKey);
            }
          } else {
            localStorage.removeItem(backupKey);
          }
        }
        lastSaved.current = serverSnapshot;
        setPage(loaded);
        setSaveState(recoveredBackup ? "idle" : "saved");
        setSelectedId(loaded.document.blocks[0]?.id);
        setRevisions(history);
        setMedia(assets);
      })
      .catch((e) => setError(getApiErrorMessage(e)));
  }, [id, backupKey]);

  const saveNow = useCallback(
    async (candidate?: CmsPageDetail) => {
      const current = candidate ?? page;
      if (!current) return undefined;
      const snapshot = editableSnapshot(current);
      if (snapshot === lastSaved.current) return current;
      setSaveState("saving");
      setError(undefined);
      localStorage.setItem(backupKey, JSON.stringify(current));
      try {
        const saved = await saveCmsDraft(current);
        lastSaved.current = editableSnapshot(saved);
        localStorage.removeItem(backupKey);
        setPage(saved);
        setSaveState("saved");
        refreshRevisions();
        return saved;
      } catch (e) {
        setSaveState("error");
        setError(
          e instanceof ApiError && e.status === 412
            ? "این صفحه در جای دیگری تغییر کرده است. برای جلوگیری از حذف تغییرات، صفحه را دوباره بارگذاری کنید."
            : getApiErrorMessage(e),
        );
        return undefined;
      }
    },
    [page, backupKey, refreshRevisions],
  );

  useEffect(() => {
    if (!page || editableSnapshot(page) === lastSaved.current) return;
    setSaveState("idle");
    localStorage.setItem(backupKey, JSON.stringify(page));
    const timer = window.setTimeout(() => {
      void saveNow(page);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [page, saveNow, backupKey]);

  const selected = useMemo(
    () => page?.document.blocks.find((block) => block.id === selectedId),
    [page, selectedId],
  );
  function mutate(mutator: (draft: CmsPageDetail) => void) {
    setPage((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  }
  function updateData(values: Partial<CmsBlockData>) {
    if (!selectedId) return;
    mutate((draft) => {
      const block = draft.document.blocks.find(
        (item) => item.id === selectedId,
      );
      if (block) block.data = { ...block.data, ...values };
    });
  }
  function addBlock(type: string) {
    const block = template(type);
    mutate((draft) => draft.document.blocks.push(block));
    setSelectedId(block.id);
  }
  function removeBlock() {
    if (!selectedId || !window.confirm("این بلوک از پیش‌نویس حذف شود؟")) return;
    mutate((draft) => {
      draft.document.blocks = draft.document.blocks.filter(
        (block) => block.id !== selectedId,
      );
    });
    setSelectedId(undefined);
  }
  function moveBlock(offset: number) {
    if (!selectedId || !page) return;
    const index = page.document.blocks.findIndex(
      (block) => block.id === selectedId,
    );
    const target = index + offset;
    if (index < 0 || target < 0 || target >= page.document.blocks.length)
      return;
    mutate((draft) => {
      [draft.document.blocks[index], draft.document.blocks[target]] = [
        draft.document.blocks[target],
        draft.document.blocks[index],
      ];
    });
  }
  function dropBlock(targetId: string) {
    if (!draggedId || draggedId === targetId || !page) return;
    mutate((draft) => {
      const from = draft.document.blocks.findIndex((b) => b.id === draggedId);
      const to = draft.document.blocks.findIndex((b) => b.id === targetId);
      const [item] = draft.document.blocks.splice(from, 1);
      draft.document.blocks.splice(to, 0, item);
    });
    setDraggedId(undefined);
  }
  async function publish() {
    if (!page || !window.confirm("این پیش‌نویس همین حالا در سایت منتشر شود؟"))
      return;
    const saved = await saveNow(page);
    if (!saved) return;
    try {
      const result = await publishCmsPage(saved);
      setPage(result);
      lastSaved.current = editableSnapshot(result);
      refreshRevisions();
      setSaveState("saved");
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }
  async function schedule() {
    if (!page || !scheduleAt) return;
    const saved = await saveNow(page);
    if (!saved) return;
    try {
      const result = await scheduleCmsPage(
        saved,
        new Date(scheduleAt).toISOString(),
      );
      setPage(result);
      lastSaved.current = editableSnapshot(result);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }
  async function restore(revisionId: string) {
    if (
      !page ||
      !window.confirm("این نسخه به‌عنوان پیش‌نویس جدید بازیابی شود؟")
    )
      return;
    try {
      const result = await restoreCmsRevision(page, revisionId);
      setPage(result);
      lastSaved.current = editableSnapshot(result);
      refreshRevisions();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }
  async function archive() {
    if (
      !page ||
      !window.confirm("صفحه آرشیو شود؟ این کار انتشار آن را متوقف می‌کند.")
    )
      return;
    try {
      await archiveCmsPage(page);
      router.push("/admin/content");
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  if (!page)
    return (
      <AdminShell title="ویرایش محتوا">
        <div className="admin-empty" role="status">
          {error ?? "در حال دریافت صفحه…"}
        </div>
      </AdminShell>
    );
  return (
    <AdminShell title={`ویرایش ${page.name}`}>
      <div className="cms-editor-top">
        <Link href="/admin/content" className="text-link">
          بازگشت به صفحات
        </Link>
        <button
          type="button"
          onClick={async () => {
            try {
              const res = await fetch("/api/cms/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: page.id, slug: page.slug }),
              });
              if (res.ok) {
                const data = await res.json();
                if (data.url) window.open(data.url, "_blank");
              }
            } catch {
              // ignore
            }
          }}
          className="button button--secondary"
        >
          پیش‌نمایش کامل
        </button>
        <div className="cms-save-state" role="status">
          {saveState === "saving"
            ? "در حال ذخیره…"
            : saveState === "saved"
              ? "پیش‌نویس ذخیره شد"
              : saveState === "error"
                ? "ذخیره ناموفق"
                : "تغییر ذخیره‌نشده"}
        </div>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void saveNow()}
        >
          ذخیره پیش‌نویس
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={publish}
        >
          انتشار
        </button>
      </div>
      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          {error}{" "}
          {error.includes("جای دیگری") && (
            <button type="button" onClick={() => location.reload()}>
              بارگذاری نسخه جدید
            </button>
          )}
        </div>
      )}
      <div className="cms-editor-layout">
        <aside className="admin-panel cms-outline">
          <h2>ساختار صفحه</h2>
          <div className="cms-block-list">
            {page.document.blocks.map((block, index) => (
              <button
                type="button"
                draggable
                onDragStart={() => setDraggedId(block.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropBlock(block.id)}
                className={selectedId === block.id ? "is-selected" : ""}
                onClick={() => setSelectedId(block.id)}
                key={block.id}
              >
                <span>{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                <strong>{labels[block.type] ?? block.type}</strong>
                <small>
                  {typeof block.data.title === "string" ? block.data.title : ""}
                </small>
              </button>
            ))}
          </div>
          <details className="cms-add-block">
            <summary>افزودن بلوک</summary>
            <div>
              {blockCatalog.map(([type, label]) => (
                <button type="button" onClick={() => addBlock(type)} key={type}>
                  {label}
                </button>
              ))}
            </div>
          </details>
        </aside>
        <section className="admin-panel cms-fields">
          <div className="cms-page-basics">
            <label className="form-field">
              <span>نام مدیریتی صفحه</span>
              <input
                value={page.name}
                onChange={(e) =>
                  mutate((draft) => {
                    draft.name = e.target.value;
                    draft.document.seo.title ||= e.target.value;
                  })
                }
              />
            </label>
            <label className="form-field">
              <span>آدرس صفحه</span>
              <input
                value={page.slug}
                disabled={page.isSystem}
                dir="ltr"
                onChange={(e) =>
                  mutate((draft) => {
                    draft.slug = e.target.value.toLowerCase();
                  })
                }
              />
            </label>
          </div>
          {selected ? (
            <>
              <div className="cms-fields__heading">
                <div>
                  <span>بلوک انتخاب‌شده</span>
                  <h2>{labels[selected.type] ?? selected.type}</h2>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => moveBlock(-1)}
                    aria-label="انتقال به بالا"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(1)}
                    aria-label="انتقال به پایین"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={removeBlock}
                  >
                    حذف
                  </button>
                </div>
              </div>
              <BlockFields block={selected} media={media} update={updateData} />
            </>
          ) : (
            <div className="admin-empty">
              یک بلوک را انتخاب کنید یا بلوک جدید بسازید.
            </div>
          )}
          <details className="cms-advanced">
            <summary>SEO و تنظیمات پیشرفته</summary>
            <label className="form-field">
              <span>عنوان SEO</span>
              <input
                value={page.document.seo.title}
                maxLength={300}
                onChange={(e) =>
                  mutate((draft) => {
                    draft.document.seo.title = e.target.value;
                  })
                }
              />
            </label>
            <label className="form-field">
              <span>توضیح SEO</span>
              <textarea
                value={page.document.seo.description}
                maxLength={1000}
                rows={3}
                onChange={(e) =>
                  mutate((draft) => {
                    draft.document.seo.description = e.target.value;
                  })
                }
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={page.document.seo.noIndex}
                onChange={(e) =>
                  mutate((draft) => {
                    draft.document.seo.noIndex = e.target.checked;
                  })
                }
              />{" "}
              جلوگیری از نمایش در موتورهای جست‌وجو
            </label>
            <div className="cms-schedule">
              <label className="form-field">
                <span>زمان انتشار به وقت دستگاه شما</span>
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="button button--secondary"
                disabled={!scheduleAt}
                onClick={schedule}
              >
                زمان‌بندی انتشار
              </button>
            </div>
          </details>
        </section>
        <aside className="admin-panel cms-preview-panel">
          <div className="cms-preview-toolbar">
            <strong>پیش‌نمایش زنده</strong>
            <div>
              <button
                type="button"
                className={previewSize === "mobile" ? "is-active" : ""}
                onClick={() => setPreviewSize("mobile")}
              >
                موبایل
              </button>
              <button
                type="button"
                className={previewSize === "tablet" ? "is-active" : ""}
                onClick={() => setPreviewSize("tablet")}
              >
                تبلت
              </button>
              <button
                type="button"
                className={previewSize === "desktop" ? "is-active" : ""}
                onClick={() => setPreviewSize("desktop")}
              >
                دسکتاپ
              </button>
            </div>
          </div>
          <div className={`cms-preview cms-preview--${previewSize}`}>
            <CmsDocumentRenderer document={page.document} />
          </div>
        </aside>
      </div>
      <section className="admin-panel cms-history">
        <h2>تاریخچه نسخه‌ها</h2>
        <div>
          {revisions.map((revision) => (
            <article key={revision.id}>
              <div>
                <strong>
                  نسخه {new Intl.NumberFormat("fa-IR").format(revision.number)}
                </strong>
                <span>
                  {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(revision.createdAt))}
                </span>
              </div>
              <div>
                {revision.isPublished && (
                  <span className="status-pill status-pill--success">
                    منتشرشده
                  </span>
                )}
                {revision.isDraft && (
                  <span className="status-pill">پیش‌نویس فعلی</span>
                )}
                <button
                  type="button"
                  onClick={() => restore(revision.id)}
                  disabled={revision.isDraft}
                >
                  بازیابی
                </button>
              </div>
            </article>
          ))}
        </div>
        {!page.isSystem && (
          <button
            type="button"
            className="button button--secondary cms-archive"
            onClick={archive}
          >
            آرشیو صفحه
          </button>
        )}
      </section>
    </AdminShell>
  );
}

function BlockFields({
  block,
  media,
  update,
}: {
  block: CmsBlock;
  media: MediaAsset[];
  update: (value: Partial<CmsBlockData>) => void;
}) {
  const data = block.data;
  const field = (key: string, label: string, dir?: "ltr") => (
    <label className="form-field">
      <span>{label}</span>
      <input
        value={typeof data[key] === "string" ? String(data[key]) : ""}
        dir={dir}
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </label>
  );
  if (block.type === "announcement") return field("text", "متن اعلان");
  if (block.type === "richText")
    return (
      <>
        {field("title", "عنوان")}
        <label className="form-field">
          <span>متن</span>
          <RichTextEditor
            value={data.content as RichTextNode | undefined}
            onChange={(content) => update({ content })}
          />
        </label>
      </>
    );
  const itemFields =
    block.type === "faq"
      ? [
          ["question", "پرسش"],
          ["answer", "پاسخ"],
        ]
      : block.type === "linkList" || block.type === "categoryLinks"
        ? [
            ["label", "عنوان لینک"],
            ["href", "آدرس"],
          ]
        : [
            ["title", "عنوان"],
            ["text", "توضیح"],
          ];
  const items = Array.isArray(data.items)
    ? (data.items as Record<string, string>[])
    : [];
  return (
    <>
      {!["contactInfo"].includes(block.type) &&
        field("eyebrow", "بالانویس کوچک")}
      {field("title", "عنوان")}
      {!["linkList", "categoryLinks"].includes(block.type) && (
        <label className="form-field">
          <span>توضیح</span>
          <textarea
            value={typeof data.text === "string" ? data.text : ""}
            rows={4}
            onChange={(e) => update({ text: e.target.value })}
          />
        </label>
      )}
      {block.type === "hero" && (
        <HeroSlidesEditor
          images={
            Array.isArray(data.images)
              ? (data.images as Array<{ url: string; alt?: string }>)
              : typeof data.imageUrl === "string" && data.imageUrl
                ? [{ url: data.imageUrl, alt: typeof data.imageAlt === "string" ? data.imageAlt : "" }]
                : []
          }
          media={media}
          update={(images) =>
            update({
              images,
              imageUrl: images[0]?.url || "",
              imageAlt: images[0]?.alt || "",
            })
          }
        />
      )}
      {block.type === "imageText" && (
        <>
          <label className="form-field">
            <span>تصویر از کتابخانه</span>
            <select
              value={typeof data.imageUrl === "string" ? data.imageUrl : ""}
              onChange={(e) => {
                const asset = media.find(
                  (item) => item.publicUrl === e.target.value,
                );
                update({
                  imageUrl: e.target.value,
                  imageAlt: asset?.altText ?? data.imageAlt,
                });
              }}
            >
              <option value="">بدون تصویر</option>
              {media.map((asset) => (
                <option value={asset.publicUrl} key={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
            <small>
              <Link href="/admin/content/media">مدیریت و آپلود تصاویر</Link>
            </small>
          </label>
          {field("imageAlt", "توضیح تصویر")}
        </>
      )}
      {block.type === "hero" && (
        <>
          {field("primaryLabel", "متن دکمه اصلی")}
          {field("primaryHref", "آدرس دکمه اصلی", "ltr")}
          {field("secondaryLabel", "متن دکمه دوم")}
          {field("secondaryHref", "آدرس دکمه دوم", "ltr")}
        </>
      )}
      {block.type === "cta" && (
        <>
          {field("label", "متن دکمه")}
          {field("href", "آدرس دکمه", "ltr")}
        </>
      )}
      {block.type === "contactInfo" && (
        <>
          {field("brandName", "نام برند")}
          {field("tagline", "شعار کوتاه")}
          <label className="form-field">
            <span>لوگو از کتابخانه</span>
            <select
              value={typeof data.logoUrl === "string" ? data.logoUrl : ""}
              onChange={(e) => update({ logoUrl: e.target.value })}
            >
              <option value="">لوگوی پیش‌فرض</option>
              {media.map((asset) => (
                <option value={asset.publicUrl} key={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
            <small>
              <Link href="/admin/content/media">مدیریت و آپلود تصاویر</Link>
            </small>
          </label>
          {field("email", "ایمیل", "ltr")}
          {field("phone", "تلفن", "ltr")}
          {field("instagramUrl", "لینک اینستاگرام", "ltr")}
          {field("telegramUrl", "لینک تلگرام", "ltr")}
          {field("whatsappUrl", "لینک واتساپ", "ltr")}
          {field("responseHours", "زمان پاسخ‌گویی")}
        </>
      )}
      {block.type === "productShowcase" && (
        <label className="form-field">
          <span>تعداد محصول</span>
          <input
            type="number"
            min={1}
            max={12}
            value={typeof data.count === "number" ? data.count : 3}
            onChange={(e) => update({ count: Number(e.target.value) })}
          />
        </label>
      )}
      {["featureGrid", "faq", "linkList", "categoryLinks"].includes(
        block.type,
      ) && (
        <div className="cms-items-editor">
          <div className="cms-items-editor__heading">
            <strong>آیتم‌ها</strong>
            <button
              type="button"
              onClick={() =>
                update({
                  items: [
                    ...items,
                    Object.fromEntries(itemFields.map(([key]) => [key, ""])),
                  ],
                })
              }
            >
              افزودن آیتم
            </button>
          </div>
          {items.map((item, index) => (
            <fieldset key={index}>
              <legend>
                آیتم {new Intl.NumberFormat("fa-IR").format(index + 1)}
              </legend>
              {itemFields.map(([key, label]) => (
                <label className="form-field" key={key}>
                  <span>{label}</span>
                  <input
                    value={item[key] ?? ""}
                    dir={key === "href" ? "ltr" : undefined}
                    onChange={(e) => {
                      const next = structuredClone(items);
                      next[index][key] = e.target.value;
                      update({ items: next });
                    }}
                  />
                </label>
              ))}
              <button
                type="button"
                className="is-danger"
                onClick={() =>
                  update({
                    items: items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                حذف آیتم
              </button>
            </fieldset>
          ))}
        </div>
      )}
    </>
  );
}

function HeroSlidesEditor({
  images = [],
  media,
  update,
}: {
  images: Array<{ url: string; alt?: string }>;
  media: MediaAsset[];
  update: (images: Array<{ url: string; alt?: string }>) => void;
}) {
  const moveSlide = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const removeSlide = (index: number) => {
    update(images.filter((_, i) => i !== index));
  };

  const updateSlide = (index: number, patch: Partial<{ url: string; alt?: string }>) => {
    const next = images.map((slide, i) => (i === index ? { ...slide, ...patch } : slide));
    update(next);
  };

  const addSlide = (url = "") => {
    const asset = media.find((m) => m.publicUrl === url);
    update([...images, { url, alt: asset?.altText || "" }]);
  };

  return (
    <div className="cms-slides-manager">
      <div className="cms-slides-manager__heading">
        <div>
          <strong>مدیریت تصاویر اسلایدشو هیرو</strong>
          <small>تصاویر با ترنزیشن نرم و افکت‌های حرکتی در صفحه اصلی تعویض می‌شوند.</small>
        </div>
        <button
          type="button"
          className="button button--secondary button--sm"
          onClick={() => addSlide(media[0]?.publicUrl || "")}
        >
          + افزودن تصویر به اسلایدشو
        </button>
      </div>

      {images.length === 0 ? (
        <div className="cms-slides-empty">
          <p>هنوز تصویری به اسلایدشو اضافه نشده است (تصاویر پیش‌فرض سیستم نمایش داده می‌شوند).</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() =>
              update([
                { url: "/images/firoozeh-folded.webp", alt: "سفره ترمه فیروزه با نقش‌های آبی، کرم و مسی" },
                { url: "/images/lajvard-folded.webp", alt: "سفره ترمه لاجورد با نقش‌های سفید و مسی" },
                { url: "/images/nila-folded.webp", alt: "سفره ترمه نیلا با نقش‌های بته‌جقه آبی" },
              ])
            }
          >
            بارگذاری ۳ تصویر پیش‌فرض ترمه
          </button>
        </div>
      ) : (
        <div className="cms-slides-list">
          {images.map((slide, index) => (
            <div className="cms-slide-card" key={`slide-${index}`}>
              <div className="cms-slide-card__header">
                <span className="cms-slide-card__index">
                  تصویر {new Intl.NumberFormat("fa-IR").format(index + 1)}
                </span>
                <div className="cms-slide-card__actions">
                  <button
                    type="button"
                    title="انتقال به بالا"
                    disabled={index === 0}
                    onClick={() => moveSlide(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="انتقال به پایین"
                    disabled={index === images.length - 1}
                    onClick={() => moveSlide(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    title="حذف تصویر"
                    onClick={() => removeSlide(index)}
                  >
                    ✕ حذف
                  </button>
                </div>
              </div>

              <div className="cms-slide-card__body">
                <div className="cms-slide-card__preview">
                  {slide.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveCmsMediaUrl(slide.url) || slide.url} alt={slide.alt || "پیش‌نمایش"} />
                  ) : (
                    <div className="cms-slide-card__placeholder">بدون تصویر</div>
                  )}
                </div>

                <div className="cms-slide-card__fields">
                  <label className="form-field">
                    <span>انتخاب / تعویض از کتابخانه رسانه</span>
                    <select
                      value={slide.url}
                      onChange={(e) => {
                        const asset = media.find((m) => m.publicUrl === e.target.value);
                        updateSlide(index, {
                          url: e.target.value,
                          alt: asset?.altText || slide.alt,
                        });
                      }}
                    >
                      <option value="">-- انتخاب از کتابخانه رسانه --</option>
                      {media.map((asset) => (
                        <option value={asset.publicUrl} key={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>یا آدرس مستقیم تصویر (URL)</span>
                    <input
                      dir="ltr"
                      value={slide.url}
                      placeholder="/images/... یا https://..."
                      onChange={(e) => updateSlide(index, { url: e.target.value })}
                    />
                  </label>

                  <label className="form-field">
                    <span>متن جایگزین (Alt Text)</span>
                    <input
                      value={slide.alt || ""}
                      placeholder="توضیح تصویر برای سئو و دسترس‌پذیری"
                      onChange={(e) => updateSlide(index, { alt: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <small className="cms-slides-footer-note">
        برای آپلود تصاویر جدید، وارد بخش <Link href="/admin/content/media">کتابخانه رسانه</Link> شوید.
      </small>
    </div>
  );
}

