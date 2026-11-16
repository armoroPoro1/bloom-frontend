import type {Order, PaymentStatus, Shop} from './types';

export const paymentLabels: Record<PaymentStatus, string> = {
  awaiting_review: 'รอตรวจหลักฐาน', rejected: 'รอแก้ไขหลักฐาน', paid: 'ชำระแล้ว',
  unpaid: 'ยังไม่ได้ชำระ', refund_pending: 'รอคืนเงินตัวอย่าง', refunded: 'คืนเงินตัวอย่างแล้ว',
};

/** Calendar date for the Thai storefront, independent of the browser's timezone. */
export function orderDay(value: string | Date): string {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : '';
}

export function orderPayment(order: Order): PaymentStatus {
  if (order.paymentStatus) return order.paymentStatus;
  if (['paid', 'preparing', 'shipped', 'delivered'].includes(order.status)) return 'paid';
  return order.status === 'pending' && order.receipt ? 'awaiting_review' : 'unpaid';
}

export function isPaidSale(order: Order): boolean {
  return ['paid', 'preparing', 'shipped', 'delivered'].includes(order.status) && orderPayment(order) === 'paid';
}

export type OrderFilters = {from?: string; to?: string; shopId?: string; status?: string; payment?: string; query?: string};
export function filterManagementOrders(orders: Order[], filters: OrderFilters = {}): Order[] {
  const query = filters.query?.trim().toLocaleLowerCase() || '';
  if (filters.from && filters.to && filters.from > filters.to) return [];
  return orders.filter(order => {
    const day = orderDay(order.date);
    return (!filters.from || !!day && day >= filters.from) && (!filters.to || !!day && day <= filters.to)
      && (!filters.shopId || filters.shopId === 'all' || order.shopId === filters.shopId)
      && (!filters.status || filters.status === 'all' || order.status === filters.status)
      && (!filters.payment || filters.payment === 'all' || orderPayment(order) === filters.payment)
      && (!query || [order.id, order.buyer, order.phone, order.tracking, order.carrier].filter(Boolean).join(' ').toLocaleLowerCase().includes(query));
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function summarizeSales(orders: Order[]) {
  return orders.reduce((summary, order) => {
    if (isPaidSale(order)) {
      summary.paidCount++;
      summary.grossItems += order.subtotal;
      summary.discounts += order.discount;
      summary.netItems += order.subtotal - order.discount;
      summary.shipping += order.shipping;
      summary.paidTotal += order.total;
      summary.units += order.items.reduce((quantity, item) => quantity + item.quantity, 0);
    }
    if (order.status === 'pending') summary.pendingTotal += order.total;
    if (order.status === 'cancelled') {
      summary.cancelledCount++;
      if (orderPayment(order) === 'refund_pending') summary.refundPending += order.total;
      if (orderPayment(order) === 'refunded') summary.refunded += order.total;
    }
    return summary;
  }, {paidCount: 0, grossItems: 0, discounts: 0, netItems: 0, shipping: 0, paidTotal: 0, units: 0, pendingTotal: 0, refundPending: 0, refunded: 0, cancelledCount: 0});
}

export function salesByShop(orders: Order[], shops: Pick<Shop, 'id' | 'name'>[]) {
  return [...new Set(orders.map(order => order.shopId))].map(shopId => ({
    shopId,
    name: shops.find(shop => shop.id === shopId)?.name || 'ร้านค้าที่ไม่อยู่ในรายการ',
    ...summarizeSales(orders.filter(order => order.shopId === shopId)),
  })).sort((a, b) => b.netItems - a.netItems || a.name.localeCompare(b.name));
}

/** Quote CSV fields and protect user-provided text without changing numeric values. */
export function csvText(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const text = String(value);
    const safe = typeof value === 'number' && Number.isFinite(value) ? text : (/^[\s]*[=+\-@]|^[\t\r\n]/.test(text) ? "'" + text : text);
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  return '\ufeff' + [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
}

export function downloadManagementCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const url = URL.createObjectURL(new Blob([csvText(headers, rows)], {type: 'text/csv;charset=utf-8'}));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const sharedViews = ['overview', 'products', 'orders', 'reports', 'reviews', 'promotions', 'inventory', 'settings'] as const;
const adminViews = ['shops', 'members', 'categories', 'content', 'usage'] as const;
export type ManagementView = typeof sharedViews[number] | typeof adminViews[number];
export function readManagementRoute(mode: 'seller' | 'admin', hash: string): {view: ManagementView; orderId: string | null} {
  const [page, query = ''] = hash.replace(/^#/, '').split('?');
  if (page !== mode) return {view: 'overview', orderId: null};
  const params = new URLSearchParams(query);
  const value = params.get('view') || (params.has('order') ? 'orders' : 'overview');
  const permitted = [...sharedViews, ...(mode === 'admin' ? adminViews : [])] as readonly string[];
  return {view: permitted.includes(value) ? value as ManagementView : 'overview', orderId: params.get('order') || null};
}
