import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="status-page">
        <Container>
          <section className="status-card status-card--not-found">
            <strong className="not-found-code">۴۰۴</strong>
            <p className="section-eyebrow">صفحه پیدا نشد</p>
            <h1>این صفحه وجود ندارد</h1>
            <p>ممکن است آدرس تغییر کرده باشد یا لینک اشتباه باشد.</p>
            <div className="status-actions"><Link className="button button--primary" href="/">بازگشت به خانه</Link><Link className="button button--secondary" href="/products">مشاهده محصولات</Link></div>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
