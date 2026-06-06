"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, 
  Copy, 
  Phone, 
  Calendar, 
  User,
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Smartphone,
  CreditCard,
  FileText,
  Contact
} from "lucide-react"
import { Button } from "@/components/ui/button"
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

  const getStatusIcon = (status: string | undefined) => {
    const s = status?.toLowerCase()
    switch (s) {
      case "success":
      case "completed":
      case "accept":
      case "approve":
        return (
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <CheckCircle2 size={32} className="text-white" />
            </div>
        )
      case "pending":
      case "init_payment":
        return (
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <RefreshCw size={32} className="text-gray-400 animate-[spin_3s_linear_infinite]" />
            </div>
        )
      case "failed":
      case "error":
      case "annuler":
      case "fail":
      case "reject":
        return (
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <AlertCircle size={32} className="text-white" />
            </div>
        )
      default:
        return (
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <AlertCircle size={32} className="text-gray-400" />
            </div>
        )
    }
  }

  const getStatusColor = (status: string | undefined) => {
    const s = status?.toLowerCase()
    switch (s) {
      case "success":
      case "completed":
      case "accept":
      case "approve":
        return "text-emerald-500"
      case "pending":
      case "init_payment":
        return "text-amber-500"
      case "failed":
      case "error":
      case "annuler":
      case "fail":
      case "reject":
        return "text-red-500"
      default:
        return "text-slate-500"
    }
  }

  const getStatusText = (status: string | undefined) => {
    const s = status?.toLowerCase()
    switch (s) {
      case "success":
      case "completed":
      case "accept":
      case "approve":
        return "Transaction effectuée avec succès"
      case "pending":
      case "init_payment":
        return "Transaction en cours"
      case "failed":
      case "error":
      case "annuler":
      case "fail":
      case "reject":
        return s === "annuler" ? "La transaction a été annulée" : "La transaction a échoué"
      default:
        return "Inconnu"
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] pb-12">
      {/* Header */}
      <header className="px-4 py-4 flex items-center sticky top-0 z-10 bg-slate-50/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md w-full">
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center pr-10">Détails du {transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"}</h1>
      </header>

      <main className="px-4 pb-4 w-full flex flex-col items-center">
        <div className="mt-0.5 relative">
          {getStatusIcon(transaction.status)}
        </div>

        <div className="flex items-center justify-center gap-2 mb-0">
          <h2 className={`text-lg font-bold ${getStatusColor(transaction.status)}`}>
            {getStatusText(transaction.status)}
          </h2>
        </div>
        <p className="text-gray-400 text-xs mb-2">
           {transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"} {(transaction.status?.toLowerCase() === "pending" || transaction.status?.toLowerCase() === "init_payment") ? "en cours" : ""}
        </p>
        <div className="text-2xl font-bold dark:text-white text-slate-900 mb-3">
            XOF {transaction.amount.toLocaleString()}
        </div>

        {/* Message Box */}
        <div className="w-full bg-[#EBF5FF] border-[#D1E9FF] dark:bg-blue-900/10 dark:border-blue-900/30 rounded-xl p-2 mb-3 border">
            <div className="flex items-center gap-1.5 mb-0.5">
                <AlertCircle size={14} className="text-blue-400" />
                <span className="font-bold text-[#1E3A8A] dark:text-blue-300 text-xs">Message</span>
            </div>
            <p className="text-[#1E3A8A] dark:text-blue-200 text-xs leading-snug">
                {(transaction.status?.toLowerCase() === "pending" || transaction.status?.toLowerCase() === "init_payment") ? `${transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"} en cours` : "Paiement effectué avec succès."}
            </p>
        </div>

        {/* USSD Box */}
        {(transaction.status?.toLowerCase() === "pending" || transaction.status?.toLowerCase() === "init_payment") && transaction.ussd_code && (
            <div className="w-full bg-[#EBF5FF] border-[#D1E9FF] dark:bg-blue-900/10 dark:border-blue-900/30 rounded-xl p-2 mb-3 border">
                <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                        <Smartphone size={14} className="text-blue-400" />
                        <span className="font-bold text-[#1E3A8A] dark:text-blue-300 text-xs">Paiement USSD</span>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-white/50 dark:bg-black/20 p-2.5 rounded-lg border border-blue-200/50 dark:border-blue-900/30">
                    <span className="font-mono text-base sm:text-lg font-bold tracking-widest dark:text-white text-slate-900 break-all">
                        {transaction.ussd_code}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                        <button
                            onClick={() => window.location.href = `tel:${encodeURIComponent(transaction.ussd_code!)}`}
                            className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-blue-600 text-white rounded-md text-[11px] sm:text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                            <Phone size={12} fill="white" />
                            Appeler
                        </button>
                        <button
                            onClick={() => handleCopy(transaction.ussd_code!)}
                            className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-md border text-[11px] sm:text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border-blue-100 bg-white text-blue-600 dark:border-slate-800 dark:bg-slate-800 dark:text-blue-400"
                        >
                            <Copy size={12} />
                            Copier
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Transaction Link */}
        {(transaction.status?.toLowerCase() === "pending" || transaction.status?.toLowerCase() === "init_payment") && transaction.transaction_link && (
            <div className="w-full mb-4">
                <a
                    href={transaction.transaction_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold transition-all shadow-lg flex items-center justify-center gap-3"
                >
                    Continuer le paiement
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </div>
        )}

        {/* Details Card */}
        <div className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Informations du {transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"}
            </h3>
            <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                    <span className="text-gray-400 text-xs">Type</span>
                    <span className="font-bold uppercase text-xs dark:text-white text-slate-900">{transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"}</span>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white overflow-hidden p-1">
                        {transaction.app_details?.image ? (
                            <img src={transaction.app_details.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <CreditCard size={16} />
                        )}
                        </div>
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Application</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">{transaction.app_details?.name || transaction.app || "N/A"}</span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <Phone className="text-gray-400" size={16} />
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Numéro</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">{transaction.phone_number}</span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 text-gray-400">
                        <span className="font-bold text-lg">$</span>
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Montant</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">XOF {transaction.amount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <FileText className="text-gray-400" size={16} />
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Référence</span>
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm dark:text-white text-slate-900 truncate max-w-[180px]">{transaction.reference}</span>
                            <button onClick={() => handleCopy(transaction.reference)} className="text-blue-400 hover:text-blue-500">
                                <Copy size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <Calendar className="text-gray-400" size={16} />
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Date</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">
                            {formatDate(transaction.created_at)}
                        </span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <Contact className="text-gray-400" size={16} />
                    </div>
                    <div className="flex flex-col flex-1">
                        <span className="text-gray-400 text-[10px]">{transaction.app || "App"} ID</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">{transaction.user_app_id || "N/A"}</span>
                    </div>
                </div>

            </div>
        </div>

        <button
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
            className="w-full py-3 bg-[#ffdedb] hover:bg-[#ffcfcc] text-[#ff6b62] rounded-xl text-base font-bold transition-colors shadow-sm mt-3"
        >
            Contacter le support
        </button>

        <button
            onClick={() => router.push("/transactions")}
            className="w-full py-3 bg-[#ffdedb] hover:bg-[#ffcfcc] text-[#ff6b62] rounded-xl text-base font-bold transition-colors shadow-sm mt-3 mb-8"
        >
            Retour à l'historique
        </button>

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
