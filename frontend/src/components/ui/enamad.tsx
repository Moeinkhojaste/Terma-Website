import React from "react";

export type EnamadBadgeProps = {
  className?: string;
};

const ENAMAD_VERIFICATION_URL =
  "https://trustseal.enamad.ir/?id=7710569&code=xDHmhMgAjw7KUdF1p22YTRX47sE5EHN7";
const ENAMAD_CODE = "xDHmhMgAjw7KUdF1p22YTRX47sE5EHN7";
const ENAMAD_LOGO_SRC = "/images/enamad-logo.webp";

export function EnamadBadge({ className = "" }: EnamadBadgeProps) {
  return (
    <div className={`enamad-badge-card ${className}`.trim()}>
      <a
        referrerPolicy="origin"
        target="_blank"
        rel="noopener noreferrer"
        href={ENAMAD_VERIFICATION_URL}
        title="نماد اعتماد الکترونیکی ترما"
        aria-label="نماد اعتماد الکترونیکی اینماد"
      >
        {/* Enamad verification requires code and origin referrer attributes */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          referrerPolicy="origin"
          src={ENAMAD_LOGO_SRC}
          alt="نماد اعتماد الکترونیکی"
          style={{ cursor: "pointer" }}
          loading="lazy"
          // @ts-expect-error Enamad verification crawler reads custom code attribute on the img tag
          code={ENAMAD_CODE}
        />
      </a>
    </div>
  );
}
