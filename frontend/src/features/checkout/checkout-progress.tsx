import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";

const steps = [
  { number: 1, label: "فروشگاه", href: "/products" },
  { number: 2, label: "سبد خرید", href: "/cart" },
  { number: 3, label: "اطلاعات ارسال", href: "/checkout" },
  { number: 4, label: "پرداخت" },
  { number: 5, label: "ثبت سفارش" },
];

export type ProgressStep = 1 | 2 | 3 | 4 | 5;

export function CheckoutProgress({ current }: { current: ProgressStep }) {
  return (
    <nav className="checkout-progress" aria-label="مراحل سفارش">
      <ol>
        {steps.map((step) => {
          const completed = step.number < current;
          const active = step.number === current;
          const content = (
            <>
              <span aria-hidden="true">
                {completed ? <CheckIcon /> : new Intl.NumberFormat("fa-IR").format(step.number)}
              </span>
              <strong>{step.label}</strong>
            </>
          );
          return (
            <li
              className={completed ? "is-complete" : active ? "is-active" : ""}
              aria-current={active ? "step" : undefined}
              key={step.number}
            >
              {step.href && step.number <= current ? (
                <Link href={step.href}>{content}</Link>
              ) : (
                <div>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
