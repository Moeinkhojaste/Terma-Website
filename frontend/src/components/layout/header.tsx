"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserIcon } from "@/components/ui/icons";
import { Container } from "@/components/layout/container";
import { CartLink } from "@/features/cart/cart-link";
import { ProductSearch } from "@/features/products/components/product-search";
import { getPublishedSite } from "@/features/content/cms-api";

export type HeaderProps = {
  announcementText?: string | null;
  preview?: boolean;
};

export function Header({ announcementText: initialAnnouncementText, preview = false }: HeaderProps = {}) {
  const [fetchedAnnouncement, setFetchedAnnouncement] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (preview) return;

    getPublishedSite()
      .then((site) => {
        const announcementBlock = site.document.blocks.find((b) => b.type === "announcement");
        if (announcementBlock && typeof announcementBlock.data?.text === "string") {
          const text = announcementBlock.data.text.trim();
          setFetchedAnnouncement(text.length > 0 ? text : null);
        } else {
          setFetchedAnnouncement(null);
        }
      })
      .catch(() => {
        setFetchedAnnouncement(null);
      });
  }, [preview]);

  const announcementText =
    preview && initialAnnouncementText !== undefined
      ? initialAnnouncementText
      : fetchedAnnouncement !== undefined
        ? fetchedAnnouncement
        : (initialAnnouncementText ?? null);

  return (
    <>
      {announcementText && <div className="announcement">{announcementText}</div>}
      <header className="site-header">
        <Container className="header-main">
          <Link className="brand" href="/" aria-label="ترما، صفحه اصلی">
            <span className="brand-mark">
              <Image
                src="/images/terma-logo.webp"
                alt="لوگوی ترما"
                fill
                sizes="(max-width: 768px) 160px, 300px"
                priority
                quality={90}
              />
            </span>
            <span className="brand-text">
              <span className="brand-name">ترما</span>
              <span className="brand-tagline">ترمه فاخر ایرانی</span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="ناوبری اصلی">
            <Link href="/products">محصولات</Link>
            <Link href="/about">درباره ما</Link>
            <Link href="/contact">ارتباط با ما</Link>
          </nav>
          <div className="header-actions">
            <ProductSearch />
            <Link className="icon-button header-account-button" href="/account" aria-label="حساب کاربری"><UserIcon /></Link>
            <CartLink />
          </div>
        </Container>
        <Container className="mobile-nav">
          <nav aria-label="ناوبری موبایل">
            <Link href="/products">محصولات</Link>
            <Link href="/about">درباره ما</Link>
            <Link href="/contact">ارتباط با ما</Link>
          </nav>
        </Container>
      </header>
    </>
  );
}
