"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, 
  Info, 
  Copy, 
  Phone, 
  DollarSign, 
  Receipt, 
  Calendar, 
  User,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Transaction, Network } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { getTransactionStatusLabel } from "@/lib/constants"
import toast from "react-hot-toast"
import { Suspense } from "react"
import { getUser } from "@/lib/auth"

function TransactionDetailContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const user = getUser()

  // Fetch networks to get the names and images
  const { data: networks } = useQuery({
    queryKey: ["networks-all"],
    queryFn: async () => {
      const response = await api.get<Network[]>("/mobcash/network")
      return response.data
    },
  })

  // Fetch settings for support phone
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/mobcash/setting")
      return response.data
    },
  })

  // Fetch the specific transaction
  const { data: transaction, isLoading, error } = useQuery({
    queryKey: ["transaction", id],
    queryFn: async () => {
      if (!id) throw new Error("ID requis")
      
      // First try sessionStorage
      try {
        const cached = sessionStorage.getItem('cached_transaction')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (String(parsed.id) === String(id) || String(parsed.reference) === String(id) || String(parsed.uid) === String(id)) {
            return parsed
          }
        }
      } catch (e) {}

      // Fallback: fetch history and find the transaction without triggering a 404
      const response = await api.get<{ results: Transaction[] }>("/mobcash/transaction-history", {
        params: { page_size: 100 }
      })
      const found = response.data.results.find(t => String(t.id) === String(id) || String(t.reference) === String(id) || String(t.uid) === String(id))
      if (!found) throw new Error("Transaction not found")
      
      sessionStorage.setItem('cached_transaction', JSON.stringify(found))
      return found
    },
    enabled: !!id
  })

  if (!id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-destructive mb-4">ID de transaction manquant</p>
        <Button onClick={() => router.back()}>Retour</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-destructive mb-4">Erreur lors du chargement de la transaction</p>
        <Button onClick={() => router.back()}>Retour</Button>
      </div>
    )
  }

  const network = networks?.find(n => n.id === transaction.network)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copié dans le presse-papier")
  }

  const getStatusInfo = (status: string) => {
    const s = status.toLowerCase()
    switch (s) {
      case "accept":
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-700",
          message: "Transaction effectuée avec succès"
        }
      case "error":
      case "annuler":
      case "fail":
      case "reject":
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          message: s === "annuler" ? "La transaction a été annulée" : "La transaction a échoué"
        }
      case "init_payment":
      case "pending":
      default:
        return {
          icon: <Info className="h-5 w-5 text-blue-500" />,
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          message: "Transaction en cours"
        }
    }
  }

  const statusInfo = getStatusInfo(transaction.status)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
      {/* Header */}
      <header className="px-4 py-4 flex items-center sticky top-0 z-10 bg-white dark:bg-slate-900 border-b w-full">
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10">Détails de la transaction</h1>
      </header>

      <main className="px-4 py-4 space-y-6">
        {/* Amount Section */}
        <div className="text-center pt-2 pb-4">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            XOF {transaction.amount.toLocaleString()}
          </h2>
        </div>

        {/* Status Message Banner */}
        <div className={`rounded-3xl p-6 flex items-start gap-4 border ${statusInfo.bgColor} dark:bg-opacity-10 ${statusInfo.textColor} shadow-md`}>
          <div className="mt-1 flex-shrink-0">
             {statusInfo.icon}
          </div>
          <div>
            <p className="font-bold text-lg mb-0.5">Statut</p>
            <p className="text-sm font-medium opacity-90 leading-relaxed">{statusInfo.message}</p>
          </div>
        </div>

        {/* Transaction Information Card */}
        <Card className="border-none shadow-lg rounded-[32px] overflow-hidden bg-white dark:bg-slate-900">
          <CardContent className="p-6 space-y-7">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Détails du paiement</h3>

            <div className="space-y-6">
              {/* Application Row */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {transaction.app_details?.image ? (
                    <img src={transaction.app_details.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary text-[10px] font-bold">APP</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 border-b dark:border-slate-800 pb-3">
                  <p className="text-sm font-medium text-slate-400 mb-1">Application</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {transaction.app_details?.name || transaction.app}
                  </p>
                </div>
              </div>

              {/* Network Row */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                  {network?.image ? (
                    <img src={network.image} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Phone className="h-6 w-6 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0 border-b dark:border-slate-800 pb-3">
                  <p className="text-sm font-medium text-slate-400 mb-1">Réseau</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {network?.public_name || "N/A"}
                  </p>
                </div>
              </div>

              {/* Number Row */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0 border-b dark:border-slate-800 pb-3">
                  <p className="text-sm font-medium text-slate-400 mb-1">Numéro</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {transaction.phone_number}
                  </p>
                </div>
              </div>

              {/* Reference Row */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                  <Receipt className="h-6 w-6 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0 border-b dark:border-slate-800 pb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-400 mb-1">Référence</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white break-all leading-tight">
                      {transaction.reference}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 flex-shrink-0 rounded-full hover:bg-primary/10" 
                    onClick={() => handleCopy(transaction.reference)}
                  >
                    <Copy className="h-5 w-5 text-primary" />
                  </Button>
                </div>
              </div>

              {/* Date Row */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 border-b dark:border-slate-800 pb-3">
                  <p className="text-sm font-medium text-slate-400 mb-1">Date</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatDate(transaction.created_at)}
                  </p>
                </div>
              </div>

              {/* App ID Row */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-sm font-medium text-slate-400 mb-1">
                    Application ID
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {transaction.user_app_id}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Support Button */}
        <div className="pt-4 pb-10">
          <Button 
            className="w-full h-16 rounded-[24px] bg-primary text-primary-foreground text-xl font-bold shadow-xl flex items-center justify-center gap-3"
            onClick={() => {
              const phone = settings?.whatsapp_phone || "0594811767"
              const firstName = user?.first_name || "Utilisateur"
              const lastName = user?.last_name || ""
              const ref = transaction.reference
              const amount = transaction.amount
              const networkName = network?.public_name || "N/A"
              const phoneNumber = transaction.phone_number
              const appName = transaction.app_details?.name || transaction.app || "App"
              const appId = transaction.user_app_id || "N/A"
              const transType = transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"
              
              const message = `Bonjour moi c'est ${firstName} ${lastName}, j'ai besoin d'aide concernant mon ${transType}.\nDate: ${formatDate(transaction.created_at)}\nRéférence: ${ref}\nMontant: XOF ${amount}\nRéseau: ${networkName}\nTéléphone: ${phoneNumber}\n*${appName} ID:* ${appId}`
              
              const encodedMsg = encodeURIComponent(message)
              window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank')
            }}
          >
            <Phone className="h-6 w-6" />
            Contacter le support
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function TransactionDetailPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <TransactionDetailContent />
      </Suspense>
    </AuthGuard>
  )
}
