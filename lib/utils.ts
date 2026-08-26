import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(amount)
}

/** True si la plateforme est BetMomo (pas de search-user côté front). */
export function isBetMomoPlatform(
  platform?: { name?: string | null; public_name?: string | null } | null,
): boolean {
  if (!platform) return false
  const normalize = (value?: string | null) =>
    (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  const name = normalize(platform.name)
  const publicName = normalize(platform.public_name)
  return name === "BETMOMO" || publicName === "BETMOMO"
}
