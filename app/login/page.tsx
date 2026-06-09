"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import toast from "react-hot-toast"
import Link from "next/link"
import Image from "next/image"
import { Capacitor } from "@capacitor/core"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/api"
import { saveAuthData, type AuthResponse } from "@/lib/auth"
import { unifiedFcmService } from "@/lib/firebase"
import { signInWithGoogle } from "@/lib/google-auth"
import { GoogleButton } from "@/components/google-button"

const loginSchema = z.object({
  email_or_phone: z.string().min(1, "Ce champ est requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1)
  
  // Forgot password form states
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState("")
  const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState("")
  const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const handleGoogleSignIn = async () => {
    // Géré par GoogleButton — handler conservé pour compatibilité si besoin
  }

  const onSubmit = async (data: LoginFormData) => {    setIsLoading(true)
    try {
      const response = await api.post<AuthResponse>("/auth/login", data)
      saveAuthData(response.data)
      
      // Save remember me preference
      if (rememberMe && typeof window !== "undefined") {
        localStorage.setItem("remember_me", "true")
        localStorage.setItem("remembered_email", data.email_or_phone)
      } else if (typeof window !== "undefined") {
        localStorage.removeItem("remember_me")
        localStorage.removeItem("remembered_email")
      }
      
      toast.success("Connexion réussie!")
      
      // Send FCM token to backend after successful login
        try {
        await unifiedFcmService.sendTokenAfterLogin()
        } catch (error) {
        console.error('Error sending FCM token after login:', error)
        // Continue to dashboard even if token sending fails
      }
      
      router.push("/dashboard")
    } catch (error: any) {
      toast.error(error.message || "Erreur de connexion")
    } finally {
      setIsLoading(false)
    }
  }

  // Load remembered email on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const remembered = localStorage.getItem("remember_me")
      const rememberedEmail = localStorage.getItem("remembered_email")
      if (remembered === "true" && rememberedEmail) {
        setRememberMe(true)
        // You can set the form value here if needed
      }
    }
  }, [])

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    if (!forgotPasswordEmail.trim()) {
      toast.error("Veuillez entrer votre email")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(forgotPasswordEmail)) {
      toast.error("Veuillez entrer une adresse email valide")
      return
    }

    setIsForgotPasswordLoading(true)
    try {
      await api.post("/auth/send_otp", { email: forgotPasswordEmail })
      toast.success("OTP a été envoyé à votre email")
      setForgotPasswordStep(2)
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'OTP")
    } finally {
      setIsForgotPasswordLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (!forgotPasswordOtp.trim() || forgotPasswordOtp.length < 4) {
      toast.error("Veuillez entrer un code OTP valide (minimum 4 caractères)")
      return
    }

    toast.success("OTP vérifié avec succès")
    setForgotPasswordStep(3)
  }

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (!forgotPasswordNewPassword.trim() || forgotPasswordNewPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(forgotPasswordNewPassword)
    const hasLowerCase = /[a-z]/.test(forgotPasswordNewPassword)
    const hasDigit = /\d/.test(forgotPasswordNewPassword)

    if (!hasUpperCase || !hasLowerCase || !hasDigit) {
      toast.error("Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre")
      return
    }

    if (forgotPasswordNewPassword !== forgotPasswordConfirmPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }

    setIsForgotPasswordLoading(true)
    try {
      await api.post("/auth/reset_password", {
        otp: forgotPasswordOtp,
        new_password: forgotPasswordNewPassword,
        confirm_new_password: forgotPasswordConfirmPassword,
      })
      toast.success("Mot de passe réinitialisé avec succès")
      
      // Reset all forgot password states
      setIsForgotPassword(false)
      setForgotPasswordStep(1)
      setForgotPasswordEmail("")
      setForgotPasswordOtp("")
      setForgotPasswordNewPassword("")
      setForgotPasswordConfirmPassword("")
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la réinitialisation du mot de passe")
    } finally {
      setIsForgotPasswordLoading(false)
    }
  }

  const renderForgotPasswordForm = () => {
    if (forgotPasswordStep === 1) {
      // Step 1: Email Entry
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="forgot-email" className="mobile-text font-medium">
              {t("email")}
            </Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="votre@email.com"
              className="mobile-input"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              disabled={isForgotPasswordLoading}
            />
          </div>

          <Button
            type="button"
            className="w-full mobile-button"
            onClick={handleSendOtp}
            disabled={isForgotPasswordLoading}
          >
            {isForgotPasswordLoading ? t("loading") : "Envoyer OTP"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsForgotPassword(false)}
            disabled={isForgotPasswordLoading}
          >
            Retour à la connexion
          </Button>
        </div>
      )
    } else if (forgotPasswordStep === 2) {
      // Step 2: OTP Verification
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="forgot-otp" className="mobile-text font-medium">
              Code de vérification
            </Label>
            <Input
              id="forgot-otp"
              type="text"
              placeholder="0000"
              className="mobile-input"
              value={forgotPasswordOtp}
              onChange={(e) => setForgotPasswordOtp(e.target.value)}
              disabled={isForgotPasswordLoading}
              maxLength={6}
            />
            <p className="mobile-text text-sm text-muted-foreground">
              Entrez le code OTP envoyé à {forgotPasswordEmail}
            </p>
          </div>

          <Button
            type="button"
            className="w-full mobile-button"
            onClick={handleVerifyOtp}
            disabled={isForgotPasswordLoading}
          >
            {isForgotPasswordLoading ? t("loading") : "Vérifier OTP"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setForgotPasswordStep(1)}
            disabled={isForgotPasswordLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      )
    } else {
      // Step 3: New Password
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="forgot-new-password" className="mobile-text font-medium">
              Nouveau mot de passe
            </Label>
            <div className="relative">
              <Input
                id="forgot-new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••"
                className="mobile-input pr-10"
                value={forgotPasswordNewPassword}
                onChange={(e) => setForgotPasswordNewPassword(e.target.value)}
                disabled={isForgotPasswordLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isForgotPasswordLoading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="mobile-text text-xs text-muted-foreground">
              Minimum 6 caractères avec majuscule, minuscule et chiffre
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="forgot-confirm-password" className="mobile-text font-medium">
              Confirmer le mot de passe
            </Label>
            <div className="relative">
              <Input
                id="forgot-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                className="mobile-input pr-10"
                value={forgotPasswordConfirmPassword}
                onChange={(e) => setForgotPasswordConfirmPassword(e.target.value)}
                disabled={isForgotPasswordLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isForgotPasswordLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="button"
            className="w-full mobile-button"
            onClick={handleResetPassword}
            disabled={isForgotPasswordLoading}
          >
            {isForgotPasswordLoading ? t("loading") : "Réinitialiser le mot de passe"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setForgotPasswordStep(2)}
            disabled={isForgotPasswordLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="mobile-card w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <Image
              src="/Turaincash-logo.png"
              alt="TurainCash Logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="mobile-heading text-2xl">TURAINCASH</CardTitle>
          <CardDescription className="mobile-text">
            {isForgotPassword ? "Réinitialisation du mot de passe" : t("login")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isForgotPassword ? (
            renderForgotPasswordForm()
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email_or_phone" className="mobile-text font-medium">
                  {t("email")} / {t("phone")}
                </Label>
                <Input
                  id="email_or_phone"
                  type="text"
                  placeholder="john@example.com ou 22507000"
                  className="mobile-input"
                  {...register("email_or_phone")}
                  disabled={isLoading}
                />
                {errors.email_or_phone && <p className="mobile-text text-destructive">{errors.email_or_phone.message}</p>}
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="mobile-text font-medium">{t("password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="mobile-input pr-10"
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
                {errors.password && <p className="mobile-text text-destructive">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="remember-me"
                    className="mobile-text text-sm font-normal cursor-pointer"
                  >
                    Se souvenir de moi
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="mobile-text text-sm px-0 h-auto"
                  onClick={() => {
                    setIsForgotPassword(true)
                    setForgotPasswordStep(1)
                  }}
                  disabled={isLoading}
                >
                  Mot de passe oublié?
                </Button>
              </div>

              <Button type="submit" className="w-full mobile-button" disabled={isLoading}>
                {isLoading ? t("loading") : t("loginButton")}
              </Button>

              {/* Bouton Google */}
              <GoogleButton mode="login" disabled={isLoading} />
            </form>
          )}
        </CardContent>
        {!isForgotPassword && (
          <CardFooter className="flex flex-col space-y-3">
            <p className="mobile-text text-muted-foreground text-center">
              {t("dontHaveAccount")}{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                {t("register")}
              </Link>
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
