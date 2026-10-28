"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Check, Ticket, Sparkles, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Coupon, PaginatedResponse } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { useState } from "react"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

type PredictionCard = {
  id: number
  competition: { id: number; slug: string; name: string; logo?: string }
  home: { id: number; name: string; logo: string }
  away: { id: number; name: string; logo: string }
  status: string
  status_label: string
  kickoff_at: string
  score_home: number | null
  score_away: number | null
  best_market_label: string
  best_market_prob: number
  best_pari: { label: string; market: string; probability: number }
  outcome: "pending" | "won" | "lost" | "void"
  outcome_label: string | null
  confidence_level: string
}

type TodayResponse = {
  date: string
  count: number
  groups: {
    competition: { id: number; slug: string; name: string; logo?: string }
    predictions: PredictionCard[]
  }[]
  locked?: boolean
  code?: string
  detail?: string
}

function PronosTab() {
  const router = useRouter()
  const { data, isLoading, error } = useQuery<TodayResponse>({
    queryKey: ["predictions-today"],
    queryFn: async () => {
      const response = await api.get<TodayResponse>("/api/v1/predictions/today/")
      return response.data
    },
    staleTime: (query) => (query.state.data as TodayResponse | undefined)?.locked ? 15_000 : 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mb-2" />
        <p className="text-sm">Chargement des analyses…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm px-4">
        Impossible de charger les pronos. Réessayez plus tard.
      </div>
    )
  }

  if (data?.locked) {
    return (
      <div className="text-center py-12 px-4">
        <Lock className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-70" />
        <p className="text-muted-foreground max-w-sm mx-auto">
          {data.detail ||
            "Pour voir les pronos, effectuez un dépôt ou un retrait au cours des 7 derniers jours."}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button onClick={() => router.push("/deposit")}>Faire un dépôt</Button>
          <Button variant="outline" onClick={() => router.push("/withdraw")}>
            Faire un retrait
          </Button>
        </div>
      </div>
    )
  }

  if (!data?.groups?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-40" />
        <p>Aucun prono pour aujourd&apos;hui</p>
        <p className="text-sm mt-1">Revenez après la génération du matin</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {data.groups.map((group) => (
        <section key={group.competition.slug}>
          <h2 className="text-sm font-semibold tracking-wider uppercase text-sky-400 mb-3 px-1">
            {group.competition.name}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.predictions.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border border-slate-700/80 bg-slate-900/90 text-slate-100 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>{group.competition.name}</span>
                  <span className="font-semibold text-slate-200">{p.status_label}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    {p.home.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.home.logo} alt="" className="w-7 h-7 object-contain" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-700" />
                    )}
                    <span className="flex-1 text-sm font-medium truncate">{p.home.name}</span>
                    <span className="tabular-nums font-semibold w-6 text-right">
                      {p.score_home ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.away.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.away.logo} alt="" className="w-7 h-7 object-contain" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-700" />
                    )}
                    <span className="flex-1 text-sm font-medium truncate">{p.away.name}</span>
                    <span className="tabular-nums font-semibold w-6 text-right">
                      {p.score_away ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-teal-400 font-semibold mb-1">
                      Meilleur pari
                    </p>
                    <span className="inline-flex items-center rounded-md border border-emerald-500/60 px-2 py-1 text-xs font-medium text-emerald-300">
                      {p.best_pari?.label || p.best_market_label}
                    </span>
                  </div>
                  {p.outcome_label && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        p.outcome === "won" && "bg-emerald-500 text-white",
                        p.outcome === "lost" && "bg-rose-500 text-white",
                        p.outcome === "void" && "bg-slate-500 text-white",
                      )}
                    >
                      {p.outcome_label}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

    </div>
  )
}

function CodesTab() {
  const { t } = useTranslation()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const { data: couponData, isLoading: couponLoading } = useQuery<PaginatedResponse<Coupon>>({
    queryKey: ["coupons"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Coupon>>("/mobcash/coupon")
      return response.data
    },
  })

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success("Code copié!")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Codes coupons
        </CardTitle>
        <CardDescription>
          {couponData?.count || 0} code{(couponData?.count || 0) > 1 ? "s" : ""} bookmaker
        </CardDescription>
      </CardHeader>
      <CardContent>
        {couponLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mb-2" />
            <p className="text-sm">{t("loading")}</p>
          </div>
        ) : !couponData?.results || couponData.results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>Aucun code pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {couponData.results.map((coupon) => (
              <div
                key={coupon.id}
                className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {coupon.bet_app_details?.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coupon.bet_app_details.image}
                          alt={coupon.bet_app_details.name || "Platform"}
                          className="w-6 h-6 object-contain"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        {coupon.bet_app_details?.name && (
                          <p className="font-medium text-sm">{coupon.bet_app_details.name}</p>
                        )}
                        <p className="font-mono font-bold text-lg text-primary">{coupon.code}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(coupon.created_at)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCopyCode(coupon.code)}>
                    {copiedCode === coupon.code ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copié
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copier
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CouponContent() {
  const router = useRouter()
  const [tab, setTab] = useState<"pronos" | "codes">("pronos")

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Pronos</h1>
        </div>
        <div className="container mx-auto px-4 pb-3 flex gap-2">
          <Button
            size="sm"
            variant={tab === "pronos" ? "default" : "outline"}
            onClick={() => setTab("pronos")}
          >
            Aujourd&apos;hui
          </Button>
          <Button
            size="sm"
            variant={tab === "codes" ? "default" : "outline"}
            onClick={() => setTab("codes")}
          >
            Codes coupons
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {tab === "pronos" ? <PronosTab /> : <CodesTab />}
      </main>
    </div>
  )
}

export default function CouponPage() {
  return (
    <AuthGuard>
      <CouponContent />
    </AuthGuard>
  )
}
