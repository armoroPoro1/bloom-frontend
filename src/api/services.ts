import { apiRequest, setSession, clearSession, uploadFile, fetchPrivateBlob, downloadFile } from './client';
import type {
  ApiEnvelope,
  AuthResponseDto,
  UserDto,
  ShopDto,
  CategoryDto,
  ProductDto,
  CartItemDto,
  CartQuoteDto,
  OrderDto,
  AddressDto,
  PromotionDto,
  ReviewDto,
  StockMovementDto,
  NotificationDto,
  ArticleDto,
  FoodDto,
  MealTemplateDto,
  ExerciseTemplateDto,
  MealEntryDto,
  ExerciseEntryDto,
  ExerciseScheduleDto,
  HealthProfileDto,
  SiteSettingsDto,
  PaymentProofDto,
} from './types';

// ======================== AUTH ========================
export async function login(email: string, password: string): Promise<UserDto> {
  const envelope = await apiRequest<ApiEnvelope<AuthResponseDto>>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  setSession(envelope.data.accessToken, envelope.data.refreshToken);
  return envelope.data.user;
}

export async function register(name: string, email: string, password: string, phone = ''): Promise<UserDto> {
  const envelope = await apiRequest<ApiEnvelope<AuthResponseDto>>('/auth/register', {
    method: 'POST',
    body: { name, email, password, phone },
  });
  setSession(envelope.data.accessToken, envelope.data.refreshToken);
  return envelope.data.user;
}

export async function getMe(): Promise<UserDto> {
  const envelope = await apiRequest<ApiEnvelope<UserDto>>('/auth/me');
  return envelope.data;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    clearSession();
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest('/me/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
  clearSession();
}

export async function changeEmail(newEmail: string, password: string): Promise<void> {
  await apiRequest('/me/change-email', {
    method: 'POST',
    body: { newEmail, password },
  });
  clearSession();
}

export async function forgotPassword(email: string): Promise<void> {
  await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
  });
}

export async function verifyEmail(token: string): Promise<void> {
  await apiRequest('/auth/verify-email', {
    method: 'POST',
    body: { token },
  });
}

export async function updateProfile(input: {
  name?: string;
  phone?: string;
  address?: string;
  avatarId?: string | null;
}): Promise<UserDto> {
  const envelope = await apiRequest<ApiEnvelope<UserDto>>('/me/profile', {
    method: 'PATCH',
    body: input,
  });
  return envelope.data;
}

// ======================== CATALOG & PUBLIC ========================
export async function getCategories(): Promise<CategoryDto[]> {
  const envelope = await apiRequest<ApiEnvelope<CategoryDto[]>>('/categories');
  return envelope.data;
}

export async function getProducts(query: {
  categoryId?: string;
  shopId?: string;
  q?: string;
  limit?: number;
  offset?: number;
  sort?: string;
} = {}): Promise<{ products: ProductDto[]; total?: number }> {
  const envelope = await apiRequest<ApiEnvelope<ProductDto[]>>('/products', { query });
  return { products: envelope.data, total: envelope.page?.total };
}

export async function getProduct(id: string): Promise<ProductDto> {
  const envelope = await apiRequest<ApiEnvelope<ProductDto>>(`/products/${id}`);
  return envelope.data;
}

export async function getShops(query: { q?: string; limit?: number; offset?: number } = {}): Promise<ShopDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ShopDto[]>>('/shops', { query });
  return envelope.data;
}

export async function getShop(id: string): Promise<ShopDto> {
  const envelope = await apiRequest<ApiEnvelope<ShopDto>>(`/shops/${id}`);
  return envelope.data;
}

export async function getProductReviews(
  productId: string,
  query: { limit?: number; offset?: number } = {},
): Promise<{ reviews: ReviewDto[]; total?: number }> {
  const envelope = await apiRequest<ApiEnvelope<ReviewDto[]>>(`/products/${productId}/reviews`, { query });
  return { reviews: envelope.data, total: envelope.page?.total };
}

export async function getActivePromotions(): Promise<PromotionDto[]> {
  const envelope = await apiRequest<ApiEnvelope<PromotionDto[]>>('/promotions');
  return envelope.data;
}

export async function getSiteSettings(): Promise<SiteSettingsDto> {
  const envelope = await apiRequest<ApiEnvelope<SiteSettingsDto>>('/settings');
  return envelope.data;
}

export async function recordVisit(page: string): Promise<void> {
  try {
    await apiRequest('/visits', {
      method: 'POST',
      body: { page },
    });
  } catch {
    // Non-critical tracking
  }
}

// ======================== CART & WISHLIST ========================
export async function getCart(): Promise<CartItemDto[]> {
  const envelope = await apiRequest<ApiEnvelope<CartItemDto[]>>('/me/cart');
  return envelope.data;
}

export async function updateCartItem(productId: string, quantity: number): Promise<CartItemDto[]> {
  const envelope = await apiRequest<ApiEnvelope<CartItemDto[]>>(`/me/cart/${productId}`, {
    method: 'PUT',
    body: { quantity },
  });
  return envelope.data;
}

export async function clearCart(): Promise<void> {
  await apiRequest('/me/cart', { method: 'DELETE' });
}

export async function mergeCart(items: Array<{ productId: string; quantity: number }>): Promise<CartItemDto[]> {
  const envelope = await apiRequest<ApiEnvelope<CartItemDto[]>>('/me/cart/merge', {
    method: 'POST',
    body: { items },
  });
  return envelope.data;
}

export async function getWishlist(): Promise<ProductDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ProductDto[]>>('/me/wishlist');
  return envelope.data;
}

export async function addWishlist(productId: string): Promise<void> {
  await apiRequest(`/me/wishlist/${productId}`, { method: 'PUT' });
}

export async function removeWishlist(productId: string): Promise<void> {
  await apiRequest(`/me/wishlist/${productId}`, { method: 'DELETE' });
}

// ======================== ADDRESSES ========================
export async function getAddresses(): Promise<AddressDto[]> {
  const envelope = await apiRequest<ApiEnvelope<AddressDto[]>>('/me/addresses');
  return envelope.data;
}

export async function createAddress(data: {
  label: string;
  name: string;
  phone: string;
  address: string;
  isDefault?: boolean;
}): Promise<AddressDto> {
  const envelope = await apiRequest<ApiEnvelope<AddressDto>>('/me/addresses', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateAddress(
  id: string,
  data: {
    label?: string;
    name?: string;
    phone?: string;
    address?: string;
    isDefault?: boolean;
  },
): Promise<AddressDto> {
  const envelope = await apiRequest<ApiEnvelope<AddressDto>>(`/me/addresses/${id}`, {
    method: 'PUT',
    body: data,
  });
  return envelope.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await apiRequest(`/me/addresses/${id}`, { method: 'DELETE' });
}

// ======================== CHECKOUT & ORDERS ========================
export async function quoteCheckout(
  couponCode?: string,
): Promise<CartQuoteDto> {
  const envelope = await apiRequest<ApiEnvelope<CartQuoteDto>>('/checkout/quote', {
    method: 'POST',
    body: { couponCode: couponCode ? couponCode.trim() : '' },
  });
  return envelope.data;
}

export async function checkout(
  data: {
    addressId: string;
    paymentMethod: 'transfer' | 'development';
    couponCode?: string;
    proofUploadId?: string;
  },
  idempotencyKey = crypto.randomUUID(),
): Promise<OrderDto[]> {
  const envelope = await apiRequest<ApiEnvelope<{ orders: OrderDto[] }>>('/checkout', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: {
      addressId: data.addressId,
      paymentMethod: data.paymentMethod,
      couponCode: data.couponCode ? data.couponCode.trim() : '',
      ...(data.proofUploadId ? { proofUploadId: data.proofUploadId } : {}),
    },
  });
  return envelope.data.orders;
}

export async function getMyOrders(query: {
  status?: string;
  paymentStatus?: string;
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ orders: OrderDto[]; total?: number }> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto[]>>('/me/orders', { query });
  return { orders: envelope.data, total: envelope.page?.total };
}

export async function getOrder(id: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/orders/${id}`);
  return envelope.data;
}

export async function getOrderPaymentProofs(orderId: string): Promise<PaymentProofDto[]> {
  const envelope = await apiRequest<ApiEnvelope<PaymentProofDto[]>>(`/orders/${orderId}/payment-proofs`);
  return envelope.data;
}

export async function cancelOrder(id: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/orders/${id}/cancel`, { method: 'POST' });
  return envelope.data;
}

export async function submitPaymentProof(orderId: string, proofUploadId: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/orders/${orderId}/payment-proof`, {
    method: 'POST',
    body: { proofUploadId },
  });
  return envelope.data;
}

export async function confirmDelivery(orderId: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/orders/${orderId}/receive`, { method: 'POST' });
  return envelope.data;
}

export async function submitReview(productId: string, rating: number, body: string): Promise<ReviewDto> {
  const envelope = await apiRequest<ApiEnvelope<ReviewDto>>(`/products/${productId}/reviews`, {
    method: 'POST',
    body: { rating, text: body },
  });
  return envelope.data;
}

export async function getMyReviews(): Promise<ReviewDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ReviewDto[]>>('/me/reviews');
  return envelope.data;
}

// ======================== NOTIFICATIONS ========================
export async function getNotifications(): Promise<NotificationDto[]> {
  const envelope = await apiRequest<ApiEnvelope<NotificationDto[]>>('/me/notifications');
  return envelope.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/me/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest('/me/notifications/read-all', { method: 'POST' });
}

// ======================== SELLER ========================
export async function getMyShop(): Promise<ShopDto | null> {
  try {
    const envelope = await apiRequest<ApiEnvelope<ShopDto>>('/me/shop');
    return envelope.data;
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function applyShop(data: { name: string; email: string; description: string }): Promise<ShopDto> {
  const envelope = await apiRequest<ApiEnvelope<ShopDto>>('/me/shop', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateMyShop(data: {
  name?: string;
  email?: string;
  description?: string;
  shippingFeeCents?: number;
  freeShippingAtCents?: number | null;
}): Promise<ShopDto> {
  const envelope = await apiRequest<ApiEnvelope<ShopDto>>('/me/shop', {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function resubmitShop(data: { name: string; email: string; description: string }): Promise<ShopDto> {
  const envelope = await apiRequest<ApiEnvelope<ShopDto>>('/me/shop/resubmit', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function getSellerProducts(query: { limit?: number; offset?: number; q?: string } = {}): Promise<ProductDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ProductDto[]>>('/seller/products', { query });
  return envelope.data;
}

export async function createSellerProduct(data: {
  categoryId: string;
  name: string;
  englishName?: string;
  description?: string;
  priceCents: number;
  originalPriceCents?: number;
  stock: number;
  imageId?: string | null;
  imageIndex?: number | null;
  badge?: string;
  active?: boolean;
}): Promise<ProductDto> {
  const envelope = await apiRequest<ApiEnvelope<ProductDto>>('/seller/products', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateSellerProduct(id: string, data: Partial<ProductDto>): Promise<ProductDto> {
  const envelope = await apiRequest<ApiEnvelope<ProductDto>>(`/seller/products/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function deleteSellerProduct(id: string): Promise<void> {
  await apiRequest(`/seller/products/${id}`, { method: 'DELETE' });
}

export async function restoreSellerProduct(id: string): Promise<ProductDto> {
  const envelope = await apiRequest<ApiEnvelope<ProductDto>>(`/seller/products/${id}/restore`, { method: 'POST' });
  return envelope.data;
}

export async function adjustSellerStock(productId: string, change: number, reason: string): Promise<ProductDto> {
  const envelope = await apiRequest<ApiEnvelope<ProductDto>>(`/seller/products/${productId}/stock`, {
    method: 'POST',
    body: { change, reason },
  });
  return envelope.data;
}

export async function getSellerStockMovements(query: { limit?: number; offset?: number } = {}): Promise<StockMovementDto[]> {
  const envelope = await apiRequest<ApiEnvelope<StockMovementDto[]>>('/seller/stock-movements', { query });
  return envelope.data;
}

export async function getSellerOrders(query: {
  status?: string;
  paymentStatus?: string;
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ orders: OrderDto[]; total?: number }> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto[]>>('/seller/orders', { query });
  return { orders: envelope.data, total: envelope.page?.total };
}

export async function prepareOrder(orderId: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/orders/${orderId}/prepare`, { method: 'POST' });
  return envelope.data;
}

export async function shipOrder(orderId: string, carrier: string, tracking: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/orders/${orderId}/ship`, {
    method: 'POST',
    body: { carrier, tracking },
  });
  return envelope.data;
}

export async function updateShipment(orderId: string, carrier: string, tracking: string, reason: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/orders/${orderId}/shipment`, {
    method: 'PATCH',
    body: { carrier, tracking, reason },
  });
  return envelope.data;
}

export async function getSellerPromotions(): Promise<PromotionDto[]> {
  const envelope = await apiRequest<ApiEnvelope<PromotionDto[]>>('/seller/promotions');
  return envelope.data;
}

export async function createSellerPromotion(data: {
  code: string;
  title: string;
  percent: number;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  minSpendCents?: number;
  maxDiscountCents?: number | null;
  usageLimit?: number | null;
}): Promise<PromotionDto> {
  const envelope = await apiRequest<ApiEnvelope<PromotionDto>>('/seller/promotions', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateSellerPromotion(id: string, data: Partial<PromotionDto>): Promise<PromotionDto> {
  const envelope = await apiRequest<ApiEnvelope<PromotionDto>>(`/seller/promotions/${id}`, {
    method: 'PUT',
    body: data,
  });
  return envelope.data;
}

export async function deleteSellerPromotion(id: string): Promise<void> {
  await apiRequest(`/seller/promotions/${id}`, { method: 'DELETE' });
}

export async function getSellerReviews(): Promise<ReviewDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ReviewDto[]>>('/seller/reviews');
  return envelope.data;
}

export async function replyReview(reviewId: string, reply: string): Promise<ReviewDto> {
  const envelope = await apiRequest<ApiEnvelope<ReviewDto>>(`/reviews/${reviewId}/reply`, {
    method: 'PUT',
    body: { text: reply },
  });
  return envelope.data;
}

export async function getSellerSalesReport(query: { fromDate?: string; toDate?: string } = {}): Promise<any> {
  const envelope = await apiRequest<ApiEnvelope<any>>('/seller/reports/sales', { query });
  return envelope.data;
}

// ======================== ADMIN ========================
export async function getAdminShops(query: { status?: string; q?: string; limit?: number; offset?: number } = {}): Promise<ShopDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ShopDto[]>>('/admin/shops', { query });
  return envelope.data;
}

export async function decideAdminShop(id: string, decision: 'approve' | 'reject', reason?: string): Promise<ShopDto> {
  const envelope = await apiRequest<ApiEnvelope<ShopDto>>(`/admin/shops/${id}/decision`, {
    method: 'POST',
    body: { decision, reason: reason || undefined },
  });
  return envelope.data;
}

export async function setAdminShopStatus(id: string, status: 'approved' | 'suspended', reason?: string): Promise<ShopDto> {
  const envelope = await apiRequest<ApiEnvelope<ShopDto>>(`/admin/shops/${id}/status`, {
    method: 'PATCH',
    body: { status, reason: reason || undefined },
  });
  return envelope.data;
}

export async function getAdminUsers(query: { role?: string; blocked?: boolean; q?: string; limit?: number; offset?: number } = {}): Promise<UserDto[]> {
  const envelope = await apiRequest<ApiEnvelope<UserDto[]>>('/admin/users', { query });
  return envelope.data;
}

export async function setAdminUserBlocked(id: string, blocked: boolean, reason?: string): Promise<UserDto> {
  const envelope = await apiRequest<ApiEnvelope<UserDto>>(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: {
      blocked,
      reason: reason || (blocked ? 'ระงับการใช้งานโดยผู้ดูแลระบบ' : 'ยกเลิกการระงับการใช้งานโดยผู้ดูแลระบบ'),
    },
  });
  return envelope.data;
}

export async function getAdminCategories(): Promise<CategoryDto[]> {
  const envelope = await apiRequest<ApiEnvelope<CategoryDto[]>>('/admin/categories');
  return envelope.data;
}

export async function createAdminCategory(data: { name: string; icon?: string; description?: string; active?: boolean }): Promise<CategoryDto> {
  const envelope = await apiRequest<ApiEnvelope<CategoryDto>>('/admin/categories', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateAdminCategory(id: string, data: Partial<CategoryDto>): Promise<CategoryDto> {
  const envelope = await apiRequest<ApiEnvelope<CategoryDto>>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function deleteAdminCategory(id: string): Promise<void> {
  await apiRequest(`/admin/categories/${id}`, { method: 'DELETE' });
}

export async function getAdminOrders(query: {
  status?: string;
  paymentStatus?: string;
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ orders: OrderDto[]; total?: number }> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto[]>>('/admin/orders', { query });
  return { orders: envelope.data, total: envelope.page?.total };
}

export async function reviewPaymentProof(orderId: string, decision: 'approve' | 'reject', reason?: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/admin/orders/${orderId}/payment-review`, {
    method: 'POST',
    body: { decision, reason: reason || undefined },
  });
  return envelope.data;
}

export async function recordAdminRefund(orderId: string, reference?: string, note?: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/admin/orders/${orderId}/refund`, {
    method: 'POST',
    body: { reference: reference || undefined, note: note || undefined },
  });
  return envelope.data;
}

export async function recordLatePayment(orderId: string, amountCents: number, paymentReference: string, note?: string): Promise<OrderDto> {
  const envelope = await apiRequest<ApiEnvelope<OrderDto>>(`/admin/orders/${orderId}/late-payment`, {
    method: 'POST',
    body: { amountCents, paymentReference, note: note || undefined },
  });
  return envelope.data;
}

export async function getAdminReviews(): Promise<ReviewDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ReviewDto[]>>('/admin/reviews');
  return envelope.data;
}

export async function moderateReview(reviewId: string, hidden: boolean, reason?: string): Promise<ReviewDto> {
  const envelope = await apiRequest<ApiEnvelope<ReviewDto>>(`/admin/reviews/${reviewId}/moderation`, {
    method: 'PUT',
    body: { hidden, reason: reason || (hidden ? 'ซ่อนโดยผู้ดูแลระบบ' : 'ยกเลิกการซ่อนโดยผู้ดูแลระบบ') },
  });
  return envelope.data;
}

export async function getAdminPromotions(): Promise<PromotionDto[]> {
  const envelope = await apiRequest<ApiEnvelope<PromotionDto[]>>('/admin/promotions');
  return envelope.data;
}

export async function createAdminPromotion(data: any): Promise<PromotionDto> {
  const envelope = await apiRequest<ApiEnvelope<PromotionDto>>('/admin/promotions', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateAdminPromotion(id: string, data: any): Promise<PromotionDto> {
  const envelope = await apiRequest<ApiEnvelope<PromotionDto>>(`/admin/promotions/${id}`, {
    method: 'PUT',
    body: data,
  });
  return envelope.data;
}

export async function deleteAdminPromotion(id: string): Promise<void> {
  await apiRequest(`/admin/promotions/${id}`, { method: 'DELETE' });
}

export async function getAdminAuditEvents(query: { limit?: number; offset?: number } = {}): Promise<any[]> {
  const envelope = await apiRequest<ApiEnvelope<any[]>>('/admin/audit-events', { query });
  return envelope.data;
}

export async function getAdminUsage(): Promise<any[]> {
  const envelope = await apiRequest<ApiEnvelope<any[]>>('/admin/usage');
  return envelope.data;
}

export async function getAdminSettings(): Promise<SiteSettingsDto> {
  const envelope = await apiRequest<ApiEnvelope<SiteSettingsDto>>('/admin/settings');
  return envelope.data;
}

export async function updateAdminSettings(data: Partial<SiteSettingsDto>): Promise<SiteSettingsDto> {
  const envelope = await apiRequest<ApiEnvelope<SiteSettingsDto>>('/admin/settings', {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function getAdminSalesReport(query: { fromDate?: string; toDate?: string } = {}): Promise<any> {
  const envelope = await apiRequest<ApiEnvelope<any>>('/admin/reports/sales', { query });
  return envelope.data;
}

// ======================== WELLNESS & CMS ========================
export async function getPublishedArticles(query: {
  q?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ articles: ArticleDto[]; total?: number }> {
  const envelope = await apiRequest<ApiEnvelope<ArticleDto[]>>('/articles', { query });
  return { articles: envelope.data, total: envelope.page?.total };
}

export async function getArticle(id: string): Promise<ArticleDto> {
  const envelope = await apiRequest<ApiEnvelope<ArticleDto>>(`/articles/${id}`);
  return envelope.data;
}

export async function getArticleFilters(): Promise<{ categories: Array<{ value: string; count: number }>; tags: Array<{ value: string; count: number }> }> {
  const envelope = await apiRequest<ApiEnvelope<{ categories: Array<{ value: string; count: number }>; tags: Array<{ value: string; count: number }> }>>('/articles/filters');
  return envelope.data;
}

export async function getArticleBookmarks(): Promise<ArticleDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ArticleDto[]>>('/me/article-bookmarks');
  return envelope.data;
}

export async function addArticleBookmark(articleId: string): Promise<void> {
  await apiRequest(`/me/article-bookmarks/${articleId}`, { method: 'PUT' });
}

export async function removeArticleBookmark(articleId: string): Promise<void> {
  await apiRequest(`/me/article-bookmarks/${articleId}`, { method: 'DELETE' });
}

export async function getFoods(query: { q?: string; group?: string; limit?: number; offset?: number } = {}): Promise<FoodDto[]> {
  const envelope = await apiRequest<ApiEnvelope<FoodDto[]>>('/foods', { query });
  return envelope.data;
}

export async function getFoodGroups(): Promise<Array<{ value: string; count: number }>> {
  const envelope = await apiRequest<ApiEnvelope<Array<{ value: string; count: number }>>>('/foods/groups');
  return envelope.data;
}

export async function getMealTemplates(): Promise<MealTemplateDto[]> {
  const envelope = await apiRequest<ApiEnvelope<MealTemplateDto[]>>('/meal-templates');
  return envelope.data;
}

export async function getExerciseTemplates(): Promise<ExerciseTemplateDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ExerciseTemplateDto[]>>('/exercise-templates');
  return envelope.data;
}

// Personal Wellness Diary
export async function getMealDiary(query: { date?: string; from?: string; to?: string; limit?: number; offset?: number } = {}): Promise<{ entries: MealEntryDto[]; totalsByDate: Array<{ date: string; kcal: number }>; total?: number }> {
  const envelope = await apiRequest<ApiEnvelope<MealEntryDto[]> & { totalsByDate: Array<{ date: string; kcal: number }> }>('/me/meal-diary', { query });
  return {
    entries: envelope.data,
    totalsByDate: envelope.totalsByDate || [],
    total: envelope.page?.total,
  };
}

export async function logMealEntry(data: {
  date: string;
  foodId: string;
  meal: string;
  portions?: number;
}): Promise<MealEntryDto> {
  const envelope = await apiRequest<ApiEnvelope<MealEntryDto>>('/me/meal-diary', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateMealEntry(
  id: string,
  data: {
    date?: string;
    meal?: string;
    portions?: number;
  },
): Promise<MealEntryDto> {
  const envelope = await apiRequest<ApiEnvelope<MealEntryDto>>(`/me/meal-diary/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function deleteMealEntry(id: string): Promise<void> {
  await apiRequest(`/me/meal-diary/${id}`, { method: 'DELETE' });
}

export async function applyMealTemplate(templateId: string, date: string, mode: 'append' | 'replace' = 'append'): Promise<void> {
  await apiRequest('/me/meal-diary/apply-template', {
    method: 'POST',
    body: { templateId, date, mode },
  });
}

// Personal Exercise Schedule
export async function getExerciseSchedule(weekStart?: string): Promise<ExerciseScheduleDto> {
  const envelope = await apiRequest<ApiEnvelope<ExerciseScheduleDto>>('/me/exercise-schedule', {
    query: weekStart ? { weekStart } : undefined,
  });
  return envelope.data;
}

export async function addExerciseEntry(data: {
  date: string;
  name: string;
  minutes: number;
  type?: string;
  completed?: boolean;
}): Promise<ExerciseEntryDto> {
  const envelope = await apiRequest<ApiEnvelope<ExerciseEntryDto>>('/me/exercise-schedule', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateExerciseEntry(
  id: string,
  data: {
    date?: string;
    name?: string;
    minutes?: number;
    type?: string;
    completed?: boolean;
  },
): Promise<ExerciseEntryDto> {
  const envelope = await apiRequest<ApiEnvelope<ExerciseEntryDto>>(`/me/exercise-schedule/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function deleteExerciseEntry(id: string): Promise<void> {
  await apiRequest(`/me/exercise-schedule/${id}`, { method: 'DELETE' });
}

export async function applyExerciseTemplate(templateId: string, weekStart: string, mode: 'append' | 'replace' = 'replace'): Promise<void> {
  await apiRequest('/me/exercise-schedule/apply-template', {
    method: 'POST',
    body: { templateId, weekStart, mode },
  });
}

// Health Profile
export async function getHealthProfile(): Promise<HealthProfileDto | null> {
  try {
    const envelope = await apiRequest<ApiEnvelope<HealthProfileDto>>('/me/health-profile');
    return envelope.data;
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function saveHealthProfile(data: Partial<HealthProfileDto>): Promise<HealthProfileDto> {
  const envelope = await apiRequest<ApiEnvelope<HealthProfileDto>>('/me/health-profile', {
    method: 'PUT',
    body: data,
  });
  return envelope.data;
}

export async function deleteHealthProfile(): Promise<void> {
  await apiRequest('/me/health-profile', { method: 'DELETE' });
}

export async function deletePersonalWellness(): Promise<void> {
  await apiRequest('/me/wellness', {
    method: 'DELETE',
    body: { confirm: true },
  });
}

export async function exportPersonalWellness(): Promise<void> {
  return downloadFile('/me/wellness/export', 'bloom-wellness-export.json');
}

// Admin CMS
export async function getAdminArticles(): Promise<ArticleDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ArticleDto[]>>('/admin/articles');
  return envelope.data;
}

export async function createAdminArticle(data: Partial<ArticleDto>): Promise<ArticleDto> {
  const envelope = await apiRequest<ApiEnvelope<ArticleDto>>('/admin/articles', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateAdminArticle(id: string, data: Partial<ArticleDto>): Promise<ArticleDto> {
  const envelope = await apiRequest<ApiEnvelope<ArticleDto>>(`/admin/articles/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function deleteAdminArticle(id: string): Promise<void> {
  await apiRequest(`/admin/articles/${id}`, { method: 'DELETE' });
}

export async function getAdminFoods(): Promise<FoodDto[]> {
  const envelope = await apiRequest<ApiEnvelope<FoodDto[]>>('/admin/foods');
  return envelope.data;
}

export async function createAdminFood(data: Partial<FoodDto>): Promise<FoodDto> {
  const envelope = await apiRequest<ApiEnvelope<FoodDto>>('/admin/foods', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateAdminFood(id: string, data: Partial<FoodDto>): Promise<FoodDto> {
  const envelope = await apiRequest<ApiEnvelope<FoodDto>>(`/admin/foods/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function deleteAdminFood(id: string): Promise<void> {
  await apiRequest(`/admin/foods/${id}`, { method: 'DELETE' });
}

export async function getAdminMealTemplates(): Promise<MealTemplateDto[]> {
  const envelope = await apiRequest<ApiEnvelope<MealTemplateDto[]>>('/admin/meal-templates');
  return envelope.data;
}

export async function createAdminMealTemplate(data: any): Promise<MealTemplateDto> {
  const envelope = await apiRequest<ApiEnvelope<MealTemplateDto>>('/admin/meal-templates', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateAdminMealTemplate(id: string, data: any): Promise<MealTemplateDto> {
  const envelope = await apiRequest<ApiEnvelope<MealTemplateDto>>(`/admin/meal-templates/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function deleteAdminMealTemplate(id: string): Promise<void> {
  await apiRequest(`/admin/meal-templates/${id}`, { method: 'DELETE' });
}

export async function getAdminExerciseTemplates(): Promise<ExerciseTemplateDto[]> {
  const envelope = await apiRequest<ApiEnvelope<ExerciseTemplateDto[]>>('/admin/exercise-templates');
  return envelope.data;
}

export async function createAdminExerciseTemplate(data: any): Promise<ExerciseTemplateDto> {
  const envelope = await apiRequest<ApiEnvelope<ExerciseTemplateDto>>('/admin/exercise-templates', {
    method: 'POST',
    body: data,
  });
  return envelope.data;
}

export async function updateAdminExerciseTemplate(id: string, data: any): Promise<ExerciseTemplateDto> {
  const envelope = await apiRequest<ApiEnvelope<ExerciseTemplateDto>>(`/admin/exercise-templates/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return envelope.data;
}

export async function deleteAdminExerciseTemplate(id: string): Promise<void> {
  await apiRequest(`/admin/exercise-templates/${id}`, { method: 'DELETE' });
}

// Re-export common upload / blob utils
export { uploadFile, fetchPrivateBlob, downloadFile };
