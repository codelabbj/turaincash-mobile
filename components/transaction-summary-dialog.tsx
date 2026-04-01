"use client"

import { useState } from "react"
import { Loader2, AlertCircle, Clock } from "lucide-react"
import toast from "react-hot-toast"
import type { Transaction } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface TransactionSummaryDialogProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  onCancel: (reference: string) => Promise<void>
  onFinalize: (reference: string) => Promise<void>
  isLoading?: boolean
  /**
   * "pending" → affiché au chargement quand un dépôt précédent est en attente.
   *   - Boutons : "Nouveau dépôt" (annule l'ancien) | "Finaliser"
   *   - Non fermable (pas de X, pas d'Escape, pas de clic extérieur)
   *
   * "created" → affiché juste après la création d'un nouveau dépôt.
   *   - Boutons : "Annuler" | "Finaliser"
   *   - Fermable normalement.
   */
  mode?: "pending" | "created"
}

export function TransactionSummaryDialog({
  isOpen,
  onClose,
  transaction,
  onCancel,
  onFinalize,
  isLoading = false,
  mode = "created",
}: TransactionSummaryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionType, setActionType] = useState<"cancel" | "finalize" | null>(null)

  if (!transaction) return null

  const isPendingMode = mode === "pending"

  const handleOpenChange = (open: boolean) => {
    if (isPendingMode) return // bloque la fermeture
    if (!open) onClose()
  }

  // ── "Nouveau dépôt" (mode pending) ────────────────────────────────────────
  const handleNewDeposit = async () => {
    if (!transaction.reference) {
      toast.error("Référence de transaction manquante")
      return
    }
    setActionType("cancel")
    setIsSubmitting(true)
    try {
      await onCancel(transaction.reference)
      // onCancel gère le toast + fermeture du dialog
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        "Erreur lors de l'annulation de la transaction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // ── "Annuler" (mode created) ───────────────────────────────────────────────
  const handleCancel = async () => {
    if (!transaction.reference) {
      toast.error("Référence de transaction manquante")
      return
    }
    setActionType("cancel")
    setIsSubmitting(true)
    try {
      await onCancel(transaction.reference)
      toast.success("Transaction annulée avec succès")
      onClose()
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        "Erreur lors de l'annulation de la transaction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // ── "Finaliser" (les deux modes) ──────────────────────────────────────────
  const handleFinalize = async () => {
    if (!transaction.reference) {
      toast.error("Référence de transaction manquante")
      return
    }
    setActionType("finalize")
    setIsSubmitting(true)
    try {
      await onFinalize(transaction.reference)
      toast.success("Transaction finalisée avec succès")
      onClose()
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        "Erreur lors de la finalisation de la transaction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      accept: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      reject: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      cancel: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
      timeout: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
    }
    const labels = {
      pending: "En attente",
      accept: "Acceptée",
      reject: "Rejetée",
      cancel: "Annulée",
      timeout: "Expirée",
    }
    return (
      <span
        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
          styles[status as keyof typeof styles] || styles.pending
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(e) => { if (isPendingMode) e.preventDefault() }}
        onPointerDownOutside={(e) => { if (isPendingMode) e.preventDefault() }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <DialogTitle>
              {isPendingMode ? "Transaction en attente" : "Récapitulatif de la transaction"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isPendingMode
              ? "Vous avez un dépôt en attente. Finalisez-le ou créez un nouveau dépôt."
              : "Votre transaction a été créée. Vous pouvez la finaliser ou l'annuler."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Statut</span>
            {getStatusBadge(transaction.status)}
          </div>

          {/* Reference */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Référence</p>
            <p className="font-mono text-sm font-semibold break-all">{transaction.reference}</p>
          </div>

          {/* Amount */}
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Montant</p>
            <p className="text-2xl font-bold text-primary">
              {transaction.amount.toLocaleString("fr-FR", {
                style: "currency",
                currency: "XOF",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>

          {/* Phone */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Téléphone</span>
            <span className="font-medium">{transaction.phone_number}</span>
          </div>

          {/* Message */}
          {transaction.message && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-300">Message</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">{transaction.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* USSD Code */}
          {transaction.ussd_code && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-300">Code USSD</p>
                  <p className="text-sm font-mono text-amber-700 dark:text-amber-400 mt-1 break-all">
                    {transaction.ussd_code}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {isPendingMode ? (
            // ── Mode pending : "Nouveau dépôt" | "Finaliser" ──────────────────
            <>
              <Button
                variant="outline"
                onClick={handleNewDeposit}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="flex-1"
              >
                {isSubmitting && actionType === "cancel" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Annulation...</>
                ) : (
                  "Nouveau dépôt"
                )}
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="flex-1"
              >
                {isSubmitting && actionType === "finalize" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalisation...</>
                ) : (
                  "Finaliser"
                )}
              </Button>
            </>
          ) : (
            // ── Mode created : "Annuler" | "Finaliser" ────────────────────────
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="flex-1"
              >
                {isSubmitting && actionType === "cancel" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Annulation...</>
                ) : (
                  "Annuler"
                )}
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="flex-1"
              >
                {isSubmitting && actionType === "finalize" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalisation...</>
                ) : (
                  "Finaliser"
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}