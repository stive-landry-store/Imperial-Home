export type UserRole = 'customer' | 'admin' | 'main_admin'
export type PropertyStatus = 'draft' | 'published' | 'unpublished' | 'archived'
export type ReservationStatus =
  | 'pending'
  | 'payment_processing'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
  | 'completed'
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'cancelled'
  | 'refunded'
export type DiscountType = 'percent' | 'fixed'
export type PermissionKey =
  | 'properties'
  | 'reservations'
  | 'customers'
  | 'promotions'
  | 'payments'
  | 'documents'
  | 'chat'
  | 'administrators'

export type Amenity = {
  id: string
  slug: string
  name_en: string
  name_fr: string
  icon: string | null
}

export type PropertyImage = {
  id: string
  property_id: string
  url: string | null
  storage_path: string | null
  alt_en: string | null
  alt_fr: string | null
  sort_order: number
  is_cover: boolean
}

export type Property = {
  id: string
  slug: string
  name: string
  description_en: string
  description_fr: string
  welcome_message_en: string | null
  welcome_message_fr: string | null
  address: string
  city: string
  neighborhood: string | null
  country: string
  latitude: number | null
  longitude: number | null
  capacity: number
  bedrooms: number
  bathrooms: number
  living_areas: number
  kitchen_info_en: string | null
  kitchen_info_fr: string | null
  rules_en: string | null
  rules_fr: string | null
  safety_info_en: string | null
  safety_info_fr: string | null
  equipment_instructions_en: string | null
  equipment_instructions_fr: string | null
  check_in_time: string
  check_out_time: string
  nightly_rate_xaf: number
  recommendations_en: string | null
  recommendations_fr: string | null
  status: PropertyStatus
  property_images?: PropertyImage[]
  property_amenities?: { amenities: Amenity }[]
}

export type Promotion = {
  id: string
  name: string
  description_en: string | null
  description_fr: string | null
  discount_type: DiscountType
  discount_value: number
  starts_at: string
  ends_at: string
  is_active: boolean
  promotion_properties?: { property_id: string }[]
}

export type Profile = {
  id: string
  role: UserRole
  full_name: string
  phone: string | null
  email: string | null
  avatar_url: string | null
  cni: string | null
}

export type AdminProfile = {
  id: string
  is_verified: boolean
  is_active: boolean
  title: string | null
}

export type Reservation = {
  id: string
  public_code: string
  property_id: string
  customer_id: string
  check_in: string
  check_out: string
  guest_count: number
  nights: number
  base_amount_xaf: number
  discount_xaf: number
  total_amount_xaf: number
  promotion_id: string | null
  status: ReservationStatus
  hold_expires_at: string | null
  notes: string | null
  created_at: string
  properties?: Property
  payments?: Payment[]
  documents?: DocumentRecord[]
  profiles?: Profile
}

export type Payment = {
  id: string
  reservation_id: string
  amount_xaf: number
  currency: string
  status: PaymentStatus
  provider: string | null
  provider_reference: string | null
  confirmed_at: string | null
  failure_reason: string | null
  created_at: string
}

export type DocumentRecord = {
  id: string
  reservation_id: string
  document_type: 'housing_sheet' | 'welcome_book'
  storage_path: string
  generated_at: string
}

export type DateRange = {
  start_date: string
  end_date: string
  kind: string
}

export type Quote = {
  available: boolean
  nights: number
  nightly_rate_xaf: number
  base_amount_xaf: number
  discount_xaf: number
  total_amount_xaf: number
  promotion_name: string | null
  capacity: number
}

export type Conversation = {
  id: string
  customer_id: string
  property_id: string | null
  reservation_id: string | null
  status: string
  needs_human: boolean
  assigned_admin_id: string | null
  last_message_at: string | null
  created_at: string
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string | null
  role: 'customer' | 'assistant' | 'admin' | 'system'
  body: string
  created_at: string
  message_attachments?: { id: string; storage_path: string; mime_type: string }[]
}

export type SiteConfig = {
  brand_name: string
  phone: string
  whatsapp: string
  email: string
  city: string
  hold_minutes: string
  payment_instructions_en: string
  payment_instructions_fr: string
  home_fiche_image_url: string
  home_hero_image_url: string
}
