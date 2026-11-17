import {createCartWriter} from './api/cart';
import {loadContent,persistContent} from './api/content';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { seed } from './data';
import { actorOf, normalizeState, withBuckets, calculateCart } from './domain';
import { createStoreActions, type CheckoutInput } from './actions';
import { loadLocalState, persistLocalState, STATE_KEY, type LoadedState } from './persistence';
import type { Role, State, User, Product, Shop, Category, Order, OrderStatus, Promotion, Review, Address, CartQuote } from './types';
import * as api from './api/services';
import { getAccessToken } from './api/client';
import { bahtToCents, centsToBaht } from './api/types';
import {
  adaptUser,
  adaptCategory,
  adaptProduct,
  adaptShop,
  adaptOrder,
  adaptPromotion,
  adaptReview,
  adaptAddress,
  adaptNotification,
} from './api/adapters';
import { dataUrlToBlob } from './imageUpload';

type StoreActions = {
  notify: (msg: string) => void;
  setRole: (role: Role) => Promise<boolean> | boolean;
  addCart: (productId: string, quantity?: number) => Promise<boolean> | boolean;
  updateCart: (productId: string, quantity: number) => Promise<boolean> | boolean;
  toggleWish: (productId: string) => Promise<boolean> | boolean;
  quoteCart: (code: string) => CartQuote;
  checkout: (input: any) => Promise<string[] | false> | string[] | Order[] | false;
  updateOrder: (id: string, status: any, patch?: any) => Promise<boolean | Order> | boolean | Order;
  rejectPayment: (id: string, reason: string) => Promise<boolean> | boolean;
  resubmitPayment: (id: string, receiptDataUrl: string) => Promise<boolean> | boolean;
  completeRefund: (id: string) => Promise<boolean> | boolean;
  approveShop: (id: string, approved: boolean, reason?: string) => Promise<boolean> | boolean;
  suspendShop: (id: string, suspended: boolean, reason?: string) => Promise<boolean> | boolean;
  saveShop: (shop: any) => Promise<boolean> | boolean;
  applyShop: (data: any) => Promise<boolean> | boolean;
  saveProduct: (product: any) => Promise<boolean> | boolean;
  deleteProduct: (id: string) => Promise<boolean> | boolean;
  saveCategory: (category: any) => Promise<boolean> | boolean;
  deleteCategory: (id: string) => Promise<boolean> | boolean;
  savePromotion: (promotion: any) => Promise<boolean> | boolean;
  deletePromotion: (id: string) => Promise<boolean> | boolean;
  addReview: (productId: string, rating: number, text: string) => Promise<boolean> | boolean;
  replyReview: (id: string, text: string) => Promise<boolean> | boolean;
  moderateReview: (id: string, hidden: boolean, reason?: string) => Promise<boolean> | boolean;
  register: (name: string, email: string, password: string) => Promise<boolean> | boolean;
  login: (email: string, password: string) => Promise<boolean> | boolean;
  logout: () => Promise<void> | void;
  saveProfile: (data: any) => Promise<boolean> | boolean;
  changePassword: (oldPass: string, newPass: string) => Promise<boolean> | boolean;
  setUserBlocked: (id: string, blocked: boolean) => Promise<boolean> | boolean;
  saveAddress: (address: any) => Promise<boolean> | boolean;
  deleteAddress: (id: string) => Promise<boolean> | boolean;
  setDefaultAddress: (id: string) => Promise<boolean> | boolean;
  saveSiteSettings: (title: string, notice: string) => Promise<boolean> | boolean;
  saveContent: (data: any, description: string) => Promise<boolean> | boolean;
  markNotificationsRead: (ids?: string[]) => Promise<void> | void;
  recordVisit: (page: string) => void;
  resetDemo: () => void;
};

type StoreValue = {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  user: User | undefined;
  role: Role;
  toast: string;
  apiConnected: boolean;
  refreshData: () => Promise<void>;
} & StoreActions;

const Store = createContext<StoreValue>(null!);

function initialLocalState(): LoadedState {
  try {
    return loadLocalState(localStorage, seed);
  } catch {
    return {
      state: normalizeState(undefined, seed),
      error: 'เบราว์เซอร์ไม่อนุญาตให้จัดเก็บข้อมูล การเปลี่ยนแปลงจะอยู่เฉพาะหน้าต่างนี้',
      readBlocked: true,
    };
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loaded] = useState(initialLocalState);
  const [state, renderState] = useState<State>(loaded.state);
  const [storageError, setStorageError] = useState(loaded.error);
  const [readBlocked, setReadBlocked] = useState(loaded.readBlocked);
  const [apiConnected, setApiConnected] = useState(false);
  const [initialized,setInitialized]=useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const storageErrorRef = useRef(loaded.error);
  const readBlockedRef = useRef(loaded.readBlocked);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persist = useCallback((value: State) => {
    if (readBlockedRef.current) return false;
    let issue = '';
    try {
      issue = persistLocalState(localStorage, value);
    } catch {
      issue = 'เบราว์เซอร์ไม่อนุญาตให้จัดเก็บข้อมูล การเปลี่ยนแปลงล่าสุดยังไม่ได้บันทึก';
    }
    storageErrorRef.current = issue;
    setStorageError(issue);
    return !issue;
  }, []);

  const setState: React.Dispatch<React.SetStateAction<State>> = useCallback(
    (next) => {
      const result = withBuckets(typeof next === 'function' ? next(stateRef.current) : next);
      stateRef.current = result;
      persist(result);
      renderState(result);
    },
    [persist],
  );

  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 4500);
  }, []);

  // Fetch Public Catalog Data from Backend
  const refreshPublicData = useCallback(async () => {
    try {
      const [cats, prodsRes, shps, promos, settings, content] = await Promise.all([
        api.getCategories(),
        api.getProducts({ limit: 100 }),
        api.getShops({ limit: 50 }),
        api.getActivePromotions(),
        api.getSiteSettings().catch(() => null),
        loadContent(),
      ]);

      setApiConnected(true);
      setStorageError('');
      setReadBlocked(false);
      readBlockedRef.current = false;
      setState((prev) => ({
        ...prev,
        categories: cats.map(adaptCategory),
        products: prodsRes.products.map(adaptProduct),
        shops: shps.map(adaptShop),
        promotions: promos.map(adaptPromotion),
        siteTitle: settings?.siteTitle || prev.siteTitle,
        siteNotice: settings?.siteNotice || prev.siteNotice,
        content,
      }));
    } catch (err) {
      console.warn('API public data refresh failed:', err);
      // Keep the last connection mode: transient failures must not enable local-only writes.
      notify((err as Error).message || 'Unable to refresh catalog');
    }
  }, [setState]);

  // Fetch User-Scoped Data from Backend
  const refreshUserData = useCallback(async () => {
    if (!getAccessToken()) {
      if (stateRef.current.currentUserId) {
        setState(prev => ({...prev, currentUserId: null, cart: [], wishlist: [], orders: [], addresses: [], notifications: []}));
      }
      return;
    }
    try {
      const [userDto, shopDto, cartItems, wishlistProds, ordersRes, addresses, notifs] = await Promise.all([
        api.getMe(),
        api.getMyShop(),
        api.getCart().catch(() => []),
        api.getWishlist().catch(() => []),
        api.getMyOrders({ limit: 100 }).catch(() => ({ orders: [] })),
        api.getAddresses().catch(() => []),
        api.getNotifications().catch(() => []),
      ]);

      const adaptedUser = adaptUser(userDto, shopDto?.id);
      const ownReviews = (await api.getMyReviews()).map(row => ({...row, userId: adaptedUser.id, userName: adaptedUser.name}));
      const reviewRows = adaptedUser.role === 'seller' ? [...ownReviews, ...await api.getSellerReviews()] : ownReviews;
      const managedProducts = adaptedUser.role === 'seller' || adaptedUser.role === 'admin'
        ? await api.getAllRecords<any>(adaptedUser.role === 'admin' ? '/admin/products' : '/seller/products') : [];

      setState((prev) => {
        const nextUsers = prev.users.some((u) => u.id === adaptedUser.id)
          ? prev.users.map((u) => (u.id === adaptedUser.id ? adaptedUser : u))
          : [adaptedUser, ...prev.users];

        return {
          ...prev,
          currentUserId: adaptedUser.id,
          shops: shopDto ? [adaptShop(shopDto), ...prev.shops.filter(shop => shop.id !== shopDto.id)] : prev.shops,
          products: [...managedProducts.map(adaptProduct), ...prev.products.filter(product => !managedProducts.some(row => row.id === product.id))],
          reviews: [...reviewRows.map(adaptReview), ...prev.reviews.filter(review => !reviewRows.some(row => row.id === review.id))],
          users: nextUsers,
          cart: cartItems.map((c) => ({ productId: c.productId, quantity: c.quantity })),
          wishlist: wishlistProds.map((p) => p.id),
          orders: ordersRes.orders.map(adaptOrder),
          addresses: addresses.map(adaptAddress),
          notifications: notifs.map(adaptNotification),
        };
      });

      // If user is seller or admin, load management datasets
      if (adaptedUser.role === 'seller') {
        const [sellerOrders, sellerPromos, stockMoves] = await Promise.all([
          api.getSellerOrders({ limit: 100 }).catch(() => ({ orders: [] })),
          api.getSellerPromotions().catch(() => []),
          api.getSellerStockMovements().catch(() => []),
        ]);
        setState((prev) => ({
          ...prev,
          orders: [
            ...sellerOrders.orders.map(adaptOrder),
            ...prev.orders.filter((o) => !sellerOrders.orders.some((so) => so.id === o.id)),
          ],
          promotions: [
            ...sellerPromos.map(adaptPromotion),
            ...prev.promotions.filter((p) => !sellerPromos.some((sp) => sp.id === p.id)),
          ],
          stockMovements: stockMoves.map((m) => ({
            id: m.id,
            productId: m.productId,
            shopId: m.shopId,
            productName: m.productName || '',
            change: m.change,
            balance: m.balance,
            reason: m.reason,
            date: m.createdAt,
            actor: m.actorName || 'ผู้ขาย',
            orderId: m.orderId || undefined,
          })),
        }));
      } else if (adaptedUser.role === 'admin') {
        const [adminShops, adminUsers, adminOrders, adminReviews, adminAudit, adminContent, adminPromos, adminCategories] = await Promise.all([
          api.getAdminShops({ limit: 100 }).catch(() => []),
          api.getAdminUsers({ limit: 100 }).catch(() => []),
          api.getAdminOrders({ limit: 100 }).catch(() => ({ orders: [] })),
          api.getAdminReviews().catch(() => []),
          api.getAdminAuditEvents({ limit: 100 }).catch(() => []),
          loadContent(true), api.getAllRecords<any>('/admin/promotions'), api.getAdminCategories(),
        ]);
        setState((prev) => ({
          ...prev,
          shops: adminShops.map(adaptShop),
          content: adminContent, promotions: adminPromos.map(adaptPromotion), categories:adminCategories.map(adaptCategory),
          users: [
            ...adminUsers.map((u) => adaptUser(u)),
            ...prev.users.filter((pu) => !adminUsers.some((au) => au.id === pu.id)),
          ],
          orders: [
            ...adminOrders.orders.map(adaptOrder),
            ...prev.orders.filter((o) => !adminOrders.orders.some((ao) => ao.id === o.id)),
          ],
          reviews: adminReviews.map(adaptReview),
          auditLog: adminAudit.map((a) => ({
            id: a.id,
            date: a.createdAt,
            actor: a.actorName || 'ผู้ดูแลระบบ',
            actorId: a.actorId || 'admin',
            action: a.action,
            detail: typeof a.detail === 'object' ? JSON.stringify(a.detail) : String(a.detail),
            shopId: a.shopId || undefined,
          })),
        }));
      }
    } catch (error: any) {
      if (error.status === 401) setState(prev => ({...prev, currentUserId: null, orders: [], addresses: [], notifications: []}));
      else notify(error.message || 'Unable to load account data');
    }
  }, [setState]);

  const refreshData = useCallback(async () => {
    await refreshPublicData();
    await refreshUserData();
  }, [refreshPublicData, refreshUserData]);

  // Initial Load on mount
  const initialRefreshStarted = useRef(false);
  useEffect(() => {
    if (initialRefreshStarted.current) return;
    initialRefreshStarted.current = true;
    void refreshData().finally(()=>setInitialized(true));
  }, [refreshData]);

  // Fallback local actions
  const fallbackActions = createStoreActions(
    () => stateRef.current,
    (next) => {
      setState(next);
      return !storageErrorRef.current;
    },
    notify,
  );

  // Authenticated & API-Connected Action Overrides
  const login = async (email: string, password: string): Promise<boolean> => {
    // Only anonymous items may be merged. Switching authenticated accounts must
    // never copy the previous buyer's cart into the new account.
    const guestCart = stateRef.current.currentUserId ? [] : [...stateRef.current.cart];
    try {
      await api.login(email, password);
      // Merge guest cart if items existed
      if (guestCart.length > 0) {
        try {
          await api.mergeCart(guestCart.map((i) => ({ productId: i.productId, quantity: i.quantity })));
        } catch {
          // ignore cart merge failure
        }
      }
      await refreshData();
      notify('ยินดีต้อนรับกลับสู่ Bloom');
      return true;
    } catch (err: any) {
      notify(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      await api.register(name, email, password);
      await refreshData();
      notify('สร้างบัญชีเรียบร้อย ยินดีต้อนรับสู่ Bloom');
      return true;
    } catch (err: any) {
      notify(err.message || 'ไม่สามารถสร้างบัญชีได้');
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setState((prev) => ({
      ...prev,
      currentUserId: null,
      cart: [],
      wishlist: [],
      orders: [],
      addresses: [],
      notifications: [],
    }));
    notify('ออกจากระบบแล้ว');
  };

  const setRole = async (role: Role): Promise<boolean> => {
    if (role === 'guest') {
      await logout();
      return true;
    }
    const seedCreds: Record<'user' | 'seller' | 'admin', { email: string; pass: string }> = {
      user: { email: 'buyer@bloom.example.test', pass: 'BloomDemoPass1234!' },
      seller: { email: 'seller@bloom.example.test', pass: 'BloomDemoPass1234!' },
      admin: { email: 'admin@bloom.example.test', pass: 'BloomDemoPass1234!' },
    };
    const cred = seedCreds[role];
    const ok = await login(cred.email, cred.pass);
    if (!ok) {
      // Fallback to local role switch if API is down
      return false;
    }
    return true;
  };

  const [cartWriter] = useState(() => createCartWriter({
    account: () => stateRef.current.currentUserId,
    cart: () => stateRef.current.cart,
    write: api.updateCartItem,
    apply: item => setState(prev => {
      const cart = prev.cart.filter(entry => entry.productId !== item.productId);
      if (item.quantity > 0) cart.push(item);
      return {...prev, cart};
    }),
    error: notify,
  }));
  const writeCartQuantity = cartWriter.update;

  const addCart = async (productId: string, quantity = 1): Promise<boolean> => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      notify('กรุณาระบุจำนวนสินค้าเป็นจำนวนเต็มบวก');
      return false;
    }
    if (!apiConnected || !stateRef.current.currentUserId) return fallbackActions.addCart(productId, quantity);
    const saved = await writeCartQuantity(productId, current => current + quantity);
    if (saved) notify('\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e43\u0e19\u0e15\u0e30\u0e01\u0e23\u0e49\u0e32\u0e41\u0e25\u0e49\u0e27');
    return saved;
  };

  const updateCart = async (productId: string, quantity: number): Promise<boolean> => {
    if (!apiConnected || !stateRef.current.currentUserId) return fallbackActions.updateCart(productId, quantity);
    return writeCartQuantity(productId, () => quantity);
  };

  const toggleWish = async (productId: string): Promise<boolean> => {
    const s = stateRef.current;
    const exists = s.wishlist.includes(productId);
    if (apiConnected && s.currentUserId) {
      try {
        if (exists) {
          await api.removeWishlist(productId);
          setState((prev) => ({ ...prev, wishlist: prev.wishlist.filter((id) => id !== productId) }));
          notify('นำออกจากรายการโปรดแล้ว');
        } else {
          await api.addWishlist(productId);
          setState((prev) => ({ ...prev, wishlist: [...prev.wishlist, productId] }));
          notify('บันทึกในรายการโปรดแล้ว');
        }
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถปรับรายการโปรดได้');
        return false;
      }
    }
    return fallbackActions.toggleWish(productId);
  };

  const quoteCart = (code: string) => {
    return calculateCart(stateRef.current, code);
  };

  const checkout = async (input: CheckoutInput): Promise<string[]> => {
    await cartWriter.idle();
    const s = stateRef.current;
    if (!s.currentUserId) {
      notify('กรุณาเข้าสู่ระบบก่อนสั่งซื้อ');
      return [];
    }
    if (!s.cart.length) {
      notify('ตะกร้ายังว่างอยู่');
      return [];
    }

    if (apiConnected) {
      const name = input.name.trim();
      const phone = (input.phone ?? '').trim();
      const address = input.address.trim();
      if (!input.addressId) {
        const invalid = !name ? 'กรุณากรอกชื่อผู้รับสินค้า'
          : phone.length < 6 ? 'กรุณากรอกเบอร์โทรผู้รับอย่างน้อย 6 ตัวอักษร'
          : address.length < 5 ? 'กรุณากรอกที่อยู่จัดส่งอย่างน้อย 5 ตัวอักษร เช่น บ้านเลขที่ ถนน และเขตหรืออำเภอ'
          : null;
        if (invalid) {
          notify(invalid);
          return [];
        }
      }
      try {
        let proofUploadId: string | undefined = undefined;
        if (input.payment === 'transfer') {
          if (!input.receipt) {
            notify('กรุณาแนบรูปหลักฐานการชำระเงิน');
            return [];
          }
          const blob = dataUrlToBlob(input.receipt);
          const uploadRes = await api.uploadFile(blob, 'proof', 'slip.webp');
          proofUploadId = uploadRes.id;
        }

        let targetAddressId = input.addressId;
        if (!targetAddressId) {
          const existingAddresses = await api.getAddresses();
          const match = existingAddresses.find(
            (a) =>
              a.address.trim() === address && a.name.trim() === name && a.phone.trim() === phone
          );
          if (match) {
            targetAddressId = match.id;
          } else {
            const newAddr = await api.createAddress({
              label: 'ที่อยู่จัดส่ง',
              name,
              phone,
              address,
              isDefault: existingAddresses.length === 0,
            });
            targetAddressId = newAddr.id;
          }
        }

        const paymentMethod = input.payment === 'transfer' ? 'transfer' : 'development';

        const createdOrders = await api.checkout({
          addressId: targetAddressId,
          paymentMethod,
          couponCode: input.coupon ? input.coupon.trim() : undefined,
          proofUploadId,
        });

        await refreshUserData();
        notify('สร้างคำสั่งซื้อเรียบร้อยแล้ว');
        return createdOrders.map((o) => o.id);
      } catch (err: any) {
        if (err.code === 'PAYMENT_METHOD_DISABLED') {
          notify('เซิร์ฟเวอร์นี้ปิดการชำระเงินแบบทดลอง กรุณาเลือกแนบสลิป');
          return [];
        }
        notify(err.message || 'การสั่งซื้อไม่สำเร็จ กรุณาตรวจสอบข้อมูล');
        return [];
      }
    }

    return fallbackActions.checkout(input);
  };

  const refreshOrder = async (id:string) => {
    const order=adaptOrder(await api.getOrder(id));
    setState(prev=>({...prev,orders:[order,...prev.orders.filter(o=>o.id!==id)]}));
  };
  const updateOrder = async (orderId: string, status: OrderStatus, extra: Partial<Order> = {}): Promise<boolean> => {
    if (apiConnected) {
      try {
        if (status === 'preparing') {
          await api.prepareOrder(orderId);
        } else if (status === 'shipped') {
          if (!extra.carrier || !extra.tracking) {
            notify('กรุณาระบุบริษัทขนส่งและเลขพัสดุ');
            return false;
          }
          await api.shipOrder(orderId, extra.carrier, extra.tracking);
        } else if (status === 'delivered') {
          await api.confirmDelivery(orderId);
        } else if (status === 'cancelled') {
          await api.cancelOrder(orderId);
        } else if (status === 'paid') {
          await api.reviewPaymentProof(orderId, 'approve');
        }
        await refreshOrder(orderId);
        if(status==='cancelled')await refreshData();
        notify('อัปเดตคำสั่งซื้อเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถอัปเดตคำสั่งซื้อได้');
        return false;
      }
    }
    return fallbackActions.updateOrder(orderId, status, extra);
  };

  const rejectPayment = async (orderId: string, reason: string): Promise<boolean> => {
    if (!reason.trim()) {
      notify('กรุณาระบุเหตุผลในการส่งกลับ');
      return false;
    }
    if (apiConnected) {
      try {
        await api.reviewPaymentProof(orderId, 'reject', reason.trim());
        await refreshOrder(orderId);
        notify('ส่งผลการตรวจสอบและแจ้งลูกค้าแล้ว');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถปฏิเสธหลักฐานได้');
        return false;
      }
    }
    return fallbackActions.rejectPayment(orderId, reason);
  };

  const resubmitPayment = async (orderId: string, receipt: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        const blob = dataUrlToBlob(receipt);
        const uploadRes = await api.uploadFile(blob, 'proof', 'slip.webp');
        await api.submitPaymentProof(orderId, uploadRes.id);
        await refreshOrder(orderId);
        notify('ส่งหลักฐานชำระเงินใหม่เรียบร้อยแล้ว');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถส่งหลักฐานใหม่ได้');
        return false;
      }
    }
    return fallbackActions.resubmitPayment(orderId, receipt);
  };

  const completeRefund = async (orderId: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.recordAdminRefund(orderId, 'REFUND-MANUAL', 'บันทึกคืนเงินตัวอย่างเสร็จสิ้น');
        await refreshOrder(orderId);
        notify('บันทึกคืนเงินตัวอย่างเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถบันทึกคืนเงินได้');
        return false;
      }
    }
    return fallbackActions.completeRefund(orderId);
  };

  const approveShop = async (shopId: string, approve: boolean, reason = ''): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.decideAdminShop(shopId, approve ? 'approve' : 'reject', reason);
        await refreshData();
        notify(approve ? 'อนุมัติเปิดร้านค้าแล้ว' : 'บันทึกผลการไม่อนุมัติเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถดำเนินการได้');
        return false;
      }
    }
    return fallbackActions.approveShop(shopId, approve, reason);
  };

  const suspendShop = async (shopId: string, suspended: boolean, reason = ''): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.setAdminShopStatus(shopId, suspended ? 'suspended' : 'approved', reason);
        await refreshData();
        notify(suspended ? 'พักการจำหน่ายร้านค้าแล้ว' : 'เปิดจำหน่ายร้านค้าอีกครั้งแล้ว');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถดำเนินการได้');
        return false;
      }
    }
    return fallbackActions.suspendShop(shopId, suspended, reason);
  };

  const refreshProducts = async () => {
    const actor=actorOf(stateRef.current);
    const [publicRows,managed]=await Promise.all([api.getProducts(),actor?.role==='admin'||actor?.role==='seller'?api.getAllRecords<any>(actor.role==='admin'?'/admin/products':'/seller/products'):Promise.resolve([])]);
    setState(prev=>({...prev,products:[...managed.map(adaptProduct),...publicRows.products.filter(row=>!managed.some(m=>m.id===row.id)).map(adaptProduct)]}));
  };
  const refreshCategories = async () => {const rows=await api.getAdminCategories();setState(prev=>({...prev,categories:rows.map(adaptCategory)}));};
  const refreshPromotions = async () => {
    const actor=actorOf(stateRef.current);const rows=await api.getAllRecords<any>(actor?.role==='admin'?'/admin/promotions':'/seller/promotions');
    setState(prev=>({...prev,promotions:actor?.role==='admin'?rows.map(adaptPromotion):[...rows.map(adaptPromotion),...prev.promotions.filter(p=>p.shopId!==actor?.shopId)]}));
  };
  const refreshAddresses = async () => {const rows=await api.getAddresses();setState(prev=>({...prev,addresses:rows.map(adaptAddress)}));};
  const refreshReviews = async () => {
    const actor=actorOf(stateRef.current);if(!actor)return;
    const own=(await api.getMyReviews()).map(row=>({...row,userId:actor.id,userName:actor.name}));
    const rows=actor.role==='admin'?await api.getAdminReviews():actor.role==='seller'?[...own,...await api.getSellerReviews()]:own;
    setState(prev=>({...prev,reviews:rows.map(adaptReview)}));
  };
  const saveShop = async (input: Partial<Shop>): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.updateMyShop({
          name: input.name,
          email: input.email,
          description: input.description,
          shippingFeeCents: input.shippingFee != null ? bahtToCents(input.shippingFee) : undefined,
          freeShippingAtCents: input.freeShippingAt != null ? bahtToCents(input.freeShippingAt) : null,
        });
        await refreshData();
        notify('บันทึกข้อมูลร้านค้าเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถบันทึกข้อมูลร้านได้');
        return false;
      }
    }
    return fallbackActions.saveShop(input);
  };

  const applyShop = async (input: Pick<Shop, 'name' | 'description' | 'email'>): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.applyShop(input);
        await refreshData();
        notify('ส่งใบสมัครเปิดร้านแล้ว รอแอดมินอนุมัติ');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถส่งใบสมัครเปิดร้านได้');
        return false;
      }
    }
    return fallbackActions.applyShop(input);
  };

  const saveProduct = async (input: Product): Promise<boolean> => {
    if (apiConnected) {
      try {
        let imageId = input.customImage?.match(/([0-9a-f-]{36})/i)?.[1] || null;
        if (input.customImage && input.customImage.startsWith('data:')) {
          const blob = dataUrlToBlob(input.customImage);
          const uploadRes = await api.uploadFile(blob, 'product', 'product.webp');
          imageId = uploadRes.id;
        }

        const isExisting = stateRef.current.products.some((p) => p.id === input.id);
        const payload = {
          name: input.name.trim(),
          englishName: input.en || '',
          categoryId: input.category,
          priceCents: bahtToCents(input.price),
          originalPriceCents: bahtToCents(input.original || input.price),
          stock: input.stock,
          badge: input.badge || '',
          description: input.description || '',
          active: input.active,
          imageId,
          imageIndex: input.image != null ? input.image : 0,
        };

        if (actorOf(stateRef.current)?.role === 'admin') {
          await api.saveAdminProduct(isExisting ? input.id : null, isExisting ? payload : {...payload, shopId: input.shopId});
        } else if (isExisting) {
          await api.updateSellerProduct(input.id, payload);
        } else {
          await api.createSellerProduct(payload);
        }
        await refreshProducts();
        notify('บันทึกสินค้าเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถบันทึกสินค้าได้');
        return false;
      }
    }
    return fallbackActions.saveProduct(input);
  };

  const deleteProduct = async (productId: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        if (actorOf(stateRef.current)?.role === 'admin') await api.deleteAdminProduct(productId);
        else await api.deleteSellerProduct(productId);
        await refreshProducts();
        notify('นำสินค้าออกจากการจำหน่ายแล้ว');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถลบสินค้าได้');
        return false;
      }
    }
    return fallbackActions.deleteProduct(productId);
  };

  const saveCategory = async (input: Category): Promise<boolean> => {
    if (apiConnected) {
      try {
        const isExisting = stateRef.current.categories.some((c) => c.id === input.id);
        if (isExisting) {
          await api.updateAdminCategory(input.id, {
            name: input.name,
            icon: input.icon,
            description: input.description,
            active: input.active,
          });
        } else {
          await api.createAdminCategory({
            name: input.name,
            icon: input.icon,
            description: input.description,
            active: input.active,
          });
        }
        await refreshCategories();
        notify('บันทึกหมวดหมู่เรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถบันทึกหมวดหมู่ได้');
        return false;
      }
    }
    return fallbackActions.saveCategory(input);
  };

  const deleteCategory = async (categoryId: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.deleteAdminCategory(categoryId);
        await refreshCategories();
        notify('ลบหมวดหมู่เรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถลบหมวดหมู่ได้');
        return false;
      }
    }
    return fallbackActions.deleteCategory(categoryId);
  };

  const saveContent = async (next: State['content']):Promise<boolean> => {
    if(user?.role!=='admin'||!apiConnected){notify('Content service unavailable');return false;}
    try {await persistContent(stateRef.current.content,next);const content=await loadContent(true);setState(prev=>({...prev,content}));notify('Saved');return true;}
    catch(err:any){notify(err.message||'Unable to save content');try{const content=await loadContent(true);setState(prev=>({...prev,content}));}catch{}return false;}
  };

  const savePromotion = async (input: Promotion): Promise<boolean> => {
    if (apiConnected) {
      try {
        const isExisting = stateRef.current.promotions.some((p) => p.id === input.id);
        const payload = {
          code: input.code.toUpperCase(),
          title: input.title,
          percent: input.percent,
          active: input.active,
          startsAt: input.startsAt || null,
          endsAt: input.endsAt || null,
          minSpendCents: input.minSpend ? bahtToCents(input.minSpend) : 0,
          maxDiscountCents: input.maxDiscount ? bahtToCents(input.maxDiscount) : null,
          usageLimit: input.usageLimit || null,
        };
        if (isExisting) {
          if(user?.role === 'admin')await api.updateAdminPromotion(input.id,{...payload,shopId:input.shopId||null});else await api.updateSellerPromotion(input.id,payload);
        } else {
          if(user?.role === 'admin')await api.createAdminPromotion({...payload,shopId:input.shopId||null});else await api.createSellerPromotion(payload);
        }
        await refreshPromotions();
        notify('บันทึกโปรโมชันเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถบันทึกโปรโมชันได้');
        return false;
      }
    }
    return fallbackActions.savePromotion(input);
  };

  const deletePromotion = async (promotionId: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        await (user?.role === 'admin' ? api.deleteAdminPromotion : api.deleteSellerPromotion)(promotionId);
        await refreshPromotions();
        notify('ลบโปรโมชันเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถลบโปรโมชันได้');
        return false;
      }
    }
    return fallbackActions.deletePromotion(promotionId);
  };

  const addReview = async (productId: string, rating: number, text: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.submitReview(productId, rating, text);
        await refreshReviews();
        await refreshProducts();
        notify('ขอบคุณสำหรับรีวิวสินค้า');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถส่งรีวิวได้');
        return false;
      }
    }
    return fallbackActions.addReview(productId, rating, text);
  };

  const replyReview = async (reviewId: string, text: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.replyReview(reviewId, text);
        await refreshReviews();
        notify('บันทึกคำตอบรีวิวแล้ว');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถบันทึกคำตอบได้');
        return false;
      }
    }
    return fallbackActions.replyReview(reviewId, text);
  };

  const moderateReview = async (reviewId: string, hidden: boolean, reason = ''): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.moderateReview(reviewId, hidden, reason);
        await refreshReviews();
        await refreshProducts();
        notify(hidden ? 'ซ่อนรีวิวเรียบร้อย' : 'แสดงรีวิวเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถดำเนินการกับรีวิวได้');
        return false;
      }
    }
    return fallbackActions.moderateReview(reviewId, hidden, reason);
  };

  const saveProfile = async (input: Partial<User>): Promise<boolean> => {
    if (apiConnected) {
      try {
        const saved=adaptUser(await api.updateProfile(input),actorOf(stateRef.current)?.shopId);
        setState(prev=>({...prev,users:prev.users.map(u=>u.id===saved.id?saved:u)}));
        notify('บันทึกข้อมูลส่วนตัวเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถบันทึกข้อมูลส่วนตัวได้');
        return false;
      }
    }
    return fallbackActions.saveProfile(input);
  };

  const changePassword = async (old: string, next: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.changePassword(old, next);
        await logout();
        notify('เปลี่ยนรหัสผ่านเรียบร้อย กรุณาเข้าสู่ระบบใหม่');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
        return false;
      }
    }
    return fallbackActions.changePassword(old, next);
  };

  const setUserBlocked = async (userId: string, blocked: boolean): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.setAdminUserBlocked(userId, blocked);
        await refreshData();
        notify(blocked ? 'ระงับการใช้งานสมาชิกแล้ว' : 'ปลดการระงับสมาชิกแล้ว');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถดำเนินการได้');
        return false;
      }
    }
    return fallbackActions.setUserBlocked(userId, blocked);
  };

  const saveAddress = async (input: Address): Promise<boolean> => {
    if (apiConnected) {
      try {
        const isExisting = stateRef.current.addresses.some((a) => a.id === input.id);
        if (isExisting) {
          await api.updateAddress(input.id, input);
        } else {
          await api.createAddress(input);
        }
        await refreshAddresses();
        notify('บันทึกที่อยู่เรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถบันทึกที่อยู่ได้');
        return false;
      }
    }
    return fallbackActions.saveAddress(input);
  };

  const deleteAddress = async (addressId: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        await api.deleteAddress(addressId);
        await refreshAddresses();
        notify('ลบที่อยู่จัดส่งเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถลบที่อยู่ได้');
        return false;
      }
    }
    return fallbackActions.deleteAddress(addressId);
  };

  const setDefaultAddress = async (addressId: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        const address=stateRef.current.addresses.find(a=>a.id===addressId);
        if(!address)return false;
        await api.updateAddress(addressId, {...address,isDefault:true});
        await refreshAddresses();
        notify('ตั้งเป็นที่อยู่หลักเรียบร้อย');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถตั้งเป็นที่อยู่หลักได้');
        return false;
      }
    }
    return fallbackActions.setDefaultAddress(addressId);
  };

  const saveSiteSettings = async (title: string, notice: string): Promise<boolean> => {
    if (apiConnected) {
      try {
        const saved=await api.updateAdminSettings({ siteTitle: title, siteNotice: notice });
        setState(prev=>({...prev,siteTitle:saved.siteTitle,siteNotice:saved.siteNotice}));
        notify('บันทึกการตั้งค่าเว็บไซต์แล้ว');
        return true;
      } catch (err: any) {
        notify(err.message || 'ไม่สามารถบันทึกการตั้งค่าได้');
        return false;
      }
    }
    return fallbackActions.saveSiteSettings(title, notice);
  };

  const markNotificationsRead = async (): Promise<void> => {
    if (apiConnected) {
      try {
        await api.markAllNotificationsRead();
      } catch {
        // ignore
      }
    }
    fallbackActions.markNotificationsRead();
  };

  const lastVisit=useRef({key:'',at:0});
  const recordVisit = (page: any) => {
    const key=String(stateRef.current.currentUserId)+':'+page;
    if(lastVisit.current.key===key&&Date.now()-lastVisit.current.at<1000)return;
    lastVisit.current={key,at:Date.now()};
    if (apiConnected) {
      void api.recordVisit(page);
    }
    fallbackActions.recordVisit(page);
  };

  const resetDemo = async () => {
    readBlockedRef.current = false;
    setReadBlocked(false);
    await logout();
    fallbackActions.resetDemo();
    await refreshPublicData();
  };

  const user = actorOf(state);
  const role: Role = user?.role || 'guest';

  const combinedActions = {
    ...fallbackActions,
    notify,
    setRole,
    addCart,
    updateCart,
    toggleWish,
    quoteCart,
    checkout,
    updateOrder,
    rejectPayment,
    resubmitPayment,
    completeRefund,
    approveShop,
    suspendShop,
    saveShop,
    applyShop,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
    saveContent,
    savePromotion,
    deletePromotion,
    addReview,
    replyReview,
    moderateReview,
    register,
    login,
    logout,
    saveProfile,
    changePassword,
    setUserBlocked,
    saveAddress,
    deleteAddress,
    setDefaultAddress,
    saveSiteSettings,
    markNotificationsRead,
    recordVisit,
    resetDemo,
  };

  const retryStorage = () => {
    if (!readBlocked) {
      persist(stateRef.current);
      return;
    }
    const next = initialLocalState();
    storageErrorRef.current = next.error;
    setStorageError(next.error);
    if (!next.readBlocked) {
      readBlockedRef.current = false;
      setReadBlocked(false);
      setState(next.state);
    }
  };

  const downloadBackup = () => {
    try {
      const data = readBlocked
        ? localStorage.getItem(STATE_KEY) ?? localStorage.getItem('bloom-healthshop-demo-v1')
        : JSON.stringify(stateRef.current, null, 2);
      if (data === null) {
        notify('ไม่มีข้อมูลเดิมให้ดาวน์โหลด');
        return;
      }
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bloom-local-backup.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      notify('อ่านข้อมูลเพื่อดาวน์โหลดไม่ได้');
    }
  };

  return (
    <Store.Provider
      value={{
        state,
        setState,
        user,
        role,
        toast,
        apiConnected,
        refreshData,
        ...combinedActions,
      }}
    >
      {storageError && !apiConnected && (
        <div className="storage-warning" role="alert">
          <div>
            <strong>มีข้อมูลที่ยังไม่ถูกบันทึก</strong>
            <p>{storageError}</p>
          </div>
          <div>
            <button onClick={retryStorage}>{readBlocked ? 'ลองอ่านข้อมูลอีกครั้ง' : 'ลองบันทึกอีกครั้ง'}</button>
            <button onClick={downloadBackup}>ดาวน์โหลดข้อมูลเก็บไว้</button>
            <button
              onClick={() => {
                setStorageError('');
                setReadBlocked(false);
                readBlockedRef.current = false;
                try {
                  localStorage.removeItem(STATE_KEY);
                  localStorage.removeItem('bloom_healthshop_v1');
                  localStorage.removeItem('bloom-healthshop-demo-v1');
                } catch {}
              }}
            >
              ล้างแคชเก่า
            </button>
          </div>
        </div>
      )}
      {initialized ? children : <div role="status" style={{padding:48,textAlign:'center'}}>Loading Bloom...</div>}
    </Store.Provider>
  );
}

export const useStore = () => useContext(Store);
