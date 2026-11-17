export function centsToBaht(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function bahtToCents(baht: number): number {
  return Math.round(Number(baht) * 100);
}

export interface ApiEnvelope<T> {
  data: T;
  page?: {
    limit: number;
    offset: number;
    total?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  requestId?: string;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: 'user' | 'seller' | 'admin';
  blocked: boolean;
  emailVerified: boolean;
  avatarId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ShopDto {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  reviewReason?: string | null;
  shippingFeeCents: number;
  freeShippingAtCents?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  icon: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
}

export interface ProductDto {
  id: string;
  shopId: string;
  categoryId: string;
  name: string;
  englishName: string;
  description: string;
  priceCents: number;
  originalPriceCents: number;
  imageId?: string | null;
  imageIndex?: number | null;
  badge: string;
  stock: number;
  active: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  reviewCount?: number;
  shopName?: string;
  categoryName?: string;
}

export interface CartItemDto {
  productId: string;
  quantity: number;
  updatedAt: string;
  product?: ProductDto;
}

export interface CartQuoteGroupDto {
  shopId: string;
  shopName: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  items: Array<{
    productId: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
    imageIndex?: number | null;
    imageId?: string | null;
  }>;
}

export interface CartQuoteDto {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  coupon?: {
    id: string;
    code: string;
    title: string;
    percent: number;
    shopId?: string | null;
  } | null;
  couponError?: string | null;
  groups: CartQuoteGroupDto[];
}

export interface CheckoutResultDto extends CartQuoteDto {
  checkoutId: string;
  replayed: boolean;
  orders: OrderDto[];
}

export interface OrderItemDto {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  imageId?: string | null;
  imageIndex?: number | null;
}

export interface OrderEventDto {
  id: string;
  orderId: string;
  actorId?: string | null;
  actorName?: string | null;
  status: string;
  label: string;
  detail: any;
  createdAt: string;
}

export interface PaymentProofDto {
  id: string;
  orderId: string;
  uploadId: string;
  status: 'submitted' | 'approved' | 'rejected';
  reason?: string | null;
  reviewerId?: string | null;
  reviewerName?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface OrderDto {
  id: string;
  number: string;
  checkoutId: string;
  buyerId: string;
  shopId: string;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'unpaid' | 'awaiting_review' | 'rejected' | 'paid' | 'refund_pending' | 'refunded';
  paymentMethod: 'transfer' | 'development' | 'no_charge';
  addressSnapshot: {
    name: string;
    phone: string;
    address: string;
  };
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  couponCode?: string | null;
  proofUploadId?: string | null;
  paymentNote?: string | null;
  paymentDueAt?: string | null;
  paymentReference?: string | null;
  paymentReceivedAt?: string | null;
  stockReleased: boolean;
  carrier?: string | null;
  tracking?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  refundReference?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItemDto[];
  events?: OrderEventDto[];
  shopName?: string;
  buyerName?: string;
}

export interface AddressDto {
  id: string;
  userId: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionDto {
  id: string;
  code: string;
  title: string;
  shopId?: string | null;
  percent: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  minSpendCents: number;
  maxDiscountCents?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewDto {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  body: string;
  hidden: boolean;
  moderationReason?: string | null;
  reply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  text?: string;
  name?: string;
}

export interface StockMovementDto {
  id: string;
  productId: string;
  shopId: string;
  change: number;
  balance: number;
  reason: string;
  actorId?: string | null;
  actorName?: string | null;
  orderId?: string | null;
  productName?: string;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  orderId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface ArticleDto {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  tag: string;
  time: string;
  paras: string[];
  imageId?: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodDto {
  id: string;
  name: string;
  detail: string;
  kcal: number;
  group: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MealTemplateDto {
  id: string;
  name: string;
  description: string;
  active: boolean;
  entries: Array<{
    id: string;
    foodId: string;
    foodName?: string;
    meal: string;
    portions: number;
    position: number;
    kcal?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseTemplateDto {
  id: string;
  name: string;
  description: string;
  active: boolean;
  days: Array<Array<{id: string; name: string; minutes: number; type: string}>>;
  createdAt: string;
  updatedAt: string;
}

export interface MealEntryDto {
  id: string;
  date: string;
  meal: string;
  foodId?: string | null;
  foodName: string;
  detail: string;
  kcalPerPortion: number;
  portions: number;
  totalKcal: number;
  templateId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseEntryDto {
  id: string;
  date: string;
  name: string;
  minutes: number;
  type: string;
  completed: boolean;
  templateId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseScheduleDto {
  weekStart: string;
  days: Array<{
    date: string;
    activities: ExerciseEntryDto[];
  }>;
}

export interface HealthProfileDto {
  heightCm?: number | null;
  weightKg?: number | null;
  goal?: string | null;
  updatedAt?: string;
}

export interface SiteSettingsDto {
  siteTitle: string;
  siteNotice: string;
  contactEmail?: string;
  contactPhone?: string;
}
