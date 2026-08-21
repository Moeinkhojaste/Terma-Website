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

export interface PersianDateOptions {
  includeWeekday?: boolean;
  includeYear?: boolean;
}

export function formatPersianDate(
  date?: Date | string | number | null,
  options?: PersianDateOptions
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const includeWeekday = options?.includeWeekday ?? true;
  const includeYear = options?.includeYear ?? true;

  try {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      calendar: "persian",
      weekday: includeWeekday ? "long" : undefined,
      day: "numeric",
      month: "long",
      year: includeYear ? "numeric" : undefined,
    }).formatToParts(d);

    const getPart = (type: string) =>
      parts.find((p) => p.type === type)?.value || "";

    const weekday = getPart("weekday");
    const day = getPart("day");
    const month = getPart("month");
    const year = getPart("year");

    const dateSegments: string[] = [];
    if (day) dateSegments.push(day);
    if (month) dateSegments.push(month);
    if (includeYear && year) dateSegments.push(year);

    const mainDate = dateSegments.join(" ");

    if (includeWeekday && weekday) {
      return `${weekday}، ${mainDate}`;
    }

    return mainDate;
  } catch {
    return d.toLocaleDateString("fa-IR");
  }
}

export function formatPersianDateTime(
  date?: Date | string | number | null,
  options?: PersianDateOptions
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const dateStr = formatPersianDate(d, options);
  if (!dateStr) return "";

  try {
    const timeParts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const hour = timeParts.find((p) => p.type === "hour")?.value ?? "";
    const minute = timeParts.find((p) => p.type === "minute")?.value ?? "";

    if (hour && minute) {
      return `${dateStr}، ساعت ${hour}:${minute}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
