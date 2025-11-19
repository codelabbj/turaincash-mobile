"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import toast from "react-hot-toast"
import Link from "next/link"
import Image from "next/image"
import { Capacitor } from "@capacitor/core"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/api"
import { saveAuthData, type AuthResponse } from "@/lib/auth"
import { notificationService } from "@/lib/firebase-notifications"

const loginSchema = z.object({
  email_or_phone: z.string().min(1, "Ce champ est requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const response = await api.post<AuthResponse>("/auth/login", data)
      saveAuthData(response.data)
      toast.success("Connexion réussie!")
      
      // Request notification permissions on mobile before showing dashboard
      const platform = Capacitor.getPlatform()
      if (platform === 'ios' || platform === 'android') {
        try {
          await notificationService.requestMobileNotificationPermissions()
        } catch (error) {
          console.error('Error requesting notification permissions:', error)
          // Continue to dashboard even if permission request fails
        }
      }
      
      router.push("/dashboard")
    } catch (error: any) {
      toast.error(error.message || "Erreur de connexion")
    } finally {
      setIsLoading(false)
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
          <CardDescription className="mobile-text">{t("login")}</CardDescription>
        </CardHeader>
        <CardContent>
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

            <Button type="submit" className="w-full mobile-button" disabled={isLoading}>
              {isLoading ? t("loading") : t("loginButton")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <p className="mobile-text text-muted-foreground text-center">
            {t("dontHaveAccount")}{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              {t("register")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
