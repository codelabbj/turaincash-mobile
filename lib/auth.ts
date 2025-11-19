export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  bonus_available: number
  referral_code: string
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
