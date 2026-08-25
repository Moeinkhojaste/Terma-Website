import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#محتوا">
        رفتن به محتوای اصلی
      </a>
      <Header />
      {children}
      <Footer />
    </>
  );
}
