import Link from "next/link";
import { CheckIcon, MinusIcon, XIcon } from "@/components/ui/icons";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { CheckoutProgress } from "@/features/checkout/checkout-progress";

type StatusType = "success" | "failed" | "cancelled";

const content = {
  success: {
    eyebrow: "ثبت سفارش موفق",
    title: "سفارش شما ثبت شد",
    description: "اطلاعات سفارش شما با موفقیت ثبت شد. هماهنگی هزینه ارسال و ادامه فرایند از طریق اطلاعات تماس انجام می‌شود.",
  },
  failed: {
    eyebrow: "ثبت سفارش ناموفق",
    title: "سفارش ثبت نشد",
    description: "اطلاعات سبد شما حفظ شده است. می‌توانید سفارش را بررسی کرده و دوباره تلاش کنید.",
  },
  cancelled: {
    eyebrow: "سفارش لغوشده",
    title: "ثبت سفارش را لغو کردید",
    description: "محصولات همچنان در سبد خرید باقی مانده‌اند و هر زمان بخواهید می‌توانید ادامه دهید.",
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
          <CheckoutProgress current={type === "success" ? 3 : 2} />
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
