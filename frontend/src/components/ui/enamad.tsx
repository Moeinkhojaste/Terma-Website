"use client";

import React from "react";

export type EnamadBadgeProps = {
  className?: string;
};

export function EnamadBadge({ className = "" }: EnamadBadgeProps) {
  const enamadUrl =
    "https://trustseal.enamad.ir/?id=7710569&Code=xDHmhMgAjw7KUdF1p22YTRX47sE5EHN7";
  const logoUrl =
    "https://trustseal.enamad.ir/logo.aspx?id=7710569&Code=xDHmhMgAjw7KUdF1p22YTRX47sE5EHN7";

  return (
    <div className={`enamad-badge-card ${className}`.trim()}>
      <a
        referrerPolicy="origin"
        target="_blank"
        rel="noopener noreferrer"
        href={enamadUrl}
        title="نماد اعتماد الکترونیکی ترما"
        aria-label="نماد اعتماد الکترونیکی اینماد"
      >
        {/* Enamad requires raw <img> tag to preserve origin referer header */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          referrerPolicy="origin"
          src={logoUrl}
          alt="نماد اعتماد الکترونیکی"
          style={{ cursor: "pointer" }}
          loading="lazy"
          // @ts-expect-error Enamad verification crawler reads custom code attribute on the img tag
          code="xDHmhMgAjw7KUdF1p22YTRX47sE5EHN7"
        />
      </a>
    </div>
  );
}
