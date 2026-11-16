export const formatTsh = (value: number | string) => {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return "TZS 0";
  return `TZS ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sw-TZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });