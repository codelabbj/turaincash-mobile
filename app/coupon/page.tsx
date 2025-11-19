"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Check, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Coupon, PaginatedResponse } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { useState } from "react"
import toast from "react-hot-toast"

function CouponContent() {
  const { t } = useTranslation()
  const router = useRouter()
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
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Mes Coupons</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Coupons Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Mes coupons
            </CardTitle>
            <CardDescription>
              {couponData?.count || 0} coupon{(couponData?.count || 0) > 1 ? "s" : ""} disponible{(couponData?.count || 0) > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {couponLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mb-2"></div>
                <p className="text-sm">{t("loading")}</p>
              </div>
            ) : !couponData?.results || couponData.results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                <p>Aucun coupon pour le moment</p>
                <p className="text-sm mt-1">Vos coupons apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {couponData.results.map((coupon) => (
                  <div key={coupon.id} className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 hover:bg-primary/10 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {coupon.bet_app_details?.image && (
                            <img
                              src={coupon.bet_app_details.image}
                              alt={coupon.bet_app_details.name || "Platform"}
                              className="w-6 h-6 object-contain"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            {coupon.bet_app_details?.name && (
                              <p className="font-medium text-sm text-foreground">{coupon.bet_app_details.name}</p>
                            )}
                            <p className="font-mono font-bold text-lg text-primary">{coupon.code}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(coupon.created_at)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCode(coupon.code)}
                        className="flex-shrink-0"
                      >
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

