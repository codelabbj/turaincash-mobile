import type { TransactionType, TransactionStatus, SourceType } from './constants'

export interface Network {
  id: number
  created_at: string
  uid?: string
  name: string
  placeholder: string
  public_name: string
  country_code: string
  indication: string
  image: string
  withdrawal_message: string | null
  deposit_api: string
  withdrawal_api: string
  payment_by_link: boolean
  otp_required: boolean
  deposit_message: string
  active_for_deposit: boolean
  active_for_with: boolean
}

export interface Platform {
  id: string
  name: string
  image: string
  enable: boolean
  minimun_deposit: number
  max_deposit: number
  minimun_with: number
  max_win: number
  city?: string
  street?: string
  deposit_tuto_link?: string | null
  withdrawal_tuto_link?: string | null
}

export interface UserPhone {
  id: number
  phone: string
  network: number
  created_at: string
}

export interface UserAppId {
  id: number
  user_app_id: string
  app: string
  created_at: string
}

export interface Transaction {
  id: number
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  amount: number
  reference: string
  type_trans: TransactionType
  status: TransactionStatus
  created_at: string
  phone_number: string
  user_app_id: string
  withdriwal_code?: string
  app: string
  network: number
  source: SourceType
  app_details?: {
    id: string
    name: string
    image?: string
    enable?: boolean
    deposit_tuto_link?: string | null
    withdrawal_tuto_link?: string | null
    city?: string
    street?: string
    minimun_deposit?: number
    max_deposit?: number
    minimun_with?: number
    max_win?: number
    active_for_deposit?: boolean
    active_for_with?: boolean
  }
}

export interface Notification {
  id: number
  title: string
  content: string
  is_read: boolean
  created_at: string
  reference: string | null
}

export interface Bonus {
  id: number
  amount: string
  reason_bonus: string
  created_at: string
  user: string
}

export interface Coupon {
  id: number
  created_at: string
  code: string
  bet_app: string
  bet_app_details?: Platform
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
