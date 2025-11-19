"use client"

import type React from "react"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Search } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Platform } from "@/lib/types"

interface SearchUserResponse {
  UserId: number
  Name: string
  CurrencyId: number
}

function AddBetIdContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const flow = searchParams.get("flow") || "deposit"
  const returnPath =
    searchParams.get("return") || (flow === "withdraw" ? "/withdraw" : "/deposit")
  const targetStep = Number(searchParams.get("targetStep") || "3")

  const [appId, setAppId] = useState("")
  const [platformId, setPlatformId] = useState<string>(searchParams.get("platform") || "")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [searchResult, setSearchResult] = useState<SearchUserResponse | null>(null)
  const [pendingBetId, setPendingBetId] = useState<{ appId: string; platformId: string } | null>(null)

  // Fetch platforms
  const { data: platforms, isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await api.get<Platform[]>("/mobcash/plateform")
      return response.data.filter((p) => p.enable)
    },
  })

  // Search user mutation
  const searchUserMutation = useMutation({
    mutationFn: async () => {
      if (!platformId || !appId) {
        throw new Error("Veuillez sélectionner une plateforme et saisir un identifiant")
      }
      const response = await api.post<SearchUserResponse>("/mobcash/search-user", {
        app_id: platformId,
        userid: appId,
      })
      return response.data
    },
    onSuccess: (data) => {
      // Validate user exists
      if (data.UserId === 0) {
        setErrorMessage("Utilisateur non trouvé. Veuillez vérifier l'identifiant de pari.")
        setShowErrorModal(true)
        return
      }

      // Validate currency
      if (data.CurrencyId !== 27) {
        setErrorMessage("La devise de cet utilisateur n'est pas valide. Seule la devise XOF (27) est acceptée.")
        setShowErrorModal(true)
        return
      }

      // Valid user - show confirmation modal
      setSearchResult(data)
      setPendingBetId({ appId, platformId })
      setShowConfirmModal(true)
    },
    onError: (error: any) => {
      const errorData = 
        error?.originalError?.response?.data || 
        error?.response?.data || 
        error?.data
      
      // Handle field-specific errors (400 status)
      if (error?.originalError?.response?.status === 400) {
        const errorMsg = errorData?.details || errorData?.detail || errorData?.error || errorData?.message || error.message
        setErrorMessage(errorMsg || "Erreur lors de la recherche de l'utilisateur")
      } else {
        setErrorMessage(error.message || "Erreur lors de la recherche de l'utilisateur")
      }
      setShowErrorModal(true)
    },
  })

  // Add bet ID mutation
  const addBetIdMutation = useMutation({
    mutationFn: async () => {
      if (!pendingBetId) {
        throw new Error("Données manquantes")
      }
      const response = await api.post("/mobcash/user-app-id/", {
        user_app_id: pendingBetId.appId,
        app_name: pendingBetId.platformId,
      })
      return response.data
    },
    onSuccess: () => {
      const pendingData = pendingBetId
      toast.success("Identifiant de pari ajouté avec succès!")
      queryClient.invalidateQueries({ queryKey: ["bet-ids"] })
      setShowConfirmModal(false)
      setAppId("")
      setPendingBetId(null)
      setSearchResult(null)
      if (pendingData && typeof window !== "undefined") {
        const storageKey = flow === "withdraw" ? "withdrawReturnData" : "depositReturnData"
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            action: "addBet",
            platformId: pendingData.platformId,
            user_app_id: pendingData.appId,
            targetStep,
          }),
        )
      }
      router.push(returnPath)
    },
    onError: (error: any) => {
      const errorData = 
        error?.originalError?.response?.data || 
        error?.response?.data || 
        error?.data
      
      // Handle field-specific errors (400 status)
      if (error?.originalError?.response?.status === 400) {
        const errorMsg = errorData?.details || errorData?.detail || errorData?.error || errorData?.message || error.message
        toast.error(errorMsg || "Erreur lors de l'ajout de l'identifiant")
      } else {
        toast.error(error.message || "Erreur lors de l'ajout de l'identifiant")
      }
      setShowConfirmModal(false)
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    if (!appId || appId.length < 3) {
      toast.error("Veuillez saisir un identifiant valide")
      return
    }

    if (!platformId) {
      toast.error("Veuillez sélectionner une plateforme")
      return
    }

    searchUserMutation.mutate()
  }

  const handleConfirmAdd = () => {
    if (pendingBetId) {
      addBetIdMutation.mutate()
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{t("addBetId")}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Ajouter un identifiant de pari</CardTitle>
            <CardDescription>Ajoutez votre ID de compte de la plateforme de paris</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">{t("platform")}</Label>
                {loadingPlatforms ? (
                  <div className="text-sm text-muted-foreground">{t("loading")}</div>
                ) : (
                  <Select value={platformId} onValueChange={setPlatformId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une plateforme" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms?.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          <div className="flex items-center gap-2">
                            <img
                              src={platform.image || "/placeholder.svg"}
                              alt={platform.name}
                              className="w-6 h-6 object-contain"
                            />
                            {platform.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="appId">Identifiant de pari</Label>
                <Input
                  id="appId"
                  type="text"
                  placeholder="123456789"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Entrez votre ID de compte depuis votre plateforme de paris
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={searchUserMutation.isPending || addBetIdMutation.isPending}
              >
                {searchUserMutation.isPending ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                    {t("loading")}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Rechercher et ajouter
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'ajout</DialogTitle>
            <DialogDescription>
              Voulez-vous ajouter cet identifiant de pari?
            </DialogDescription>
          </DialogHeader>
          {searchResult && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nom:</span>
                <span className="font-medium">{searchResult.Name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Identifiant:</span>
                <span className="font-medium">{appId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plateforme:</span>
                <span className="font-medium">
                  {platforms?.find((p) => p.id === platformId)?.name || platformId}
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowConfirmModal(false)
                setPendingBetId(null)
                setSearchResult(null)
              }} 
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmAdd} 
              disabled={addBetIdMutation.isPending}
              className="flex-1"
            >
              {addBetIdMutation.isPending ? t("loading") : "Confirmer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-destructive">Erreur</DialogTitle>
            <DialogDescription>
              {errorMessage || "Une erreur est survenue"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowErrorModal(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AddBetIdPage() {
  return (
    <AuthGuard>
      <AddBetIdContent />
    </AuthGuard>
  )
}
