"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";

export function ProductsRouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="status-page">
      <Container>
        <section className="status-card status-card--failed" role="alert">
          <p className="section-eyebrow">خطا در ارتباط</p>
          <h1>اطلاعات محصول بارگذاری نشد</h1>
          <p>ارتباط با سرویس محصولات برقرار نشد. کمی بعد دوباره تلاش کنید.</p>
          <div className="status-actions">
            <button className="button button--primary" type="button" onClick={retry}>تلاش دوباره</button>
            <Link className="button button--secondary" href="/products">بازگشت به محصولات</Link>
          </div>
        </section>
      </Container>
    </main>
  );
}
