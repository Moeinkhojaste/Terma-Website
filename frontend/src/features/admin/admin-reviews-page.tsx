"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AdminShell } from "@/features/admin/admin-shell";
import {
  getAdminReviews,
  approveAdminReview,
  rejectAdminReview,
  replyAdminReview,
  deleteAdminReview,
} from "@/features/reviews/review-api";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import type { AdminProductReview, ReviewStatus } from "@/features/reviews/models";
import {
  CheckIcon,
  XIcon,
  ChatBubbleIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  TrashIcon,
} from "@/components/ui/icons";

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminProductReview[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Reply Modal State
  const [replyModalReview, setReplyModalReview] = useState<AdminProductReview | null>(null);
  const [replyText, setReplyText] = useState("");

  // Reject Modal State
  const [rejectModalReview, setRejectModalReview] = useState<AdminProductReview | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    let active = true;
    getAdminReviews({
      status: statusFilter || undefined,
      search: search.trim() || undefined,
      page,
      pageSize: 15,
    })
      .then((data) => {
        if (!active) return;
        setReviews(data.items);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "خطا در دریافت لیست نظرات";
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [statusFilter, page]);

  const loadData = () => {
    getAdminReviews({
      status: statusFilter || undefined,
      search: search.trim() || undefined,
      page,
      pageSize: 15,
    })
      .then((data) => {
        setReviews(data.items);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "خطا در دریافت لیست نظرات";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleApprove = async (id: string) => {
    setActionBusy(id);
    try {
      await approveAdminReview(id);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در تأیید نظر");
    } finally {
      setActionBusy(null);
    }
  };

  const handleOpenReject = (review: AdminProductReview) => {
    setRejectModalReview(review);
    setRejectReason(review.rejectionReason ?? "");
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReview) return;
    setActionBusy(rejectModalReview.id);
    try {
      await rejectAdminReview(rejectModalReview.id, rejectReason.trim() || undefined);
      setRejectModalReview(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در رد نظر");
    } finally {
      setActionBusy(null);
    }
  };

  const handleOpenReply = (review: AdminProductReview) => {
    setReplyModalReview(review);
    setReplyText(review.adminResponse ?? "");
  };

  const handleConfirmReply = async () => {
    if (!replyModalReview || !replyText.trim()) return;
    setActionBusy(replyModalReview.id);
    try {
      await replyAdminReview(replyModalReview.id, replyText.trim());
      setReplyModalReview(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ثبت پاسخ مدیریت");
    } finally {
      setActionBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("آیا از حذف دائمی این نظر مطمئن هستید؟")) return;
    setActionBusy(id);
    try {
      await deleteAdminReview(id);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در حذف نظر");
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <AdminShell title="مدیریت نظرات و امتیازها">
      {error && (
        <div className="admin-alert admin-alert--error mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-panel mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: "همه نظرات", value: "" },
              { label: "در انتظار بررسی", value: "Pending" },
              { label: "تأیید شده", value: "Approved" },
              { label: "رد شده", value: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value as ReviewStatus | "");
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === tab.value
                    ? "bg-teal-800 text-white shadow-sm"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="search"
              placeholder="جستجو در نظرات، نام کاربر، محصول…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3.5 py-2 border border-stone-300 rounded-xl text-xs w-64 focus:outline-none focus:border-teal-700"
            />
            <button type="submit" className="button button--secondary py-2 px-4 text-xs font-bold">
              جستجو
            </button>
          </form>
        </div>

        <div className="text-xs text-stone-500 font-medium">
          مجموع نتایج: {new Intl.NumberFormat("fa-IR").format(totalCount)} نظر
        </div>
      </div>

      {/* Reviews Table */}
      <div className="admin-panel admin-table-wrap">
        {loading ? (
          <div className="text-center py-12 text-stone-400 text-sm">در حال بارگذاری نظرات…</div>
        ) : reviews.length === 0 ? (
          <div className="admin-empty">نظری با این مشخصات یافت نشد.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>محصول</th>
                <th>کاربر / خریدار</th>
                <th>امتیاز</th>
                <th>دیدگاه</th>
                <th>وضعیت</th>
                <th>تاریخ ثبت</th>
                <th>عملیات مدیریت</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((rev) => {
                const formattedDate = new Intl.DateTimeFormat("fa-IR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(rev.createdAt));

                const isBusy = actionBusy === rev.id;

                return (
                  <tr key={rev.id}>
                    <td>
                      <strong className="block text-stone-900">{rev.productName}</strong>
                      <Link
                        href={`/products/${rev.productSlug || rev.productId}`}
                        target="_blank"
                        className="text-[11px] text-teal-700 hover:underline"
                      >
                        مشاهده صفحه محصول ↗
                      </Link>
                    </td>

                    <td>
                      <div className="font-bold text-stone-900">{rev.customerName}</div>
                      <div className="text-xs text-stone-500 font-mono" dir="ltr">
                        {rev.customerPhone}
                      </div>
                    </td>

                    <td>
                      <RatingStars rating={rev.rating} size="sm" />
                    </td>

                    <td className="max-w-md">
                      {rev.title && (
                        <div className="font-bold text-xs text-stone-900 mb-1">{rev.title}</div>
                      )}
                      <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line mb-2">
                        {rev.comment}
                      </p>

                      {rev.adminResponse && (
                        <div className="p-2.5 bg-teal-50 border-r-2 border-teal-700 rounded text-[11px] text-teal-950">
                          <strong>پاسخ شما:</strong> {rev.adminResponse}
                        </div>
                      )}

                      {rev.status === "Rejected" && rev.rejectionReason && (
                        <div className="p-2 bg-red-50 border-r-2 border-red-500 rounded text-[11px] text-red-800 mt-1">
                          <strong>دلیل رد:</strong> {rev.rejectionReason}
                        </div>
                      )}
                    </td>

                    <td>
                      {rev.status === "Approved" ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold inline-flex items-center gap-1">
                          <CheckIcon className="size-3 text-emerald-600" />
                          تأیید شده
                        </span>
                      ) : rev.status === "Rejected" ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs font-bold inline-flex items-center gap-1">
                          <XIcon className="size-3 text-red-600" />
                          رد شده
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold inline-flex items-center gap-1">
                          در انتظار بررسی
                        </span>
                      )}
                    </td>

                    <td dir="rtl" className="text-xs text-stone-500 whitespace-nowrap">
                      {formattedDate}
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rev.status !== "Approved" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(rev.id)}
                            disabled={isBusy}
                            className="button button--primary py-1 px-2.5 text-xs font-bold flex items-center gap-1"
                            title="تأیید و انتشار نظر"
                          >
                            <CheckIcon className="size-3" />
                            تأیید
                          </button>
                        )}

                        {rev.status !== "Rejected" && (
                          <button
                            type="button"
                            onClick={() => handleOpenReject(rev)}
                            disabled={isBusy}
                            className="button button--secondary py-1 px-2.5 text-xs font-bold text-red-700 hover:bg-red-50"
                            title="رد نظر"
                          >
                            <XIcon className="size-3" />
                            رد
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenReply(rev)}
                          disabled={isBusy}
                          className="button button--secondary py-1 px-2.5 text-xs font-bold flex items-center gap-1"
                          title="ثبت یا ویرایش پاسخ مدیریت"
                        >
                          <ChatBubbleIcon className="size-3" />
                          پاسخ
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(rev.id)}
                          disabled={isBusy}
                          className="button button--secondary py-1 px-2 text-xs text-stone-400 hover:text-red-700"
                          title="حذف نظر"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-stone-200">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`size-8 rounded-lg text-xs font-bold transition-all ${
                  page === p
                    ? "bg-teal-800 text-white shadow-sm"
                    : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                }`}
              >
                {new Intl.NumberFormat("fa-IR").format(p)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyModalReview && (
        <div className="account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reply-title">
          <div className="account-modal-card">
            <div className="account-modal-header">
              <div className="account-modal-title-wrap">
                <div className="account-modal-icon-badge">
                  <ShieldCheckIcon className="size-5 text-teal-800" />
                </div>
                <h3 id="reply-title">پاسخ مدیریت به نظر {replyModalReview.customerName}</h3>
              </div>
              <button
                type="button"
                className="account-modal-close"
                onClick={() => setReplyModalReview(null)}
                aria-label="بستن"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="space-y-3 my-3">
              <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-700 space-y-1">
                <strong>دیدگاه خریدار:</strong>
                <p>{replyModalReview.comment}</p>
              </div>

              <label htmlFor="admin-reply-textarea" className="block text-xs font-bold text-stone-800">
                متن پاسخ رسمی فروشگاه ترما:
              </label>
              <textarea
                id="admin-reply-textarea"
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="پاسخ، راهنمایی یا قدردانی از نظر خریدار را وارد کنید..."
                maxLength={1000}
                className="w-full p-3 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-teal-700 resize-y"
              />
            </div>

            <div className="account-modal-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setReplyModalReview(null)}
              >
                انصراف
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleConfirmReply}
                disabled={!replyText.trim()}
              >
                ثبت پاسخ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalReview && (
        <div className="account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <div className="account-modal-card">
            <div className="account-modal-header account-modal-header--danger">
              <div className="account-modal-title-wrap">
                <div className="account-modal-icon-badge account-modal-icon-badge--danger">
                  <AlertTriangleIcon className="size-5" />
                </div>
                <h3 id="reject-title">رد دیدگاه خریدار</h3>
              </div>
              <button
                type="button"
                className="account-modal-close"
                onClick={() => setRejectModalReview(null)}
                aria-label="بستن"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="space-y-3 my-3">
              <p className="text-xs text-stone-600 leading-relaxed">
                با رد این دیدگاه، نظر در صفحه محصول نمایش داده نخواهد شد و در پنل کاربر وضعیت «عدم تأیید» ثبت خواهد شد.
              </p>

              <label htmlFor="admin-reject-reason" className="block text-xs font-bold text-stone-800">
                دلیل رد نظر (اختیاری جهت اطلاع کاربر):
              </label>
              <input
                id="admin-reject-reason"
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: حاوی محتوای نامربوط یا تبلیغات"
                maxLength={500}
                className="w-full p-2.5 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="account-modal-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setRejectModalReview(null)}
              >
                انصراف
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={handleConfirmReject}
              >
                تأیید رد نظر
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
