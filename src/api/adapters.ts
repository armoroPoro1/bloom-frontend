import { centsToBaht } from './types';
import type {
  UserDto,
  ShopDto,
  CategoryDto,
  ProductDto,
  OrderDto,
  PromotionDto,
  ReviewDto,
  AddressDto,
  NotificationDto,
} from './types';
import type {
  User,
  Shop,
  Category,
  Product,
  Order,
  Promotion,
  Review,
  Address,
  Notification,
  OrderItem,
  OrderEvent,
} from '../types';

export function adaptUser(dto: UserDto, shopId?: string): User {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    phone: dto.phone || '',
    address: dto.address || '',
    role: dto.role,
    shopId: shopId,
    blocked: dto.blocked,
  };
}

export function adaptCategory(dto: CategoryDto): Category {
  return {
    id: dto.id,
    name: dto.name,
    icon: dto.icon || 'package',
    active: dto.active !== undefined ? dto.active : true,
    description: dto.description || '',
  };
}

export function adaptProduct(dto: ProductDto): Product {
  return {
    id: dto.id,
    name: dto.name,
    en: dto.englishName || '',
    category: dto.categoryId,
    price: centsToBaht(dto.priceCents),
    original: centsToBaht(dto.originalPriceCents || 0),
    image: dto.imageIndex ?? 0,
    rating: dto.rating ?? 0,
    reviews: dto.reviewCount ?? 0,
    stock: dto.stock,
    shopId: dto.shopId,
    badge: dto.badge || '',
    description: dto.description || '',
    active: dto.active !== undefined ? dto.active : true,
    customImage: dto.imageId ? `/api/v1/uploads/${dto.imageId}` : undefined,
    createdAt: dto.createdAt,
  };
}

export function adaptShop(dto: ShopDto): Shop {
  return {
    id: dto.id,
    name: dto.name,
    owner: dto.name,
    email: dto.email,
    description: dto.description,
    status: dto.status || 'approved',
    date: dto.createdAt,
    reviewReason: dto.reviewReason || undefined,
    shippingFee: centsToBaht(dto.shippingFeeCents),
    freeShippingAt: dto.freeShippingAtCents != null ? centsToBaht(dto.freeShippingAtCents) : undefined,
  };
}

export function adaptOrder(dto: OrderDto): Order {
  const items: OrderItem[] = (dto.items || []).map((i) => ({
    productId: i.productId,
    name: i.name,
    price: centsToBaht(i.unitPriceCents),
    quantity: i.quantity,
    image: i.imageIndex ?? 0,
    customImage: i.imageId ? `/api/v1/uploads/${i.imageId}` : undefined,
  }));

  const history: OrderEvent[] = (dto.events || []).map((e) => ({
    id: e.id,
    at: e.createdAt,
    status: (e.status as any) || 'pending',
    label: e.label,
    actor: e.actorName || 'ระบบ',
  }));

  return {
    id: dto.id,
    groupId: dto.checkoutId,
    date: dto.createdAt,
    buyerId: dto.buyerId,
    buyer: dto.addressSnapshot?.name || dto.buyerName || 'ผู้ซื้อ',
    shopId: dto.shopId,
    items,
    subtotal: centsToBaht(dto.subtotalCents),
    shipping: centsToBaht(dto.shippingCents),
    discount: centsToBaht(dto.discountCents),
    total: centsToBaht(dto.totalCents),
    status: dto.status,
    paymentStatus: dto.paymentStatus,
    payment: dto.paymentMethod === 'development' ? 'demo' : 'transfer',
    address: dto.addressSnapshot?.address || '',
    phone: dto.addressSnapshot?.phone || '',
    tracking: dto.tracking || undefined,
    carrier: dto.carrier || undefined,
    receipt: dto.proofUploadId ? `/api/v1/uploads/${dto.proofUploadId}` : undefined,
    paymentNote: dto.paymentNote || undefined,
    couponCode: dto.couponCode || undefined,
    stockReleased: dto.stockReleased,
    history,
  };
}

export function adaptPromotion(dto: PromotionDto): Promotion {
  return {
    id: dto.id,
    code: dto.code,
    title: dto.title,
    percent: dto.percent,
    active: dto.active,
    shopId: dto.shopId || undefined,
    startsAt: dto.startsAt || undefined,
    endsAt: dto.endsAt || undefined,
    minSpend: dto.minSpendCents ? centsToBaht(dto.minSpendCents) : 0,
    maxDiscount: dto.maxDiscountCents ? centsToBaht(dto.maxDiscountCents) : undefined,
    usageLimit: dto.usageLimit || undefined,
    usedCount: dto.usedCount || 0,
  };
}

export function adaptReview(dto: ReviewDto): Review {
  return {
    id: dto.id,
    productId: dto.productId,
    userId: dto.userId,
    name: dto.userName || dto.name || 'สมาชิก',
    rating: dto.rating,
    text: dto.text ?? dto.body,
    date: dto.createdAt,
    hidden: dto.hidden,
    moderationReason: dto.moderationReason || undefined,
    reply: dto.reply || undefined,
    repliedAt: dto.repliedAt || undefined,
  };
}

export function adaptAddress(dto: AddressDto): Address {
  return {
    id: dto.id,
    userId: dto.userId,
    label: dto.label,
    name: dto.name,
    phone: dto.phone,
    address: dto.address,
    isDefault: dto.isDefault,
  };
}

export function adaptNotification(dto: NotificationDto): Notification {
  return {
    id: dto.id,
    userId: dto.userId,
    title: dto.title,
    message: dto.message,
    date: dto.createdAt,
    read: dto.readAt != null,
    orderId: dto.orderId || undefined,
    page: 'orders',
  };
}
