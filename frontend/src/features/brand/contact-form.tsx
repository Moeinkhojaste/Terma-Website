"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { apiRequest } from "@/lib/api-client";

type ContactFormProps = {
  contactEmail?: string;
};

export function ContactForm({ contactEmail }: ContactFormProps) {
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactEmail) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const topic = String(form.get("topic") ?? "").trim();
    const body = String(form.get("message") ?? "").trim();
    try {
      await apiRequest("/api/store/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, topic, body, email: contactEmail }) });
      setMessage("پیام شما با موفقیت ارسال شد. به‌زودی با شما تماس می‌گیریم.");
    } catch {
      setMessage("ارسال پیام انجام نشد. لطفاً چند لحظه بعد دوباره تلاش کنید.");
    }
  }

  return (
    <form className="contact-form" id="فرم-پیام" onSubmit={handleSubmit} aria-describedby="contact-form-status">
      <div className="contact-form__heading">
        <p className="section-eyebrow">فرم پیام</p>
        <h2>چطور می‌توانیم کمک کنیم؟</h2>
        <p>اطلاعات زیر را بنویسید تا پیام آماده و در برنامه ایمیل شما باز شود.</p>
      </div>
      <div className="contact-form__grid">
        <label className="form-field">
          <span>نام و نام خانوادگی *</span>
          <input name="name" autoComplete="name" required minLength={2} placeholder="مثلاً مریم احمدی" />
        </label>
        <label className="form-field">
          <span>شماره تماس *</span>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required pattern="[0-9۰-۹٠-٩+\-\s]{7,15}" placeholder="مثلاً ۰۹۱۲۱۲۳۴۵۶۷" />
        </label>
        <label className="form-field form-field--full">
          <span>موضوع پیام *</span>
          <select name="topic" defaultValue="" required>
            <option value="" disabled>موضوع را انتخاب کنید</option>
            <option value="راهنمای انتخاب محصول">راهنمای انتخاب محصول</option>
            <option value="پیگیری سفارش">پیگیری سفارش</option>
            <option value="پیشنهاد یا انتقاد">پیشنهاد یا انتقاد</option>
            <option value="همکاری با ترما">همکاری با ترما</option>
          </select>
        </label>
        <label className="form-field form-field--full">
          <span>متن پیام *</span>
          <textarea name="message" rows={6} required minLength={10} placeholder="لطفاً درخواست خود را با جزئیات بنویسید." />
          <small>اگر پیام شما درباره سفارش است، شماره سفارش را هم بنویسید.</small>
        </label>
      </div>
      <button className="button button--primary contact-form__submit" type="submit" disabled={!contactEmail}>
        آماده‌کردن ایمیل <ArrowLeftIcon />
      </button>
      <p className={`contact-form__status${contactEmail ? "" : " contact-form__status--notice"}`} id="contact-form-status" aria-live="polite">
        {contactEmail ? message : "ایمیل فروشگاه هنوز تنظیم نشده است. پس از ثبت ایمیل واقعی ترما، این فرم فعال می‌شود."}
      </p>
    </form>
  );
}
