"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Network } from "@/lib/types"

const COUNTRY_OPTIONS = [
  { code: "CI", name: "Côte d'Ivoire", indication: "225" },
  { code: "BF", name: "Burkina Faso", indication: "226" },
  { code: "SN", name: "Sénégal", indication: "221" },
  { code: "BJ", name: "Bénin", indication: "229" },
] as const

const DEFAULT_COUNTRY_CODE = "CI"

function AddPhoneContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const flow = searchParams.get("flow") || "deposit"
  const returnPath =
    searchParams.get("return") || (flow === "withdraw" ? "/withdraw" : "/deposit")
  const platformId = searchParams.get("platform") || ""
  const betUserAppId = searchParams.get("betUserAppId") || ""
  const targetStep = Number(searchParams.get("targetStep") || "5")

  const [phone, setPhone] = useState("")
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_COUNTRY_CODE)
  const [networkId, setNetworkId] = useState<string>("")

  // Get network from URL params
  const preselectedNetworkId = searchParams.get("network")

  // Fetch networks
  const { data: networks, isLoading: loadingNetworks } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => {
      const response = await api.get<Network[]>("/mobcash/network")
      return response.data.filter((n) => n.active_for_deposit)
    },
  })

  // Set preselected network when networks are loaded
  useEffect(() => {
    if (preselectedNetworkId && networks && !networkId) {
      setNetworkId(preselectedNetworkId)
    }
  }, [preselectedNetworkId, networks, networkId])

  // Format phone number: remove +, spaces, and all non-digit characters, keep only digits
  const formatPhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '')
  }

  // Add phone mutation
  const addPhoneMutation = useMutation({
    mutationFn: async () => {
      const digitsOnly = formatPhoneNumber(phone)
      const country = COUNTRY_OPTIONS.find((c) => c.code === countryCode) ?? COUNTRY_OPTIONS[0]
      const finalPhone = `${country.indication}${digitsOnly}`
      const response = await api.post("/mobcash/user-phone/", {
        phone: finalPhone,
        network: Number(networkId),
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Numéro de téléphone ajouté avec succès!")
      queryClient.invalidateQueries({ queryKey: ["phones"] })
      if (
        typeof window !== "undefined" &&
        networkId &&
        platformId &&
        betUserAppId
      ) {
        const storageKey = flow === "withdraw" ? "withdrawReturnData" : "depositReturnData"
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            action: "addPhone",
            platformId,
            betUserAppId,
            networkId: Number(networkId),
            phone: `${COUNTRY_OPTIONS.find((c) => c.code === countryCode)?.indication ?? COUNTRY_OPTIONS[0].indication}${formatPhoneNumber(
              phone,
            )}`,
            targetStep,
          }),
        )
      }
      router.push(returnPath)
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout du numéro")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const digitsOnly = formatPhoneNumber(phone)
    
    if (!phone || digitsOnly.length < 6) {
      toast.error("Veuillez saisir un numéro de téléphone valide")
      return
    }

    if (!networkId) {
      toast.error("Veuillez sélectionner un réseau")
      return
    }

    addPhoneMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{t("addPhone")}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Ajouter un numéro de téléphone</CardTitle>
            <CardDescription>
              {preselectedNetworkId 
                ? `Ajoutez un nouveau numéro pour ${networks?.find(n => n.id.toString() === preselectedNetworkId)?.public_name || 'le réseau sélectionné'}`
                : "Ajoutez un nouveau numéro pour vos transactions"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="network">{t("network")}</Label>
                {loadingNetworks ? (
                  <div className="text-sm text-muted-foreground">{t("loading")}</div>
                ) : preselectedNetworkId ? (
                  <div className="p-3 border rounded-md bg-muted">
                    <div className="flex items-center gap-2">
                      <img
                        src={networks?.find(n => n.id.toString() === preselectedNetworkId)?.image || "/placeholder.svg"}
                        alt={networks?.find(n => n.id.toString() === preselectedNetworkId)?.name}
                        className="w-6 h-6 object-contain"
                      />
                      <span className="font-medium">
                        {networks?.find(n => n.id.toString() === preselectedNetworkId)?.public_name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Réseau présélectionné</p>
                  </div>
                ) : (
                  <Select value={networkId} onValueChange={setNetworkId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un réseau" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks?.map((network) => (
                        <SelectItem key={network.id} value={network.id.toString()}>
                          <div className="flex items-center gap-2">
                            <img
                              src={network.image || "/placeholder.svg"}
                              alt={network.name}
                              className="w-6 h-6 object-contain"
                            />
                            {network.public_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name} (+{country.indication})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0700000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Indicatif sélectionné : +{COUNTRY_OPTIONS.find((c) => c.code === countryCode)?.indication ?? COUNTRY_OPTIONS[0].indication}
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={addPhoneMutation.isPending}>
                {addPhoneMutation.isPending ? t("loading") : "Ajouter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function AddPhonePage() {
  return (
    <AuthGuard>
      <AddPhoneContent />
    </AuthGuard>
  )
}
