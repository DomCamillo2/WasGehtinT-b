type StatusMeta = {
  label: string;
  className: string;
};

export function getRequestStatusMeta(status: string | number | null | undefined): StatusMeta {
  switch (String(status ?? "").toLowerCase()) {
    case "accepted":
      return {
        label: "Akzeptiert",
        className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "pending":
      return {
        label: "Ausstehend",
        className: "border border-amber-200 bg-amber-50 text-amber-700",
      };
    case "rejected":
      return {
        label: "Abgelehnt",
        className: "border border-rose-200 bg-rose-50 text-rose-700",
      };
    default:
      return {
        label: "Unbekannt",
        className: "border border-zinc-200 bg-zinc-100 text-zinc-600",
      };
  }
}

export function getPaymentStatusMeta(status: string | number | null | undefined): StatusMeta {
  switch (String(status ?? "").toLowerCase()) {
    case "paid":
      return {
        label: "Bezahlt",
        className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "requires_payment":
      return {
        label: "Zahlung offen",
        className: "border border-violet-200 bg-violet-50 text-violet-700",
      };
    case "pending":
      return {
        label: "In Prüfung",
        className: "border border-amber-200 bg-amber-50 text-amber-700",
      };
    case "failed":
    case "canceled":
      return {
        label: "Fehlgeschlagen",
        className: "border border-rose-200 bg-rose-50 text-rose-700",
      };
    default:
      return {
        label: "Noch offen",
        className: "border border-zinc-200 bg-zinc-100 text-zinc-600",
      };
  }
}
