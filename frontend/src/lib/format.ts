export function formatPrice(value?: number | null) {
  const num = typeof value === "number" && !isNaN(value) && isFinite(value) ? value : 0;
  return `${new Intl.NumberFormat("fa-IR").format(num)} تومان`;
}

export function formatNumber(value?: number | null) {
  const num = typeof value === "number" && !isNaN(value) && isFinite(value) ? value : 0;
  return new Intl.NumberFormat("fa-IR").format(num);
}

export function toPersianDigits(input: string | number) {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(input).replace(/[0-9]/g, (w) => persianDigits[+w]);
}
