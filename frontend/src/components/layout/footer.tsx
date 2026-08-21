"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { getPublishedSite } from "@/features/content/cms-api";

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

export function Footer({ socialLinks: initialSocialLinks }: { socialLinks?: FooterSocialLinks } = {}) {
  const [socialLinks, setSocialLinks] = useState<FooterSocialLinks>(initialSocialLinks ?? defaultSocialLinks);

  useEffect(() => {
    if (initialSocialLinks) return;
    getPublishedSite()
      .then((site) => {
        const contactBlock = site.document.blocks.find((b) => b.type === "contactInfo");
        if (contactBlock?.data) {
          const d = contactBlock.data;
          setSocialLinks({
            instagramUrl: typeof d.instagramUrl === "string" && d.instagramUrl ? d.instagramUrl : defaultSocialLinks.instagramUrl,
            telegramUrl: typeof d.telegramUrl === "string" && d.telegramUrl ? d.telegramUrl : defaultSocialLinks.telegramUrl,
            whatsappUrl: typeof d.whatsappUrl === "string" && d.whatsappUrl ? d.whatsappUrl : defaultSocialLinks.whatsappUrl,
          });
        }
      })
      .catch(() => {
        // Fallback to default social links
      });
  }, [initialSocialLinks]);

  const instagramUrl = socialLinks.instagramUrl || defaultSocialLinks.instagramUrl;
  const telegramUrl = socialLinks.telegramUrl || defaultSocialLinks.telegramUrl;
  const whatsappUrl = socialLinks.whatsappUrl || defaultSocialLinks.whatsappUrl;

  return (
    <footer className="footer" id="تماس">
      <Container className="footer-grid">
        <div className="footer-brand">
          <span className="brand-mark brand-mark--footer">
            <Image
              src="/images/terma-logo.webp"
              alt="لوگوی ترما"
              fill
              sizes="(max-width: 768px) 120px, 160px"
              quality={90}
            />
          </span>
          <div className="footer-brand-text">
            <strong>ترما</strong>
            <p>سفره‌های ترمه برای خانه‌های ایرانی امروز</p>
          </div>
        </div>
        <div>
          <h2>ارتباط با ترما</h2>
          <Link href="/about">درباره ما</Link>
          <Link href="/contact">ارتباط با ما</Link>
          <Link href="/style-guide">راهنمای سبک داخلی</Link>
        </div>
        <div>
          <h2>قوانین</h2>
          <Link href="/privacy">حریم خصوصی</Link>
          <Link href="/terms">شرایط استفاده</Link>
        </div>
        <div className="footer-social">
          <h2>شبکه‌های اجتماعی</h2>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام ترما">
            <InstagramIcon className="size-5" />
            <span>اینستاگرام</span>
          </a>
          <a href={telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="تلگرام ترما">
            <TelegramIcon className="size-5" />
            <span>تلگرام</span>
          </a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="واتساپ ترما">
            <WhatsAppIcon className="size-5" />
            <span>واتساپ</span>
          </a>
        </div>
      </Container>
      <Container className="footer-bottom">
        <p>© ۱۴۰۵ ترما</p>
        <p>طراحی‌شده با احترام به هنر ایرانی</p>
      </Container>
    </footer>
  );
}
