"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AccountShell } from "./components/account-shell";
import { getMyReviews } from "@/features/reviews/review-api";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import type { CustomerReview } from "@/features/reviews/models";
import {
  ChatBubbleIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  AlertTriangleIcon,
} from "@/components/ui/icons";

export function AccountReviewsClient() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyReviews()
      .then(setReviews)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "خطا در بارگذاری نظرات";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: CustomerReview["status"]) => {
    switch (status) {
      case "Approved":
        return (
          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <ShieldCheckIcon className="size-3.5 text-emerald-600" />
            تأیید و منتشر شده
          </span>
        );
      case "Rejected":
        return (
          <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <AlertTriangleIcon className="size-3.5 text-red-500" />
            عدم تأیید
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold inline-flex items-center gap-1">
            در انتظار بررسی
          </span>
        );
    }
  };

  return (
    <AccountShell title="نظرات من" breadcrumbs={[{ label: "نظرات من" }]}>
      <div className="account-reviews-view space-y-6">
        <p className="text-xs md:text-sm text-stone-600 leading-relaxed">
          دیدگاه‌ها و امتیازهایی که برای محصولات ثبت کرده‌اید. نظرات پس از تأیید ناظر در صفحه عمومی محصول منتشر می‌شوند.
        </p>

        {loading ? (
          <div className="cart-loading" role="status">
            در حال دریافت نظرات شما…
          </div>
        ) : error ? (
          <div className="account-error" role="alert">
            {error}
          </div>
        ) : reviews.length === 0 ? (
          <div className="commerce-empty">
            <ChatBubbleIcon className="size-12 text-slate-400" />
            <h2>هنوز نظری برای محصولی ثبت نکرده‌اید</h2>
            <p>شما می‌توانید با ورود به صفحه هر محصول، دیدگاه و امتیاز خود را درباره آن محصول ثبت کنید.</p>
            <Link className="button button--primary" href="/products">
              مشاهده محصولات ترما
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const formattedDate = new Intl.DateTimeFormat("fa-IR", {
                dateStyle: "medium",
              }).format(new Date(rev.createdAt));

              const imgUrl = rev.productImage || "/images/product-placeholder.svg";

              return (
                <div
                  key={rev.id}
                  className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4"
                >
                  {/* Top row: Product info + Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-xl overflow-hidden relative bg-stone-100 shrink-0 border border-stone-200">
                        <Image
                          src={imgUrl}
                          alt={rev.productName}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <Link
                          href={`/products/${rev.productSlug || rev.productId}`}
                          className="text-sm font-bold text-teal-950 hover:text-teal-700 transition-colors"
                        >
                          {rev.productName}
                        </Link>
                        <div className="text-[11px] text-stone-400 mt-0.5">{formattedDate}</div>
                      </div>
                    </div>
                    <div>{statusBadge(rev.status)}</div>
                  </div>

                  {/* Stars & Title & Body */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RatingStars rating={rev.rating} size="sm" />
                      {rev.title && (
                        <strong className="text-xs md:text-sm text-stone-900">{rev.title}</strong>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                      {rev.comment}
                    </p>
                  </div>

                  {/* Rejection Reason if any */}
                  {rev.status === "Rejected" && rev.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                      <strong className="block font-bold">دلیل عدم تأیید:</strong>
                      <p>{rev.rejectionReason}</p>
                    </div>
                  )}

                  {/* Admin reply if any */}
                  {rev.adminResponse && (
                    <div className="p-3.5 bg-teal-50/80 border-r-4 border-teal-700 rounded-xl rounded-r-none space-y-1 text-xs">
                      <strong className="text-teal-950 block font-bold">پاسخ مدیریت ترما:</strong>
                      <p className="text-teal-900 leading-relaxed whitespace-pre-line">
                        {rev.adminResponse}
                      </p>
                    </div>
                  )}

                  {/* Link to product */}
                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/products/${rev.productSlug || rev.productId}`}
                      className="inline-flex items-center gap-1.5 text-xs text-teal-800 hover:text-teal-950 font-bold"
                    >
                      <span>مشاهده صفحه محصول</span>
                      <ArrowLeftIcon className="size-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccountShell>
  );
}
