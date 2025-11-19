import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

interface Settings {
  referral_bonus?: boolean
  moov_marchand_phone?: string | null
  [key: string]: any
}

export function useSettings() {
  const { data, isLoading, error } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get<Settings>("/mobcash/setting")
      return response.data
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  return {
    settings: data,
    referralBonusEnabled: data?.referral_bonus === true,
    isLoading,
    error,
  }
}

