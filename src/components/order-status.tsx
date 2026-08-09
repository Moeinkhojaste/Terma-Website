import Link from "next/link";
import { CheckIcon, MinusIcon, XIcon } from "@/components/icons";
import { Container } from "@/components/container";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

type StatusType = "success" | "failed" | "cancelled";

const content = {
  success: {
    eyebrow: "پرداخت موفق",
    title: "سفارش شما ثبت شد",
    description: "اطلاعات سفارش آزمایشی با موفقیت آماده شد. برای ثبت واقعی، اتصال backend و درگاه بانکی لازم است.",
  },
  failed: {
    eyebrow: "پرداخت ناموفق",
    title: "پرداخت انجام نشد",
    description: "مبلغی از شما دریافت نشده است. می‌توانید اطلاعات سفارش را بررسی کرده و دوباره تلاش کنید.",
  },
  cancelled: {
    eyebrow: "پرداخت لغوشده",
    title: "پرداخت را لغو کردید",
    description: "سفارش شما پرداخت نشده و محصولات همچنان در سبد خرید باقی مانده‌اند.",
  },
} satisfies Record<StatusType, { eyebrow: string; title: string; description: string }>;

export function OrderStatus({ type, orderNumber }: { type: StatusType; orderNumber?: string }) {
  const details = content[type];
  const Icon = type === "success" ? CheckIcon : type === "failed" ? XIcon : MinusIcon;

  return (
    <>
      <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a>
      <Header />
      <main id="محتوا" className="status-page">
        <Container>
          <section className={`status-card status-card--${type}`}>
            <span className="status-card__icon"><Icon className="size-7" /></span>
            <p className="section-eyebrow">{details.eyebrow}</p>
            <h1>{details.title}</h1>
            <p>{details.description}</p>
            {type === "success" && orderNumber && (
              <div className="order-number"><span>شماره سفارش</span><strong dir="ltr">{orderNumber}</strong></div>
            )}
            <div className="status-actions">
              {type === "success" ? (
                <><Link className="button button--primary" href="/products">ادامه خرید</Link><Link className="button button--secondary" href="/">بازگشت به خانه</Link></>
              ) : (
                <><Link className="button button--primary" href="/checkout">تلاش دوباره</Link><Link className="button button--secondary" href="/cart">بازگشت به سبد</Link></>
              )}
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
