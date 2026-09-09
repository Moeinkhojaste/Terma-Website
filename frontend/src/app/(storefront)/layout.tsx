import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getPublishedSite } from "@/features/content/cms-api";
import type { CmsPublishedPage } from "@/features/content/cms-types";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let site: CmsPublishedPage | undefined;
  try {
    site = await getPublishedSite();
  } catch {
    site = undefined;
  }

  return (
    <>
      <a className="skip-link" href="#محتوا">
        رفتن به محتوای اصلی
      </a>
      <Header site={site} />
      {children}
      <Footer site={site} />
    </>
  );
}

