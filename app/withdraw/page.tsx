"use client"

import { useState, useEffect, MouseEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Plus, Pencil, Trash } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Platform, Network, UserPhone, UserAppId } from "@/lib/types"

const COUNTRY_OPTIONS = [
  { code: "CI", name: "Côte d'Ivoire", indication: "225" },
  { code: "BF", name: "Burkina Faso", indication: "226" },
  { code: "SN", name: "Sénégal", indication: "221" },
  { code: "BJ", name: "Bénin", indication: "229" },
] as const

const DEFAULT_COUNTRY_CODE = "CI"
function WithdrawContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()

  type WithdrawReturnData =
    | {
        action: "addBet"
        platformId: string
        user_app_id: string
        targetStep?: number
      }
    | {
        action: "addPhone"
        platformId: string
        betUserAppId: string
        networkId: number
        phone: string
        targetStep?: number
      }

  type SearchUserResponse = {
    UserId: number
    Name: string
    CurrencyId: number
  }

  // Step state
  const [step, setStep] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedBetId, setSelectedBetId] = useState<UserAppId | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)
  const [selectedPhone, setSelectedPhone] = useState<UserPhone | null>(null)
  const [amount, setAmount] = useState("")
  const [withdrawalCode, setWithdrawalCode] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [returnData, setReturnData] = useState<WithdrawReturnData | null>(null)
  const [betEditDialogOpen, setBetEditDialogOpen] = useState(false)
  const [betToEdit, setBetToEdit] = useState<UserAppId | null>(null)
  const [betEditValue, setBetEditValue] = useState("")
  const [betEditError, setBetEditError] = useState<string | null>(null)
  const [phoneEditDialogOpen, setPhoneEditDialogOpen] = useState(false)
  const [phoneToEdit, setPhoneToEdit] = useState<UserPhone | null>(null)
  const [phoneEditValue, setPhoneEditValue] = useState("")
  const [phoneEditError, setPhoneEditError] = useState<string | null>(null)
  const [phoneEditCountry, setPhoneEditCountry] = useState<string>(DEFAULT_COUNTRY_CODE)
  const [betDeleteDialogOpen, setBetDeleteDialogOpen] = useState(false)
  const [betToDelete, setBetToDelete] = useState<UserAppId | null>(null)
  const [phoneDeleteDialogOpen, setPhoneDeleteDialogOpen] = useState(false)
  const [phoneToDelete, setPhoneToDelete] = useState<UserPhone | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("withdrawReturnData")
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as WithdrawReturnData
        setReturnData(parsed)
      } catch (error) {
        console.error("Failed to parse withdrawReturnData", error)
      }
      window.localStorage.removeItem("withdrawReturnData")
    }
  }, [])

  // Fetch platforms
  const { data: platforms, isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await api.get<Platform[]>("/mobcash/plateform")
      return response.data.filter((p) => p.enable)
    },
  })

  // Fetch bet IDs
  const { data: betIds, isLoading: loadingBetIds } = useQuery({
    queryKey: ["bet-ids", selectedPlatform?.id],
    queryFn: async () => {
      if (!selectedPlatform) return []
      const response = await api.get<UserAppId[]>("/mobcash/user-app-id", {
        params: { app_name: selectedPlatform.id },
      })
      return response.data
    },
    enabled: !!selectedPlatform,
  })

  // Fetch networks
  const { data: networks, isLoading: loadingNetworks } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => {
      const response = await api.get<Network[]>("/mobcash/network")
      return response.data.filter((n) => n.active_for_with)
    },
    enabled: !!selectedPlatform,
  })

  const selectedNetworkKey =
    selectedNetwork?.uid || (selectedNetwork?.id ? String(selectedNetwork.id) : undefined)

  // Fetch phones filtered by selected network
  const { data: phones, isLoading: loadingPhones } = useQuery({
    queryKey: ["phones", selectedNetworkKey],
    queryFn: async () => {
      if (!selectedNetworkKey) return []
      const response = await api.get<UserPhone[]>("/mobcash/user-phone/", {
        params: { network: selectedNetwork?.uid || selectedNetwork?.id },
      })
      return response.data
    },
    enabled: !!selectedNetworkKey,
  })

  // Format phone number: remove +, spaces, and all non-digit characters, keep only digits
  const formatPhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '')
  }

  const getCountryOption = (code: string) =>
    COUNTRY_OPTIONS.find((country) => country.code === code) ?? COUNTRY_OPTIONS[0]

  const detectCountryFromPhone = (phoneValue: string) => {
    const digits = formatPhoneNumber(phoneValue)
    return (
      COUNTRY_OPTIONS.find((country) => digits.startsWith(country.indication))?.code ||
      DEFAULT_COUNTRY_CODE
    )
  }

  const stripCountryPrefix = (phoneValue: string, countryCode: string) => {
    const digits = formatPhoneNumber(phoneValue)
    const country = getCountryOption(countryCode)
    if (digits.startsWith(country.indication)) {
      return digits.slice(country.indication.length)
    }
    return digits
  }

  const resetBetEditDialog = () => {
    setBetEditDialogOpen(false)
    setBetToEdit(null)
    setBetEditValue("")
    setBetEditError(null)
  }

  const resetPhoneEditDialog = () => {
    setPhoneEditDialogOpen(false)
    setPhoneToEdit(null)
    setPhoneEditValue("")
    setPhoneEditError(null)
    setPhoneEditCountry(DEFAULT_COUNTRY_CODE)
  }

  const resetBetDeleteDialog = () => {
    setBetDeleteDialogOpen(false)
    setBetToDelete(null)
  }

  const resetPhoneDeleteDialog = () => {
    setPhoneDeleteDialogOpen(false)
    setPhoneToDelete(null)
  }


  const betEditMutation = useMutation({
    mutationFn: async ({ bet, value }: { bet: UserAppId; value: string }) => {
      const trimmedValue = value.trim()
      if (!trimmedValue) {
        throw new Error("Veuillez saisir un identifiant valide")
      }

      const platformId = selectedPlatform?.id || bet.app
      if (!platformId) {
        throw new Error("Plateforme introuvable")
      }

      const searchResponse = await api.post<SearchUserResponse>("/mobcash/search-user", {
        app_id: platformId,
        userid: trimmedValue,
      })
      const searchResult = searchResponse.data

      if (searchResult.UserId === 0) {
        throw new Error("Utilisateur non trouvé. Vérifiez l'identifiant.")
      }

      if (searchResult.CurrencyId !== 27) {
        throw new Error("La devise de cet utilisateur n'est pas XOF (27).")
      }

      await api.patch(`/mobcash/user-app-id/${bet.id}/`, {
        user_app_id: trimmedValue,
        app_name: platformId,
      })
    },
    onSuccess: () => {
      toast.success("Identifiant mis à jour")
      queryClient.invalidateQueries({ queryKey: ["bet-ids"] })
      resetBetEditDialog()
    },
    onError: (error: any) => {
      const apiError =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        "Erreur lors de la mise à jour de l'identifiant"
      setBetEditError(apiError)
    },
  })

  const deleteBetMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/mobcash/user-app-id/${id}/`)
    },
    onSuccess: () => {
      toast.success("Identifiant supprimé")
      queryClient.invalidateQueries({ queryKey: ["bet-ids"] })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erreur lors de la suppression de l'identifiant")
    },
  })

  const updatePhoneMutation = useMutation({
    mutationFn: async ({
      id,
      value,
      networkId,
    }: {
      id: number
      value: string
      networkId: number
    }) => {
      await api.patch(`/mobcash/user-phone/${id}/`, {
        phone: value,
        network: networkId,
      })
    },
    onSuccess: () => {
      toast.success("Numéro mis à jour")
      queryClient.invalidateQueries({ queryKey: ["phones"] })
      resetPhoneEditDialog()
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        "Erreur lors de la mise à jour du numéro"
      setPhoneEditError(message)
      toast.error(message)
    },
  })

  const deletePhoneMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/mobcash/user-phone/${id}/`)
    },
    onSuccess: () => {
      toast.success("Numéro supprimé")
      queryClient.invalidateQueries({ queryKey: ["phones"] })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erreur lors de la suppression du numéro")
    },
  })

  useEffect(() => {
    if (!returnData) return
    if (!platforms) return

    const platform = platforms.find((p) => p.id === returnData.platformId)
    if (!platform) {
      setReturnData(null)
      return
    }

    if (!selectedPlatform || selectedPlatform.id !== platform.id) {
      setSelectedPlatform(platform)
      return
    }

    if (returnData.action === "addBet") {
      if (!betIds) return
      const bet = betIds.find((betId) => betId.user_app_id === returnData.user_app_id)
      if (!bet) return
      setSelectedBetId(bet)
      setStep(returnData.targetStep || 3)
      setReturnData(null)
      return
    }

    if (returnData.action === "addPhone") {
      if (!betIds) return
      const bet = betIds.find((betId) => betId.user_app_id === returnData.betUserAppId)
      if (!bet) return
      if (!selectedBetId || selectedBetId.id !== bet.id) {
        setSelectedBetId(bet)
        return
      }

      if (!networks) return
      const network = networks.find((n) => n.id === returnData.networkId)
      if (!network) return
      if (!selectedNetwork || selectedNetwork.id !== network.id) {
        setSelectedNetwork(network)
        return
      }

      if (!phones) return
      const phone = phones.find(
        (phoneItem) => formatPhoneNumber(phoneItem.phone) === returnData.phone,
      )
      if (!phone) return

      setSelectedPhone(phone)
      setStep(returnData.targetStep || 5)
      setReturnData(null)
    }
  }, [
    returnData,
    platforms,
    selectedPlatform,
    betIds,
    selectedBetId,
    networks,
    selectedNetwork,
    phones,
  ])

  const handleEditBetId = (
    event: MouseEvent<HTMLButtonElement>,
    betId: UserAppId,
  ) => {
    event.stopPropagation()
    setBetToEdit(betId)
    setBetEditValue(betId.user_app_id)
    setBetEditError(null)
    setBetEditDialogOpen(true)
  }

  const handleBetEditConfirm = () => {
    if (!betToEdit) return
    const value = betEditValue.trim()
    if (!value) {
      setBetEditError("Veuillez saisir un identifiant valide")
      return
    }
    setBetEditError(null)
    betEditMutation.mutate({ bet: betToEdit, value })
  }

  const handleDeleteBetId = (
    event: MouseEvent<HTMLButtonElement>,
    betId: UserAppId,
  ) => {
    event.stopPropagation()
    setBetToDelete(betId)
    setBetDeleteDialogOpen(true)
  }

  const handleEditPhone = (
    event: MouseEvent<HTMLButtonElement>,
    phone: UserPhone,
  ) => {
    event.stopPropagation()
    setPhoneToEdit(phone)
    const detectedCountry = detectCountryFromPhone(phone.phone)
    setPhoneEditCountry(detectedCountry)
    setPhoneEditValue(stripCountryPrefix(phone.phone, detectedCountry))
    setPhoneEditError(null)
    setPhoneEditDialogOpen(true)
  }

  const handlePhoneEditConfirm = () => {
    if (!phoneToEdit) return
    const value = phoneEditValue.trim()
    if (!value) {
      setPhoneEditError("Veuillez saisir un numéro de téléphone")
      return
    }
    const formatted = formatPhoneNumber(value)
    if (!formatted) {
      setPhoneEditError("Numéro invalide")
      return
    }
    setPhoneEditError(null)
    updatePhoneMutation.mutate({
      id: phoneToEdit.id,
      value: `${getCountryOption(phoneEditCountry).indication}${formatted}`,
      networkId: phoneToEdit.network,
    })
  }

  const handleBetDeleteConfirm = () => {
    if (!betToDelete) return
    deleteBetMutation.mutate(betToDelete.id, {
      onSuccess: () => {
        resetBetDeleteDialog()
      },
      onError: () => {
        resetBetDeleteDialog()
      },
    })
  }

  const handlePhoneDeleteConfirm = () => {
    if (!phoneToDelete) return
    deletePhoneMutation.mutate(phoneToDelete.id, {
      onSuccess: () => {
        resetPhoneDeleteDialog()
      },
      onError: () => {
        resetPhoneDeleteDialog()
      },
    })
  }

  const handleDeletePhone = (
    event: MouseEvent<HTMLButtonElement>,
    phone: UserPhone,
  ) => {
    event.stopPropagation()
    setPhoneToDelete(phone)
    setPhoneDeleteDialogOpen(true)
  }

  // Submit withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      const formattedPhone = formatPhoneNumber(selectedPhone!.phone)
      const payload: any = {
        amount: Number(amount),
        phone_number: formattedPhone,
        app: selectedPlatform!.id,
        user_app_id: selectedBetId!.user_app_id,
        network: selectedNetwork!.id,
        withdriwal_code: withdrawalCode,
        source: "web",
      }
      
      // Add city and street if available from platform
      if (selectedPlatform!.city) {
        payload.city = selectedPlatform!.city
      }
      if (selectedPlatform!.street) {
        payload.street = selectedPlatform!.street
      }
      
      const response = await api.post("/mobcash/transaction-withdrawal", payload)
      return response.data
    },
    onSuccess: (data) => {
      toast.success("Retrait créé avec succès! En attente de traitement.")
      router.push("/dashboard")
    },
    onError: (error: any) => {
      // Check for rate limit error (error_time_message) in multiple possible locations
      const errorData = 
        error?.originalError?.response?.data || 
        error?.response?.data || 
        error?.data
      
      const timeMessage = 
        errorData?.error_time_message ||
        error?.originalError?.response?.data?.error_time_message ||
        error?.response?.data?.error_time_message
      
      if (timeMessage) {
        const message = Array.isArray(timeMessage) 
          ? timeMessage[0] 
          : timeMessage
        toast.error(`Trop de tentatives. Veuillez réessayer dans ${message}`)
      } else {
        toast.error(error.message || "Erreur lors de la création du retrait")
      }
    },
  })

  const handleNext = () => {
    if (step === 1 && !selectedPlatform) {
      toast.error("Veuillez sélectionner une plateforme")
      return
    }
    if (step === 2 && !selectedBetId) {
      toast.error("Veuillez sélectionner un identifiant de pari")
      return
    }
    if (step === 3 && !selectedNetwork) {
      toast.error("Veuillez sélectionner un réseau")
      return
    }
    if (step === 4 && !selectedPhone) {
      toast.error("Veuillez sélectionner un numéro de téléphone")
      return
    }
    if (step === 5) {
      const amountNum = Number(amount)
      if (!amount || amountNum <= 0) {
        toast.error("Veuillez saisir un montant valide")
        return
      }
      if (!withdrawalCode || withdrawalCode.length < 4) {
        toast.error("Veuillez saisir un code de retrait valide")
        return
      }
      if (selectedPlatform && amountNum < selectedPlatform.minimun_with) {
        toast.error(`Le montant minimum est ${selectedPlatform.minimun_with} FCFA`)
        return
      }
      if (selectedPlatform && amountNum > selectedPlatform.max_win) {
        toast.error(`Le montant maximum est ${selectedPlatform.max_win} FCFA`)
        return
      }
      setShowConfirmDialog(true)
      return
    }
    setStep(step + 1)
  }

  const handleConfirm = () => {
    setShowConfirmDialog(false)
    withdrawalMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <header className="bg-background border-b sticky top-0 z-50 safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => (step > 1 ? setStep(step - 1) : router.push("/dashboard"))}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{t("withdraw")}</h1>
              <p className="text-sm text-muted-foreground">Étape {step} sur 5</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
          </div>
        </div>
      </header>


      <main className="px-4 py-4 space-y-4">
        {/* Step 1: Select Platform */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("selectPlatform")}</CardTitle>
              <CardDescription>Choisissez votre plateforme de paris</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPlatforms ? (
                <div className="text-center py-8">{t("loading")}</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {platforms?.map((platform) => (
                    <div
                      key={platform.id}
                      onClick={() => {
                        setSelectedPlatform(platform)
                        setTimeout(() => setStep(2), 100)
                      }}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPlatform?.id === platform.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {selectedPlatform?.id === platform.id && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <img
                        src={platform.image || "/placeholder.svg"}
                        alt={platform.name}
                        className="w-full h-16 object-contain mb-2"
                      />
                      <p className="text-center font-medium text-sm">{platform.name}</p>
                      <p className="text-center text-xs text-muted-foreground mt-1">
                        {platform.minimun_with} - {platform.max_win} FCFA
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Bet ID */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("selectBetId")}</CardTitle>
              <CardDescription>Choisissez votre identifiant de pari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingBetIds ? (
                <div className="text-center py-8">{t("loading")}</div>
              ) : (
                <>
                  <div className="space-y-2">
                    {betIds?.map((betId) => (
                      <div
                        key={betId.id}
                        onClick={() => {
                          setSelectedBetId(betId)
                          setTimeout(() => setStep(3), 100)
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedBetId?.id === betId.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{betId.user_app_id}</p>
                            <p className="text-sm text-muted-foreground">ID de pari</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {selectedBetId?.id === betId.id && (
                              <div className="bg-primary rounded-full p-1">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={(event) => handleEditBetId(event, betId)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(event) => handleDeleteBetId(event, betId)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => {
                      if (!selectedPlatform) {
                        toast.error("Veuillez sélectionner une plateforme")
                        return
                      }
                      const params = new URLSearchParams({
                        platform: selectedPlatform.id,
                        flow: "withdraw",
                        return: "/withdraw",
                        targetStep: "3",
                      })
                      router.push(`/add-bet-id?${params.toString()}`)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addBetId")}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Network */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("selectNetwork")}</CardTitle>
              <CardDescription>Choisissez votre réseau de paiement</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingNetworks ? (
                <div className="text-center py-8">{t("loading")}</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {networks?.map((network) => (
                    <div
                      key={network.id}
                      onClick={() => {
                        setSelectedNetwork(network)
                        setTimeout(() => setStep(4), 100)
                      }}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedNetwork?.id === network.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {selectedNetwork?.id === network.id && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <img
                        src={network.image || "/placeholder.svg"}
                        alt={network.name}
                        className="w-full h-16 object-contain mb-2"
                      />
                      <p className="text-center font-medium text-sm">{network.public_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Select Phone */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("selectPhone")}</CardTitle>
              <CardDescription>Choisissez votre numéro de téléphone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPhones ? (
                <div className="text-center py-8">{t("loading")}</div>
              ) : (
                <>
                  {phones && phones.length > 0 ? (
                    <div className="space-y-2">
                      {phones.map((phone) => (
                        <div
                          key={phone.id}
                          onClick={() => {
                            setSelectedPhone(phone)
                            setTimeout(() => setStep(5), 100)
                          }}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedPhone?.id === phone.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{phone.phone}</p>
                              <p className="text-sm text-muted-foreground">Numéro de téléphone</p>
                            </div>
                          <div className="flex items-center gap-1">
                            {selectedPhone?.id === phone.id && (
                              <div className="bg-primary rounded-full p-1">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={(event) => handleEditPhone(event, phone)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(event) => handleDeletePhone(event, phone)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Aucun numéro de téléphone disponible pour {selectedNetwork?.public_name}</p>
                      <p className="text-sm mt-2">Ajoutez un nouveau numéro ci-dessous</p>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full bg-transparent" 
                    onClick={() => {
                      if (!selectedPlatform || !selectedBetId || !selectedNetwork) {
                        toast.error("Veuillez sélectionner une plateforme, un identifiant et un réseau")
                        return
                      }
                      const params = new URLSearchParams({
                        network: selectedNetwork.id.toString(),
                        platform: selectedPlatform.id,
                        betUserAppId: selectedBetId.user_app_id,
                        flow: "withdraw",
                        return: "/withdraw",
                        targetStep: "5",
                      })
                      router.push(`/add-phone?${params.toString()}`)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addPhone")} ({selectedNetwork?.public_name})
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 5: Enter Amount and Withdrawal Code */}
        {step === 5 && (
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="mobile-heading">{t("enterAmount")}</CardTitle>
              <CardDescription className="mobile-text">
                Montant: {selectedPlatform?.minimun_with} - {selectedPlatform?.max_win} FCFA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="amount" className="mobile-text font-medium">{t("amount")} (FCFA)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mobile-input text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="withdrawalCode" className="mobile-text font-medium">{t("withdrawalCode")}</Label>
                <Input
                  id="withdrawalCode"
                  type="text"
                  placeholder="1234"
                  value={withdrawalCode}
                  onChange={(e) => setWithdrawalCode(e.target.value)}
                  className="mobile-input text-lg"
                />
                <p className="mobile-text text-muted-foreground">
                  Entrez le code de retrait fourni par votre plateforme de paris
                </p>
              </div>

              {selectedPlatform?.withdrawal_tuto_link && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(selectedPlatform.withdrawal_tuto_link!, "_blank", "noopener,noreferrer")}
                >
                  Comment retirer
                </Button>
              )}

              {/* Summary */}
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("platform")}</span>
                  <span className="font-medium">{selectedPlatform?.name}</span>
                </div>
                {selectedPlatform?.city && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ville</span>
                    <span className="font-medium">{selectedPlatform.city}</span>
                  </div>
                )}
                {selectedPlatform?.street && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rue</span>
                    <span className="font-medium">{selectedPlatform.street}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID de pari</span>
                  <span className="font-medium">{selectedBetId?.user_app_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("network")}</span>
                  <span className="font-medium">{selectedNetwork?.public_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("phone")}</span>
                  <span className="font-medium">{selectedPhone?.phone}</span>
                </div>
              </div>

              {/* Network Withdrawal Message */}
              {selectedNetwork?.withdrawal_message && selectedNetwork.withdrawal_message.trim() !== "" && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-line">
                    {selectedNetwork.withdrawal_message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-11">
              {t("previous")}
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1 h-11">
            {step === 5 ? t("confirm") : t("next")}
          </Button>
        </div>
      </main>

      {/* Bet ID Edit Dialog */}
      <Dialog open={betEditDialogOpen} onOpenChange={(open) => (!open ? resetBetEditDialog() : setBetEditDialogOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'identifiant</DialogTitle>
            <DialogDescription>
              Recherchez et validez l'identifiant avant de l'enregistrer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="withdrawBetEditValue">Identifiant de pari</Label>
            <Input
              id="withdrawBetEditValue"
              value={betEditValue}
              onChange={(event) => setBetEditValue(event.target.value)}
            />
            {betEditError && <p className="text-sm text-destructive">{betEditError}</p>}
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={resetBetEditDialog} className="flex-1">
              {t("cancel")}
            </Button>
            <Button
              onClick={handleBetEditConfirm}
              disabled={betEditMutation.isPending}
              className="flex-1"
            >
              {betEditMutation.isPending ? t("loading") : "Mettre à jour"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Edit Dialog */}
      <Dialog open={phoneEditDialogOpen} onOpenChange={(open) => (!open ? resetPhoneEditDialog() : setPhoneEditDialogOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le numéro</DialogTitle>
            <DialogDescription>
              Actualisez votre numéro pour ce réseau.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="withdrawPhoneEditValue">{t("phone")}</Label>
            <div className="flex gap-2">
              <Select value={phoneEditCountry} onValueChange={setPhoneEditCountry}>
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
                id="withdrawPhoneEditValue"
                value={phoneEditValue}
                onChange={(event) => setPhoneEditValue(event.target.value)}
                placeholder="0700000000"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Indicatif sélectionné : +{getCountryOption(phoneEditCountry).indication}
            </p>
            {phoneEditError && <p className="text-sm text-destructive">{phoneEditError}</p>}
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={resetPhoneEditDialog} className="flex-1">
              {t("cancel")}
            </Button>
            <Button
              onClick={handlePhoneEditConfirm}
              disabled={updatePhoneMutation.isPending}
              className="flex-1"
            >
              {updatePhoneMutation.isPending ? t("loading") : "Mettre à jour"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bet Delete Dialog */}
      <Dialog open={betDeleteDialogOpen} onOpenChange={(open) => (!open ? resetBetDeleteDialog() : setBetDeleteDialogOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'identifiant</DialogTitle>
            <DialogDescription>
              Cette action est définitive. Confirmez-vous la suppression ?
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{betToDelete?.user_app_id}</p>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={resetBetDeleteDialog} className="flex-1">
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBetDeleteConfirm}
              disabled={deleteBetMutation.isPending}
              className="flex-1"
            >
              {deleteBetMutation.isPending ? t("loading") : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Delete Dialog */}
      <Dialog open={phoneDeleteDialogOpen} onOpenChange={(open) => (!open ? resetPhoneDeleteDialog() : setPhoneDeleteDialogOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le numéro</DialogTitle>
            <DialogDescription>
              Cette action est définitive. Confirmez-vous la suppression ?
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{phoneToDelete?.phone}</p>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={resetPhoneDeleteDialog} className="flex-1">
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handlePhoneDeleteConfirm}
              disabled={deletePhoneMutation.isPending}
              className="flex-1"
            >
              {deletePhoneMutation.isPending ? t("loading") : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le retrait</DialogTitle>
            <DialogDescription>Veuillez vérifier les informations avant de confirmer</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("platform")}</span>
              <span className="font-medium">{selectedPlatform?.name}</span>
            </div>
            {selectedPlatform?.city && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ville</span>
                <span className="font-medium">{selectedPlatform.city}</span>
              </div>
            )}
            {selectedPlatform?.street && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rue</span>
                <span className="font-medium">{selectedPlatform.street}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID de pari</span>
              <span className="font-medium">{selectedBetId?.user_app_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("network")}</span>
              <span className="font-medium">{selectedNetwork?.public_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("phone")}</span>
              <span className="font-medium">{selectedPhone?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("withdrawalCode")}</span>
              <span className="font-medium">{withdrawalCode}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>{t("amount")}</span>
              <span className="text-primary">{amount} FCFA</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={withdrawalMutation.isPending} className="flex-1">
              {withdrawalMutation.isPending ? t("loading") : t("confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function WithdrawPage() {
  return (
    <AuthGuard>
      <WithdrawContent />
    </AuthGuard>
  )
}
