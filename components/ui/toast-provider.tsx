"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import type { NotificationType } from "@/lib/notify";

type ToastItem = {
  id: string;
  type: NotificationType;
  message: string;
};

type NotifyEvent = CustomEvent<{
  type: NotificationType;
  message: string;
}>;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    function handleNotify(event: Event) {
      const detail = (event as NotifyEvent).detail;
      if (!detail?.message) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current.slice(-3), { id, ...detail }]);

      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, 4500);

      timers.current.set(id, timer);
    }

    window.addEventListener("kerjalokal:notify", handleNotify);
    return () => {
      window.removeEventListener("kerjalokal:notify", handleNotify);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  function dismiss(id: string) {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[250] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";
          const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;

          return (
            <div
              key={toast.id}
              role={isError ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-xl shadow-[#243746]/10 animate-in slide-in-from-top-2 ${
                isSuccess
                  ? "border-emerald-200"
                  : isError
                    ? "border-rose-200"
                    : "border-[#DCE6EC]"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 ${
                  isSuccess
                    ? "text-emerald-600"
                    : isError
                      ? "text-rose-600"
                      : "text-[#456278]"
                }`}
              >
                <Icon size={19} />
              </span>
              <p className="min-w-0 flex-1 text-xs font-semibold leading-5 text-[#34495E]">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="btn btn-ghost btn-xs btn-square -mr-1 -mt-1 shrink-0 text-[#8A969D] hover:bg-[#F3F6F7]"
                aria-label="Tutup notifikasi"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
