import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

export const SETTINGS_V2 = "/mobcash/v2/setting/"

export interface Settings {
  crypto_enable?: boolean
  deposit_enable?: boolean
  withdraw_enable?: boolean
  coupon_enable?: boolean
  referral_bonus?: boolean
  moov_marchand_phone?: string | null
  orange_marchand_phone?: string | null
  use_whatsapp?: boolean
  use_telegram?: boolean
  use_sms?: boolean
  use_chatbot?: boolean
  whatsapp_phone?: string | null
  whatsapp_phone_indi?: string | null
  telegram?: string | null
  dowload_apk_link?: string | null
  [key: string]: any
}

/** WhatsApp link from settings phone (digits only), same idea as Betpay formatWhatsAppLink. */
export function formatWhatsAppLink(phone?: string | null, indicator?: string | null): string {
  if (!phone) return ""
  const cleanIndicator = (indicator || "").replace(/\D/g, "")
  const cleanPhone = String(phone).replace(/\D/g, "")
  if (!cleanPhone) return ""
  return `https://wa.me/${cleanIndicator}${cleanPhone}`
}

export function formatTelegramLink(telegram?: string | null): string {
  if (!telegram) return ""
  const value = String(telegram).trim()
  if (!value) return ""
  if (value.startsWith("http")) return value
  return `https://t.me/${value.replace(/^@/, "")}`
}

export function useSettings(options?: { forceRefresh?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<Settings>({
    queryKey: ["settings-v2"],
    queryFn: async () => {
      const response = await api.get<Settings>(SETTINGS_V2)
      return response.data || {}
    },
    staleTime: options?.forceRefresh ? 0 : 5 * 60 * 1000,
  })

  return {
    settings: data,
    referralBonusEnabled: data?.referral_bonus === true,
    chatbotEnabled: Boolean(data?.use_chatbot),
    telegramEnabled: Boolean(data?.use_telegram),
    whatsappEnabled: Boolean(data?.use_whatsapp),
    whatsappUrl: formatWhatsAppLink(
      data?.whatsapp_phone,
      data?.whatsapp_phone_indi
    ),
    telegramUrl: formatTelegramLink(data?.telegram),
    isLoading,
    error,
    refetch,
  }
}
