"use client";

import React from "react";

export type EnamadBadgeProps = {
  className?: string;
};

const rawEnamadHtml = `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7710569&code=xDHmhMgAjw7KUdF1p22YTRX47sE5EHN7'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7710569&code=xDHmhMgAjw7KUdF1p22YTRX47sE5EHN7' alt='' style='cursor:pointer' code='xDHmhMgAjw7KUdF1p22YTRX47sE5EHN7'></a>`;

export function EnamadBadge({ className = "" }: EnamadBadgeProps) {
  return (
    <div
      className={`enamad-badge-card ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: rawEnamadHtml }}
    />
  );
}
