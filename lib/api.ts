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
            `${process.env.NEXT_PUBLIC_BASE_URL || "https://api.turaincash.com"}/auth/refresh`,
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

    // Handle specific HTTP status codes with default French messages
    let errorMessage = ""

    if (error.response?.status === 404) {
      errorMessage = "Ressource non trouvée. Veuillez vérifier l'URL ou contacter le support."
    } else if (error.response?.status >= 500) {
      errorMessage = "Erreur du serveur. Veuillez réessayer plus tard ou contacter le support."
    } else if (!error.response) {
      // Network error or no response
      errorMessage = "Erreur de connexion. Veuillez vérifier votre connexion internet et réessayer."
    } else {
      // For other status codes, try to extract message from backend response
      errorMessage =
        error.response?.data?.details ||
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        (typeof error.response?.data === "string" ? error.response.data : "Une erreur est survenue. Veuillez réessayer.")
    }

    return Promise.reject({ message: errorMessage, originalError: error })
  },
)

export default api
