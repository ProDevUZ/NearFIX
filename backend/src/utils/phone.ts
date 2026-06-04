export function normalizePhone(phone: string) {
  const clean = phone.replace(/[^\d+]/g, "");

  if (clean.startsWith("+")) return clean;
  if (clean.startsWith("998")) return `+${clean}`;

  return clean;
}
