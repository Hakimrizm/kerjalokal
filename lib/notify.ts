"use client";

export type NotificationType = "success" | "error" | "info";

export function notify(type: NotificationType, message: string) {
  if (typeof window === "undefined" || !message.trim()) return;

  window.dispatchEvent(
    new CustomEvent("kerjalokal:notify", {
      detail: { type, message: message.trim() },
    }),
  );
}

export function notifyInvalidForm(form: HTMLFormElement, message: string) {
  if (form.dataset.klInvalidToast === "shown") return;
  form.dataset.klInvalidToast = "shown";
  notify("error", message);
}

export function resetInvalidForm(form: HTMLFormElement) {
  form.dataset.klInvalidToast = "hidden";
}
