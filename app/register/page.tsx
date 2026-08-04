"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import toast from "react-hot-toast"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/api"
import { useSettings } from "@/hooks/use-settings"
import { GoogleButton } from "@/components/google-button"

const registerSchema = z
  .object({
    first_name: z.string().min(1, "Le prénom est requis"),
    last_name: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    phone: z.string().min(10, "Numéro de téléphone invalide"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    re_password: z.string().min(6, "Veuillez confirmer votre mot de passe"),
    referrer_code: z.string().optional(),
  })
  .refine((data) => data.password === data.re_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["re_password"],
  })

type RegisterFormData = z.infer<typeof registerSchema>

function digitsOnly(phone: string) {
  return String(phone || "").replace(/\D/g, "")
}

export default function RegisterPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { referralBonusEnabled, whatsappEnabled, isLoading: settingsLoading } = useSettings()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showWhatsappDialog, setShowWhatsappDialog] = useState(false)
  const pendingDataRef = useRef<RegisterFormData | null>(null)
  const { resolvedTheme } = useTheme()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const registerUser = async (data: RegisterFormData, whatsappVerified: boolean) => {
    const fullPhone = digitsOnly(data.phone)
    const payload: Record<string, string | boolean> = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      re_password: data.re_password,
    }

    if (referralBonusEnabled && data.referrer_code) {
      payload.referrer_code = data.referrer_code
    }

    if (whatsappEnabled && fullPhone) {
      payload.user_whatsapp_phone = fullPhone
      payload.whatsapp_verified = whatsappVerified
    }

    await api.post("/auth/registration", payload)
    setShowWhatsappDialog(false)
    pendingDataRef.current = null
    toast.success("Inscription réussie! Veuillez vous connecter.")
    router.push("/login")
  }

  const onSubmit = async (data: RegisterFormData, skipWhatsappCheck = false) => {
    setIsLoading(true)
    try {
      const fullPhone = digitsOnly(data.phone)
      let whatsappVerified = false

      if (whatsappEnabled && !skipWhatsappCheck) {
        pendingDataRef.current = data
        try {
          const checkResponse = await api.post("/auth/check-whatsapp-phone", {
            user_whatsapp_phone: fullPhone,
          })
          if (checkResponse.data?.success) {
            whatsappVerified = true
          } else {
            setShowWhatsappDialog(true)
            return
          }
        } catch (error: any) {
          const message = error?.response?.data?.message
          if (message === "NUMBER_NOT_ON_WHATSAPP" || message === "INVALID_PHONE") {
            setShowWhatsappDialog(true)
            return
          }
          if (message !== "WHATSAPP_DISABLED") {
            toast.error("Impossible de vérifier ce numéro WhatsApp. Réessayez.")
            return
          }
        }
      }

      await registerUser(data, whatsappVerified)
    } catch (error: any) {
      toast.error(error?.message || "Erreur d'inscription")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterWithoutWhatsapp = () => {
    const data = pendingDataRef.current
    if (!data) {
      setShowWhatsappDialog(false)
      return
    }
    void onSubmit(data, true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      {showWhatsappDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl border">
            <h2 className="text-lg font-bold">Numéro WhatsApp introuvable</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Ce numéro n&apos;a pas été trouvé sur WhatsApp. Vous pourrez le configurer plus tard
              dans votre profil (WhatsApp / Telegram).
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                onClick={handleRegisterWithoutWhatsapp}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Inscription...
                  </>
                ) : (
                  "Continuer"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWhatsappDialog(false)}
                disabled={isLoading}
                className="w-full"
              >
                Modifier le numéro
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <Image
              src={resolvedTheme === "dark" ? "/Turaincash-logo2.png" : "/Turaincash-logo.png"}
              alt="TurainCash Logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">TURAINCASH</CardTitle>
          <CardDescription className="text-center">{t("register")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t("firstName")}</Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="John"
                  {...register("first_name")}
                  disabled={isLoading}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">{t("lastName")}</Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Doe"
                  {...register("last_name")}
                  disabled={isLoading}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{whatsappEnabled ? "Numéro WhatsApp" : t("phone")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="2250700000000"
                {...register("phone")}
                disabled={isLoading}
              />
              {whatsappEnabled && (
                <p className="text-xs text-muted-foreground">
                  Ce numéro sera enregistré pour les notifications WhatsApp.
                </p>
              )}
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-10"
                  {...register("password")}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="re_password">{t("confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="re_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-10"
                  {...register("re_password")}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.re_password && (
                <p className="text-sm text-destructive">{errors.re_password.message}</p>
              )}
            </div>

            {referralBonusEnabled && (
              <div className="space-y-2">
                <Label htmlFor="referrer_code">Code de parrainage (optionnel)</Label>
                <Input
                  id="referrer_code"
                  type="text"
                  placeholder="Entrez un code de parrainage"
                  {...register("referrer_code")}
                  disabled={isLoading || settingsLoading}
                />
                {errors.referrer_code && (
                  <p className="text-sm text-destructive">{errors.referrer_code?.message}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || settingsLoading}>
              {isLoading ? t("loading") : t("registerButton")}
            </Button>

            <GoogleButton mode="register" disabled={isLoading || settingsLoading} />
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t("login")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
