import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";

const steps = [
  { number: 1, label: "سبد خرید", href: "/cart" },
  { number: 2, label: "اطلاعات ارسال", href: "/checkout" },
  { number: 3, label: "ثبت سفارش" },
];

export function CheckoutProgress({ current }: { current: 1 | 2 | 3 }) {
  return <nav className="checkout-progress" aria-label="مراحل سفارش"><ol>{steps.map((step) => {
    const completed = step.number < current; const active = step.number === current;
    const content = <><span aria-hidden="true">{completed ? <CheckIcon /> : new Intl.NumberFormat("fa-IR").format(step.number)}</span><strong>{step.label}</strong></>;
    return <li className={completed ? "is-complete" : active ? "is-active" : ""} aria-current={active ? "step" : undefined} key={step.number}>{step.href && step.number <= current ? <Link href={step.href}>{content}</Link> : <div>{content}</div>}</li>;
  })}</ol></nav>;
}
