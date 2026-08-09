import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  disabled?: boolean;
  className?: string;
};

export function Button({ href, children, variant = "primary", disabled = false, className = "" }: ButtonProps) {
  const classes = `button button--${variant} ${className}`;

  if (href && !disabled) {
    return <Link className={classes} href={href}>{children}</Link>;
  }

  return <button className={classes} type="button" disabled={disabled}>{children}</button>;
}
