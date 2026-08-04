export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  bonus_available: number
  referral_code: string
  username?: string
  is_superuser?: boolean
  is_delete?: boolean
  otp?: string | null
  otp_created_at?: string
  is_block?: boolean
  referrer_code?: string | null
  is_active?: boolean
  is_staff?: boolean
  is_supperuser?: boolean
  date_joined?: string
  last_login?: string
  whatsapp?: boolean | string | null
  whatsapp_verified?: boolean
  user_whatsapp_phone?: string | null
  telegram_verified?: boolean
  telegram_username?: string | null
  sms_verified?: boolean
  user_sms_phone?: string | null
}

export interface AuthResponse {
  refresh: string
  access: string
  exp: string
  data: User
}

export const saveAuthData = (authData: AuthResponse) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", authData.access)
    localStorage.setItem("refresh_token", authData.refresh)
    localStorage.setItem("user", JSON.stringify(authData.data))
  }
}

export const getUser = (): User | null => {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
  }
  return null
}

export const getAccessToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token")
  }
  return null
}

export const isAuthenticated = (): boolean => {
  return !!getAccessToken()
}

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.clear()
    window.location.href = "/login"
  }
}
