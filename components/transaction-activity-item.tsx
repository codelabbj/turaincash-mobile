"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/lib/types"

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  init_payment: "En attente",
  accept: "Accepté",
  error: "Erreur",
  reject: "Rejeté",
  timeout: "Expiré",
  cancel: "Annulé",
  annuler: "Annulé",
}

function statusClass(status: string) {
  if (status === "accept") {
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  }
  if (status === "error" || status === "reject") {
    return "bg-rose-500/15 text-rose-600 dark:text-rose-400"
  }
  if (status === "timeout" || status === "cancel" || status === "annuler") {
    return "bg-slate-500/15 text-slate-600 dark:text-slate-300"
  }
  return "bg-amber-400/25 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
}

function formatPhone(phone?: string) {
  if (!phone) return ""
  return phone.startsWith("+") ? phone : `+${phone}`
}

function formatWhen(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function TransactionActivityItem({
  transaction,
  onClick,
}: {
  transaction: Transaction
  onClick: () => void
}) {
  const isDeposit = transaction.type_trans === "deposit"
  const platform = transaction.app_details?.name || String(transaction.app || "—")
  const amount = Number(transaction.amount || 0).toLocaleString("fr-FR")

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-muted/70 dark:bg-slate-800/90 border border-border/40 px-3.5 py-3.5 flex items-center gap-3 active:scale-[0.99] transition-transform"
    >
      <div
        className={cn(
          "h-11 w-11 rounded-full flex items-center justify-center shrink-0",
          isDeposit ? "bg-emerald-500" : "bg-indigo-500",
        )}
      >
        {isDeposit ? (
          <ArrowDown className="h-5 w-5 text-white" strokeWidth={2.5} />
        ) : (
          <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.5} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{platform}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {formatPhone(transaction.phone_number)} · {formatWhen(transaction.created_at)}
        </p>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <p
          className={cn(
            "font-semibold text-sm tabular-nums",
            isDeposit ? "text-emerald-500" : "text-rose-500",
          )}
        >
          {isDeposit ? "+" : "−"}
          {amount} F
        </p>
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
            statusClass(transaction.status),
          )}
        >
          {STATUS_LABEL[transaction.status] || transaction.status}
        </span>
      </div>
    </button>
  )
}
