"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";

type FeedbackOptions = { actionLabel?: string; onAction?: () => void; duration?: number };
type Feedback = FeedbackOptions & { id: number; message: string };
type FeedbackContextValue = { showFeedback: (message: string, options?: FeedbackOptions) => void };

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback>();

  const showFeedback = useCallback((message: string, options: FeedbackOptions = {}) => {
    setFeedback({ id: Date.now(), message, ...options });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback((current) => current?.id === feedback.id ? undefined : current), feedback.duration ?? 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const value = useMemo(() => ({ showFeedback }), [showFeedback]);
  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="feedback-region" aria-live="polite" aria-atomic="true">
        {feedback && (
          <div className="feedback-toast" role="status">
            <CheckIcon className="size-5" />
            <span>{feedback.message}</span>
            {feedback.actionLabel && feedback.onAction && (
              <button type="button" onClick={() => { feedback.onAction?.(); setFeedback(undefined); }}>{feedback.actionLabel}</button>
            )}
            <button className="feedback-toast__close" type="button" onClick={() => setFeedback(undefined)} aria-label="بستن پیام">
              <XIcon className="size-4" />
            </button>
          </div>
        )}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback must be used inside FeedbackProvider");
  return context;
}
