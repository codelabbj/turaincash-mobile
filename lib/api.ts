import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "https://api.turaincash.com",
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (typeof window !== "undefined") {
        try {
          const refresh = localStorage.getItem("refresh_token")
          if (!refresh) {
            throw new Error("No refresh token")
          }

          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_BASE_URL || "https://api.turaincash.com"}/auth/token/refresh/`,
            { refresh },
          )

          const newToken = res.data.access
          localStorage.setItem("access_token", newToken)
          original.headers.Authorization = `Bearer ${newToken}`

          return api(original)
        } catch (refreshError) {
          // Clear tokens and redirect to login
          localStorage.clear()
          window.location.href = "/login"
          return Promise.reject(refreshError)
        }
      }
    }

    // Extract error message from backend response
    // Check for 'details' first (plural), then 'detail' (singular), then other fields
    const backendMsg =
      error.response?.data?.details ||
      error.response?.data?.detail ||
      error.response?.data?.error ||
      error.response?.data?.message ||
      (typeof error.response?.data === "string" ? error.response.data : "Une erreur est survenue. Veuillez réessayer.")

    return Promise.reject({ message: backendMsg, originalError: error })
  },
)

export default api
