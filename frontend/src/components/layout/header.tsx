"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserIcon } from "@/components/ui/icons";
import { Container } from "@/components/layout/container";
import { CartLink } from "@/features/cart/cart-link";
import { ProductSearch } from "@/features/products/components/product-search";
import { getPublishedSite } from "@/features/content/cms-api";
import type { CmsPublishedPage } from "@/features/content/cms-types";

export type HeaderProps = {
  announcementText?: string | null;
  preview?: boolean;
  site?: CmsPublishedPage | null;
};

export function Header({
  announcementText: initialAnnouncementText,
  preview = false,
  site,
}: HeaderProps = {}) {
  // Extract initial values from site if provided
  const siteAnnouncement = site?.document.blocks.find(
    (b) => b.type === "announcement",
  )?.data?.text as string | undefined;

  const siteContactBlock = site?.document.blocks.find(
    (b) => b.type === "contactInfo",
  );
  const brandName =
    (siteContactBlock?.data?.brandName as string | undefined) || "ترما";
  const brandTagline =
    (siteContactBlock?.data?.tagline as string | undefined) || "ترمه فاخر ایرانی";
  const rawLogoUrl =
    (siteContactBlock?.data?.logoUrl as string | undefined) || "/images/terma-logo.webp";
  const logoUrl = rawLogoUrl.startsWith("/") ? rawLogoUrl : "/images/terma-logo.webp";

  const navBlock = site?.document.blocks.find(
    (b) =>
      b.type === "linkList" &&
      (b.data?.placement === "header" || b.data?.title === "منوی اصلی"),
  );
  const dynamicNavLinks = Array.isArray(navBlock?.data?.items)
    ? (navBlock.data.items as Array<{ label: string; href: string }>)
    : undefined;

  const [fetchedAnnouncement, setFetchedAnnouncement] = useState<
    string | null | undefined
  >(siteAnnouncement !== undefined ? (siteAnnouncement?.trim() || null) : undefined);

  const [brandInfo, setBrandInfo] = useState({
    name: brandName,
    tagline: brandTagline,
    logoUrl,
  });

  useEffect(() => {
    if (siteContactBlock?.data) {
      setBrandInfo({
        name: (siteContactBlock.data.brandName as string) || "ترما",
        tagline: (siteContactBlock.data.tagline as string) || "ترمه فاخر ایرانی",
        logoUrl:
          typeof siteContactBlock.data.logoUrl === "string" &&
          siteContactBlock.data.logoUrl.startsWith("/")
            ? siteContactBlock.data.logoUrl
            : "/images/terma-logo.webp",
      });
    }
  }, [siteContactBlock]);

  useEffect(() => {
    if (preview) return;

    getPublishedSite()
      .then((s) => {
        const announcementBlock = s.document.blocks.find(
          (b) => b.type === "announcement",
        );
        if (
          announcementBlock &&
          typeof announcementBlock.data?.text === "string"
        ) {
          const text = announcementBlock.data.text.trim();
          setFetchedAnnouncement(text.length > 0 ? text : null);
        } else if (siteAnnouncement === undefined) {
          setFetchedAnnouncement(null);
        }

        const contactBlock = s.document.blocks.find(
          (b) => b.type === "contactInfo",
        );
        if (contactBlock?.data) {
          const d = contactBlock.data;
          setBrandInfo({
            name: typeof d.brandName === "string" && d.brandName ? d.brandName : "ترما",
            tagline: typeof d.tagline === "string" && d.tagline ? d.tagline : "ترمه فاخر ایرانی",
            logoUrl: typeof d.logoUrl === "string" && d.logoUrl.startsWith("/") ? d.logoUrl : "/images/terma-logo.webp",
          });
        }
      })
      .catch(() => {
        if (siteAnnouncement === undefined) setFetchedAnnouncement(null);
      });
  }, [preview, siteAnnouncement]);

  const announcementText =
    preview && initialAnnouncementText !== undefined
      ? initialAnnouncementText
      : fetchedAnnouncement !== undefined
        ? fetchedAnnouncement
        : (initialAnnouncementText ?? null);

  const defaultNavLinks = [
    { label: "محصولات", href: "/products" },
    { label: "درباره ما", href: "/about" },
    { label: "ارتباط با ما", href: "/contact" },
  ];

  const navLinks =
    dynamicNavLinks && dynamicNavLinks.length > 0
      ? dynamicNavLinks
      : defaultNavLinks;

  return (
    <>
      {announcementText && (
        <div className="announcement">{announcementText}</div>
      )}
      <header className="site-header">
        <Container className="header-main">
          <Link className="brand" href="/" aria-label={`${brandInfo.name}، صفحه اصلی`}>
            <span className="brand-mark">
              <Image
                src={brandInfo.logoUrl}
                alt={`لوگوی ${brandInfo.name}`}
                fill
                sizes="(max-width: 768px) 160px, 300px"
                priority
                quality={90}
              />
            </span>
            <span className="brand-text">
              <span className="brand-name">{brandInfo.name}</span>
              <span className="brand-tagline">{brandInfo.tagline}</span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="ناوبری اصلی">
            {navLinks.map((link, index) => (
              <Link href={link.href} key={`${link.href}-${index}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <ProductSearch />
            <Link
              className="icon-button header-account-button"
              href="/account"
              aria-label="حساب کاربری"
            >
              <UserIcon />
            </Link>
            <CartLink />
          </div>
        </Container>
        <Container className="mobile-nav">
          <nav aria-label="ناوبری موبایل">
            {navLinks.map((link, index) => (
              <Link href={link.href} key={`mobile-${link.href}-${index}`}>
                {link.label}
              </Link>
            ))}
          </nav>
        </Container>
      </header>
    </>
  );
}
