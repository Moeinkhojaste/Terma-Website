"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { getPublishedSite } from "@/features/content/cms-api";
import type { CmsPublishedPage } from "@/features/content/cms-types";

export type FooterSocialLinks = {
  instagramUrl?: string;
  telegramUrl?: string;
  whatsappUrl?: string;
};

const defaultSocialLinks: FooterSocialLinks = {
  instagramUrl: "https://instagram.com/terma_ir",
  telegramUrl: "https://t.me/terma_ir",
  whatsappUrl: "https://wa.me/989121234567",
};

export type FooterProps = {
  socialLinks?: FooterSocialLinks;
  site?: CmsPublishedPage | null;
};

export function Footer({
  socialLinks: initialSocialLinks,
  site,
}: FooterProps = {}) {
  const siteContactBlock = site?.document.blocks.find(
    (b) => b.type === "contactInfo",
  );
  const brandName =
    (siteContactBlock?.data?.brandName as string | undefined) || "ترما";
  const brandTagline =
    (siteContactBlock?.data?.tagline as string | undefined) ||
    "سفره‌های ترمه برای خانه‌های ایرانی امروز";
  const rawLogoUrl =
    (siteContactBlock?.data?.logoUrl as string | undefined) ||
    "/images/terma-logo.webp";
  const logoUrl = rawLogoUrl.startsWith("/")
    ? rawLogoUrl
    : "/images/terma-logo.webp";

  const siteSocialLinks: FooterSocialLinks | undefined = siteContactBlock?.data
    ? {
        instagramUrl:
          typeof siteContactBlock.data.instagramUrl === "string" &&
          siteContactBlock.data.instagramUrl
            ? siteContactBlock.data.instagramUrl
            : defaultSocialLinks.instagramUrl,
        telegramUrl:
          typeof siteContactBlock.data.telegramUrl === "string" &&
          siteContactBlock.data.telegramUrl
            ? siteContactBlock.data.telegramUrl
            : defaultSocialLinks.telegramUrl,
        whatsappUrl:
          typeof siteContactBlock.data.whatsappUrl === "string" &&
          siteContactBlock.data.whatsappUrl
            ? siteContactBlock.data.whatsappUrl
            : defaultSocialLinks.whatsappUrl,
      }
    : undefined;

  const [socialLinks, setSocialLinks] = useState<FooterSocialLinks>(
    initialSocialLinks ?? siteSocialLinks ?? defaultSocialLinks,
  );

  useEffect(() => {
    if (initialSocialLinks || siteSocialLinks) return;
    getPublishedSite()
      .then((s) => {
        const contactBlock = s.document.blocks.find(
          (b) => b.type === "contactInfo",
        );
        if (contactBlock?.data) {
          const d = contactBlock.data;
          setSocialLinks({
            instagramUrl:
              typeof d.instagramUrl === "string" && d.instagramUrl
                ? d.instagramUrl
                : defaultSocialLinks.instagramUrl,
            telegramUrl:
              typeof d.telegramUrl === "string" && d.telegramUrl
                ? d.telegramUrl
                : defaultSocialLinks.telegramUrl,
            whatsappUrl:
              typeof d.whatsappUrl === "string" && d.whatsappUrl
                ? d.whatsappUrl
                : defaultSocialLinks.whatsappUrl,
          });
        }
      })
      .catch(() => {
        // Fallback to default social links
      });
  }, [initialSocialLinks, siteSocialLinks]);

  const instagramUrl =
    socialLinks.instagramUrl || defaultSocialLinks.instagramUrl;
  const telegramUrl = socialLinks.telegramUrl || defaultSocialLinks.telegramUrl;
  const whatsappUrl = socialLinks.whatsappUrl || defaultSocialLinks.whatsappUrl;

  const footerLinkBlock = site?.document.blocks.find(
    (b) =>
      b.type === "linkList" &&
      (b.data?.placement === "footer" || b.data?.title === "لینک‌های فوتر"),
  );
  const dynamicFooterLinks = Array.isArray(footerLinkBlock?.data?.items)
    ? (footerLinkBlock.data.items as Array<{ label: string; href: string }>)
    : undefined;

  return (
    <footer className="footer" id="تماس">
      <Container className="footer-grid">
        <div className="footer-brand">
          <span className="brand-mark brand-mark--footer">
            <Image
              src={logoUrl}
              alt={`لوگوی ${brandName}`}
              fill
              sizes="(max-width: 768px) 120px, 160px"
              quality={90}
            />
          </span>
          <div className="footer-brand-text">
            <strong>{brandName}</strong>
            <p>{brandTagline}</p>
          </div>
        </div>
        {dynamicFooterLinks && dynamicFooterLinks.length > 0 ? (
          <div>
            <h2>دسترسی سریع</h2>
            {dynamicFooterLinks.map((link, idx) => (
              <Link href={link.href} key={`${link.href}-${idx}`}>
                {link.label}
              </Link>
            ))}
          </div>
        ) : (
          <div>
            <h2>ارتباط با ترما</h2>
            <Link href="/about">درباره ما</Link>
            <Link href="/contact">ارتباط با ما</Link>
          </div>
        )}
        <div>
          <h2>قوانین</h2>
          <Link href="/privacy">حریم خصوصی</Link>
          <Link href="/terms">شرایط استفاده</Link>
        </div>
        <div className="footer-social">
          <h2>شبکه‌های اجتماعی</h2>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="اینستاگرام ترما"
          >
            <InstagramIcon className="size-5" />
            <span>اینستاگرام</span>
          </a>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تلگرام ترما"
          >
            <TelegramIcon className="size-5" />
            <span>تلگرام</span>
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="واتساپ ترما"
          >
            <WhatsAppIcon className="size-5" />
            <span>واتساپ</span>
          </a>
        </div>
      </Container>
      <Container className="footer-bottom">
        <p>© ۱۴۰۵ {brandName}</p>
        <p>طراحی‌شده با احترام به هنر ایرانی</p>
      </Container>
    </footer>
  );
}
