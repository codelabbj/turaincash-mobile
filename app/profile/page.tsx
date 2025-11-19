"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, UserCircle, Lock, Mail, Phone } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"

interface UserProfile {
  id: string
  bonus_available: number
  is_superuser: boolean
  username: string
  first_name: string
  last_name: string
  email: string
  is_delete: boolean
  phone: string
  otp: string | null
  otp_created_at: string | null
  is_block: boolean
  referrer_code: string | null
  referral_code: string | null
  is_active: boolean
  is_staff: boolean
  is_supperuser: boolean
  date_joined: string
  last_login: string
}

function ProfileContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form states for profile edit
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  })

  // Form states for password change
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_new_password: "",
  })

  // Fetch user profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await api.get<UserProfile>("/auth/me")
      return response.data
    },
  })

  // Update form when profile data is loaded
  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      })
    }
  }, [profile])

  // Edit profile mutation
  const editProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const response = await api.post("/auth/edit", data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success("Profil mis à jour avec succès!")
      // Update local storage user data
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
      const updatedUser = {
        ...currentUser,
        first_name: data.first_name || currentUser.first_name,
        last_name: data.last_name || currentUser.last_name,
        email: data.email || currentUser.email,
        phone: data.phone || currentUser.phone,
      }
      localStorage.setItem("user", JSON.stringify(updatedUser))
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
    },
    onError: (error: any) => {
      const errorData = 
        error?.originalError?.response?.data || 
        error?.response?.data || 
        error?.data
      
      if (error?.originalError?.response?.status === 400) {
        const errorMsg = errorData?.details || errorData?.detail || errorData?.error || errorData?.message || error.message
        toast.error(errorMsg || "Erreur lors de la mise à jour du profil")
      } else {
        toast.error(error.message || "Erreur lors de la mise à jour du profil")
      }
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      const response = await api.post("/auth/change_password", {
        old_password: data.old_password,
        new_password: data.new_password,
        confirm_new_password: data.confirm_new_password,
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Mot de passe modifié avec succès!")
      setPasswordForm({
        old_password: "",
        new_password: "",
        confirm_new_password: "",
      })
    },
    onError: (error: any) => {
      const errorData = 
        error?.originalError?.response?.data || 
        error?.response?.data || 
        error?.data
      
      if (error?.originalError?.response?.status === 400) {
        const errorMsg = errorData?.details || errorData?.detail || errorData?.error || errorData?.message || error.message
        toast.error(errorMsg || "Erreur lors du changement de mot de passe")
      } else {
        toast.error(error.message || "Erreur lors du changement de mot de passe")
      }
    },
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    editProfileMutation.mutate(profileForm)
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      toast.error("Les nouveaux mots de passe ne correspondent pas")
      return
    }

    if (passwordForm.new_password.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères")
      return
    }

    changePasswordMutation.mutate(passwordForm)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-2"></div>
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Profil</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
            <CardDescription>Modifiez vos informations personnelles</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input
                    id="first_name"
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    disabled={editProfileMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    disabled={editProfileMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  disabled={editProfileMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  disabled={editProfileMutation.isPending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={editProfileMutation.isPending}>
                {editProfileMutation.isPending ? t("loading") : "Enregistrer les modifications"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nom d'utilisateur</span>
              <span className="font-medium">{profile?.username || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date d'inscription</span>
              <span className="font-medium">
                {profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString("fr-FR") : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Dernière connexion</span>
              <span className="font-medium">
                {profile?.last_login ? new Date(profile.last_login).toLocaleDateString("fr-FR") : "N/A"}
              </span>
            </div>
            {profile?.referral_code && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Code de parrainage</span>
                <span className="font-mono font-medium text-primary">{profile.referral_code}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Changer le mot de passe
            </CardTitle>
            <CardDescription>Mettez à jour votre mot de passe pour sécuriser votre compte</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password">Ancien mot de passe</Label>
                <div className="relative">
                  <Input
                    id="old_password"
                    type={showOldPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                    disabled={changePasswordMutation.isPending}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    disabled={changePasswordMutation.isPending}
                  >
                    {showOldPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    disabled={changePasswordMutation.isPending}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={changePasswordMutation.isPending}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_new_password">Confirmer le nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirm_new_password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.confirm_new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_new_password: e.target.value })}
                    disabled={changePasswordMutation.isPending}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={changePasswordMutation.isPending}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? t("loading") : "Changer le mot de passe"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}

