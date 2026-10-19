export function formatPersonName(
  name: string | null | undefined,
  roleLabel: "Customer" | "Tailor",
  userId: string | null | undefined,
): string {
  const displayName = name?.trim() || roleLabel;
  const suffix = userId ? ` #${userId.slice(-6)}` : "";
  return `${displayName}${suffix}`;
}

export function getPersonInitials(name: string | null | undefined, fallbackId?: string | null): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length > 0) {
    return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  }
  return (fallbackId ?? "?").slice(0, 2).toUpperCase();
}
