"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/layout/container";
import { RatingStars } from "./rating-stars";
import { getProductReviews, submitProductReview, getMyProductReview } from "../review-api";
import { getCustomerSession, type CustomerSession } from "@/features/account/account-api";
import type { ProductReviewsSummary, CustomerReview } from "../models";
import type { Product } from "@/features/products/models";
import {
  CheckIcon,
  ChatBubbleIcon,
  ShieldCheckIcon,
  UserIcon,
  ArrowLeftIcon,
} from "@/components/ui/icons";

interface ProductReviewsSectionProps {
  product: Product;
}

export function ProductReviewsSection({ product }: ProductReviewsSectionProps) {
  const pathname = usePathname();
  const [summary, setSummary] = useState<ProductReviewsSummary | null>(null);
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [existingReview, setExistingReview] = useState<CustomerReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);

  // Form State
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadReviews = async () => {
    try {
      const data = await getProductReviews(product.slug || product.id, page, 10);
      setSummary(data);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      setLoading(true);
      try {
        const [reviewsData, userSession] = await Promise.allSettled([
          getProductReviews(product.slug || product.id, page, 10),
          getCustomerSession(),
        ]);

        if (!active) return;

        if (reviewsData.status === "fulfilled") {
          setSummary(reviewsData.value);
        }

        if (userSession.status === "fulfilled" && userSession.value) {
          setSession(userSession.value);
          const myReview = await getMyProductReview(product.id);
          if (active && myReview) {
            setExistingReview(myReview);
            setRating(myReview.rating);
            setTitle(myReview.title ?? "");
            setComment(myReview.comment);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [product.id, product.slug, page]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 3) {
      setFormError("لطفاً متن نظر خود را (حداقل ۳ کاراکتر) بنویسید.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const result = await submitProductReview({
        productId: product.id,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });

      setExistingReview(result);
      setSuccessMessage(
        "نظر شما با موفقیت ثبت شد و پس از بررسی و تأیید ناظر در سایت نمایش داده خواهد شد."
      );
      loadReviews();
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "خطایی در ثبت نظر رخ داد. لطفاً مجدداً تلاش کنید.";
      if (msg.toLowerCase().includes("antiforgery") || msg.toLowerCase().includes("csrf")) {
        msg = "اعتبارسنجی امنیتی نشست به‌روزرسانی شد. لطفاً دوباره دکمه «ثبت و ارسال نظر» را بزنید.";
      }
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalReviews = summary?.totalReviewsCount ?? 0;
  const avgRating = summary?.averageRating ?? 0;
  const dist = summary?.distribution ?? { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 0, fiveStars: 0 };

  const getPercent = (count: number) => (totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0);

  const returnUrl = `${pathname}#reviews`;

  return (
    <section id="reviews" className="product-reviews-section section-pad section-rule">
      <Container>
        <div className="section-head mb-8">
          <p className="section-eyebrow">دیدگاه خریداران و همراهان ترما</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-teal-950 flex items-center gap-3">
            <ChatBubbleIcon className="size-7 text-teal-800" />
            نظرات و امتیازهای محصول
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Right Column: Score Summary & Breakdown (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5">
              <div className="flex items-center gap-5">
                <div className="text-5xl font-black text-teal-900 tracking-tight">
                  {totalReviews > 0 ? new Intl.NumberFormat("fa-IR").format(avgRating) : "۰"}
                </div>
                <div className="space-y-1">
                  <RatingStars rating={avgRating} size="lg" />
                  <p className="text-xs text-stone-500 font-medium">
                    بر اساس {new Intl.NumberFormat("fa-IR").format(totalReviews)} نظر ثبت‌شده
                  </p>
                </div>
              </div>

              {/* Star Distribution Bars */}
              <div className="space-y-2.5 pt-4 border-t border-stone-100 text-sm">
                {[
                  { star: 5, label: "۵ ستاره", count: dist.fiveStars },
                  { star: 4, label: "۴ ستاره", count: dist.fourStars },
                  { star: 3, label: "۳ ستاره", count: dist.threeStars },
                  { star: 2, label: "۲ ستاره", count: dist.twoStars },
                  { star: 1, label: "۱ ستاره", count: dist.oneStar },
                ].map((item) => {
                  const pct = getPercent(item.count);
                  return (
                    <div key={item.star} className="flex items-center gap-3">
                      <span className="w-14 text-xs font-semibold text-stone-600 shrink-0">
                        {item.label}
                      </span>
                      <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-left text-xs font-medium text-stone-400 shrink-0" dir="ltr">
                        {new Intl.NumberFormat("fa-IR").format(pct)}٪
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review Form or Login Gate */}
            <div className="bg-stone-50/80 p-6 rounded-2xl border border-stone-200">
              {session ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-bold text-teal-950">
                    {existingReview ? "ویرایش نظر شما" : "ثبت نظر و امتیاز شما"}
                  </h3>

                  {existingReview && existingReview.status === "Pending" && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                      نظر قبلی شما در انتظار تأیید مدیریت است. با ویرایش، نظر مجدداً جهت بررسی ارسال می‌شود.
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700">امتیاز شما به این محصول</label>
                    <RatingStars
                      rating={rating}
                      interactive={true}
                      onRatingChange={setRating}
                      size="lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="review-title" className="block text-xs font-bold text-stone-700">
                      عنوان نظر (اختیاری)
                    </label>
                    <input
                      id="review-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: کیفیت دوخت عالی و رنگ فاخر"
                      maxLength={150}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="review-comment" className="block text-xs font-bold text-stone-700">
                      متن نظر شما <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="review-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      required
                      minLength={3}
                      maxLength={1000}
                      placeholder="نقاط قوت، جنس پارچه، تجربه استفاده و کیفیت ترمه را برای سایر خریداران بنویسید..."
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-teal-700 resize-y"
                    />
                    <div className="text-left text-[11px] text-stone-400" dir="ltr">
                      {comment.length} / 1000
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs" role="alert">
                      {formError}
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2" role="status">
                      <CheckIcon className="size-4 shrink-0 text-emerald-600" />
                      {successMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span>در حال ثبت نظر…</span>
                    ) : existingReview ? (
                      "به‌روزرسانی نظر"
                    ) : (
                      "ثبت و ارسال نظر"
                    )}
                  </button>
                  <p className="text-[11px] text-stone-500 text-center leading-relaxed">
                    نظرات پس از بررسی و تأیید توسط کارشناسان ترما در سایت منتشر خواهند شد.
                  </p>
                </form>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <div className="size-12 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto">
                    <UserIcon className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-teal-950">
                      ثبت نظر و امتیاز برای این محصول
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                      برای ثبت دیدگاه، تجربیات خرید و امتیازدهی به این محصول، لطفاً ابتدا وارد حساب کاربری خود شوید.
                    </p>
                  </div>
                  <Link
                    href={`/account/login?returnUrl=${encodeURIComponent(returnUrl)}`}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
                  >
                    ورود به حساب کاربری
                    <ArrowLeftIcon className="size-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Left Column: Approved Reviews List (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {loading ? (
              <div className="text-center py-12 text-stone-400 text-sm">در حال بارگذاری نظرات…</div>
            ) : summary && summary.reviews.items.length > 0 ? (
              <div className="space-y-4">
                {summary.reviews.items.map((review) => {
                  const formattedDate = new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "medium",
                  }).format(new Date(review.createdAt));

                  return (
                    <article
                      key={review.id}
                      className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3.5 transition-all hover:border-stone-300"
                    >
                      {/* Top bar: Reviewer + Stars + Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-xs font-bold">
                            {review.customerName.charAt(0) || "ک"}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-stone-900 block">
                              {review.customerName}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <RatingStars rating={review.rating} size="sm" />
                          <span className="text-xs text-stone-400">{formattedDate}</span>
                        </div>
                      </div>

                      {/* Title & Body */}
                      <div className="space-y-1.5 pt-1">
                        {review.title && (
                          <h4 className="text-sm font-bold text-stone-900">{review.title}</h4>
                        )}
                        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                          {review.comment}
                        </p>
                      </div>

                      {/* Official Admin Response */}
                      {review.adminResponse && (
                        <div className="mt-3 p-4 bg-teal-50/70 border-r-4 border-teal-700 rounded-xl rounded-r-none space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                            <ShieldCheckIcon className="size-4 text-teal-700" />
                            <span>پاسخ ترما</span>
                          </div>
                          <p className="text-xs text-teal-950 leading-relaxed whitespace-pre-line">
                            {review.adminResponse}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}

                {/* Pagination */}
                {summary.reviews.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    {Array.from({ length: summary.reviews.totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`size-9 rounded-xl text-xs font-bold transition-all ${
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
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-stone-300 text-center space-y-3">
                <ChatBubbleIcon className="size-10 text-stone-300 mx-auto" />
                <h3 className="text-base font-bold text-stone-700">هنوز نظری برای این محصول ثبت نشده است</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                  اولین نفری باشید که تجربه خود را درباره این اثر دستباف ثبت می‌کند و به انتخاب سایر خریداران کمک می‌کند.
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
