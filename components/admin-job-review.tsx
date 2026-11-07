"use client";

const labels: Record<string, string> = {
  draft: "Draft",
  pending_review: "Perlu pemeriksaan",
  published: "Tayang",
  rejected: "Perlu perbaikan",
  closed: "Ditutup",
  banned: "Diblokir karena fraud",
};

export function AdminJobReview({
  status,
}: {
  jobId?: string;
  role?: "admin" | "super_admin";
  status: string;
}) {
  const label = labels[status] ?? status;
  const badgeClass =
    status === "published"
      ? "badge-success"
      : status === "banned" || status === "rejected"
        ? "badge-error"
        : status === "pending_review"
          ? "badge-warning"
          : "badge-ghost";

  return (
    <span className={`badge badge-sm ${badgeClass}`}>
      {label}
    </span>
  );
}
