"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { ArrowDownCircle, ArrowUpCircle, LogOut, Bell, Gift, Moon, Sun, Ticket, UserCircle, MessageCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AuthGuard } from "@/components/auth-guard"
import { getUser, logout } from "@/lib/auth"
import api from "@/lib/api"
import type { Transaction } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"

function DashboardContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = getUser()
  const { referralBonusEnabled } = useSettings()
  const [adImageErrors, setAdImageErrors] = useState<Set<number>>(new Set())
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const { theme, setTheme } = useTheme()
  const [messageMenuOpen, setMessageMenuOpen] = useState(false)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const response = await api.get<{
        count: number
        results: Transaction[]
      }>("/mobcash/transaction-history", {
        params: {
          page: 1,
          page_size: 5,
        },
      })
      return response.data.results
    },
  })

  type AdvertisementEntry = {
    enable?: boolean
    image?: string
    image_url?: string
    url?: string
    banner?: string
    title?: string
    name?: string
    link?: string
  }

  type AdvertisementResponse =
    | AdvertisementEntry[]
    | {
        results?: AdvertisementEntry[]
      }
    | null
    | undefined

  // Fetch advertisements
  const { data: advertisements } = useQuery({
    queryKey: ["advertisements"],
    queryFn: async () => {
      try {
        const response = await api.get<any>("/mobcash/ann")
        const payload: AdvertisementResponse = response.data

        const entries: AdvertisementEntry[] = Array.isArray(payload)
          ? payload
          : payload && "results" in payload && Array.isArray(payload.results)
            ? payload.results
            : []

        if (!entries.length) {
          return []
        }

        // Filter and map enabled advertisements
        const enabledAds = entries
          .filter((item: AdvertisementEntry) => item?.enable === true)
          .map((item: AdvertisementEntry) => {
            const imageUrl =
              item.image ||
              item.image_url ||
              item.url ||
              item.banner ||
              null

            if (!imageUrl) {
              return null
            }

            return {
              image: imageUrl,
              title: item.title || item.name || null,
              link: item.link || item.url || null,
            }
          })
          .filter((ad): ad is { image: string; title: string | null; link: string | null } => ad !== null)

        return enabledAds
      } catch (error) {
        // Return empty array if API fails
        return []
      }
    },
  })

  // Reset current index when advertisements change
  useEffect(() => {
    if (advertisements && advertisements.length > 0) {
      setCurrentAdIndex(0)
      setAdImageErrors(new Set())
    }
  }, [advertisements])

  // Auto-play carousel
  useEffect(() => {
    if (!advertisements || advertisements.length <= 1) return

    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [advertisements])

  const handleImageError = (index: number) => {
    setAdImageErrors((prev) => new Set(prev).add(index))
  }

  const goToSlide = (index: number) => {
    setCurrentAdIndex(index)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accept":
        return <Badge className="bg-primary">{t("accept")}</Badge>
      case "reject":
        return <Badge variant="destructive">{t("reject")}</Badge>
      default:
        return <Badge variant="secondary">{t("pending")}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    return type === "deposit" ? (
      <ArrowDownCircle className="h-5 w-5 text-primary" />
    ) : (
      <ArrowUpCircle className="h-5 w-5 text-primary" />
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <header className="bg-background border-b sticky top-0 z-50 safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              <img
                src="/Turaincash-logo.png"
                alt="TurainCash Logo"
                width={65}
                height={65}
                className="object-contain"
              />
              <div className="flex-1">
                 <h1 className="text-base font-bold">TURAINCASH</h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-primary/10 hover:bg-primary/20"
                onClick={() => router.push("/notifications")}
              >
                <Bell className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-primary/10 hover:bg-primary/20"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-[10px] border-0 font-bold text-primary bg-primary/10 hover:bg-primary/20 flex items-center justify-center">
                    {user?.first_name?.[0]?.toUpperCase() || "U"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <UserCircle className="h-4 w-4 mr-2" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} variant="destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Greeting */}
        <div className="px-1">
          <p className="text-sm text-muted-foreground">
            {t("hello")}, {user?.first_name || "User"}
          </p>
        </div>
        {/* Bonus Card */}
        {referralBonusEnabled && user && user.bonus_available > 0 && (
          <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 font-medium">{t("bonusAvailable")}</p>
                  <p className="text-2xl font-bold">{user.bonus_available.toLocaleString()} FCFA</p>
                </div>
                <Gift className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advertisement Section */}
        {advertisements && advertisements.length > 0 ? (
          <Card className="shadow-sm overflow-hidden p-0 relative">
            <div className="relative w-full aspect-[16/9] bg-muted">
              {/* Carousel Container */}
              <div className="relative w-full h-full overflow-hidden">
                {advertisements.map((ad, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      index === currentAdIndex ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div
                      className="w-full h-full cursor-pointer transition-opacity hover:opacity-90 active:opacity-80"
                      onClick={() => {
                        if (ad.link) {
                          window.open(ad.link, "_blank", "noopener,noreferrer")
                        }
                      }}
                    >
                      {!adImageErrors.has(index) ? (
                        <img
                          src={ad.image}
                          alt={ad.title || "Advertisement"}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(index)}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">Publicité</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Dots Indicator */}
              {/* {advertisements.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {advertisements.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation()
                        goToSlide(index)
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentAdIndex
                          ? "w-6 bg-white"
                          : "w-2 bg-white/50 hover:bg-white/75"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )} */}
            </div>
          </Card>
        ) : (
          <Card className="shadow-sm overflow-hidden p-0">
            <div className="w-full aspect-[16/9] bg-muted flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Publicité</p>
              </div>
            </div>
          </Card>
        )}

        {/* Coupon Quick Access Card */}
        <Card className="shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-[0.98]" onClick={() => router.push("/coupon")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 rounded-full p-2">
                  <Ticket className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Mes Coupons</p>
                  <p className="text-xs text-muted-foreground">Voir mes codes promo</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8">
                Voir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className={`grid gap-2 ${referralBonusEnabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/20 dark:from-green-500/20 dark:to-green-500/30 border border-green-500/30 dark:border-green-500/50 cursor-pointer transition-all duration-200 active:scale-95 hover:shadow-md"
            onClick={() => router.push("/deposit")}
          >
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <ArrowDownCircle className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-sm text-green-600 dark:text-green-400">{t("deposit")}</span>
              </div>
              <p className="text-xs text-green-600/80 dark:text-green-400/70">Dépôt</p>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500/20 rounded-full"></div>
          </div>

          <div
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/20 dark:from-orange-500/20 dark:to-orange-500/30 border border-orange-500/30 dark:border-orange-500/50 cursor-pointer transition-all duration-200 active:scale-95 hover:shadow-md"
            onClick={() => router.push("/withdraw")}
          >
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                  <ArrowUpCircle className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-sm text-orange-600 dark:text-orange-400">{t("withdraw")}</span>
              </div>
              <p className="text-xs text-orange-600/80 dark:text-orange-400/70">Retrait</p>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500/20 rounded-full"></div>
          </div>

          {referralBonusEnabled && (
            <div
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 border border-primary/30 dark:border-primary/50 cursor-pointer transition-all duration-200 active:scale-95 hover:shadow-md"
              onClick={() => router.push("/bonus")}
            >
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Gift className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm text-primary dark:text-primary">Bonus</span>
                </div>
                <p className="text-xs text-primary/80 dark:text-primary/70">Mes Bonus</p>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary/20 rounded-full"></div>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("recentTransactions")}</CardTitle>
                {/* <CardDescription className="text-sm">Vos 5 dernières transactions</CardDescription> */}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-3 text-sm"
                onClick={() => router.push("/transactions")}
              >
                {t("viewAll")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mb-2"></div>
                <p className="text-sm">{t("loading")}</p>
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">{t("noData")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors active:bg-muted/70"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {getTypeIcon(transaction.type_trans)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {transaction.type_trans === "deposit" ? t("deposit") : t("withdraw")}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1 flex-shrink-0">
                      <p className="font-semibold text-sm">{transaction.amount.toLocaleString()} FCFA</p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Floating Message Button */}
      <Popover open={messageMenuOpen} onOpenChange={setMessageMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 z-50"
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="end" 
          className="w-56 p-2 mb-2"
          sideOffset={10}
        >
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                window.open("https://wa.me/", "_blank")
                setMessageMenuOpen(false)
              }}
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <span className="font-medium">WhatsApp</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                window.open("https://t.me/", "_blank")
                setMessageMenuOpen(false)
              }}
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.17 1.89-.896 6.46-.896 6.46s-.537 3.953-2.24 4.537c-.44.15-.78.23-1.11.23-.9 0-1.58-.33-2.22-.9l-3.08-2.27s-.45-.33.1-.73l6.64-4.12c.73-.45-.16-.7-1.12-.25l-8.28 5.22c-.73.45-1.42.22-1.42.22l-2.9-1.9s-.9-.56.62-1.12l11.5-4.42c4.5-1.68 2.1-.45 2.1-.45z" />
              </svg>
              <span className="font-medium">Telegram</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}

