import {normalizeState} from './domain';
import type {State} from './types';

export const STATE_KEY = 'bloom-healthshop-demo-v2';
export type LocalStoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type LoadedState = {state: State; error: string; readBlocked: boolean};

const records = (value: unknown): value is Record<string, unknown>[] => Array.isArray(value) && value.every(item => item !== null && typeof item === 'object' && !Array.isArray(item));
const textFields = (value: Record<string, unknown>, fields: string[]) => fields.every(field => typeof value[field] === 'string');
const numbers = (value: Record<string, unknown>, fields: string[]) => fields.every(field => typeof value[field] === 'number' && Number.isFinite(value[field]));

function canRender(state: State): boolean {
  const lists = [state.products, state.shops, state.users, state.orders, state.addresses, state.categories, state.reviews, state.promotions, state.stockMovements, state.notifications, state.auditLog, state.visits];
  if (lists.some(list => !records(list))) return false;
  if (state.products.some(p => !textFields(p, ['id','name','en','category','shopId','description']) || !numbers(p, ['price','original','image','rating','reviews','stock']))) return false;
  if (state.shops.some(s => !textFields(s, ['id','name','owner','email','description','status','date']))) return false;
  if (state.users.some(u => !textFields(u, ['id','name','email','phone','address','role']))) return false;
  if (state.orders.some(o => !textFields(o, ['id','date','buyerId','buyer','shopId','status','address','payment']) || !numbers(o, ['subtotal','shipping','discount','total']) || !records(o.items) || o.items.some(i => !textFields(i, ['productId','name']) || !numbers(i, ['price','quantity','image'])) || !records(o.history))) return false;
  if (!Array.isArray(state.cart) || state.cart.some(i => !i || typeof i.productId !== 'string' || !Number.isInteger(i.quantity) || i.quantity < 1)) return false;
  if (!Array.isArray(state.wishlist) || state.wishlist.some(i => typeof i !== 'string')) return false;
  if (Object.values(state.carts).some(items => !Array.isArray(items) || items.some(i => !i || typeof i.productId !== 'string' || !Number.isInteger(i.quantity) || i.quantity < 1))) return false;
  if (Object.values(state.wishlists).some(items => !Array.isArray(items) || items.some(i => typeof i !== 'string'))) return false;
  if (!records(state.content.articles) || !records(state.content.foods) || !records(state.content.mealTemplates) || !records(state.content.exerciseTemplates)) return false;
  if (state.content.articles.some(a => !textFields(a, ['id','title','category','subtitle','time','image','tag']) || !Array.isArray(a.paras) || a.paras.some(p => typeof p !== 'string'))) return false;
  if (state.content.foods.some(f => !textFields(f, ['id','name','detail','group']) || !numbers(f, ['kcal']))) return false;
  if (state.content.mealTemplates.some(t => !textFields(t, ['id','name','description']) || !records(t.entries) || t.entries.some(e => !textFields(e, ['foodId','meal']) || !numbers(e, ['portions'])))) return false;
  if (state.content.exerciseTemplates.some(t => !textFields(t, ['id','name','description']) || !Array.isArray(t.days) || t.days.length !== 7 || t.days.some(day => !records(day) || day.some(a => !textFields(a, ['id','name','type']) || !numbers(a, ['minutes']))))) return false;
  return typeof state.siteTitle === 'string' && typeof state.siteNotice === 'string';
}

/** A failed read never overwrites the original browser record. */
export function loadLocalState(storage: LocalStoragePort, base: State): LoadedState {
  try {
    const saved = storage.getItem(STATE_KEY) ?? storage.getItem('bloom-healthshop-demo-v1');
    if (saved === null) return {state: normalizeState(undefined, base), error: '', readBlocked: false};
    const value = JSON.parse(saved);
    if (!value || typeof value !== 'object' || !records(value.products) || !records(value.users) || !records(value.orders)) throw new Error('invalid saved data');
    for (const field of ['products','shops','users','orders','addresses','categories','reviews','promotions','stockMovements','notifications','auditLog','visits'])
      if (field in value && !records(value[field])) throw new Error('invalid saved collection');
    for (const field of ['cart','wishlist']) if (field in value && !Array.isArray(value[field])) throw new Error('invalid saved list');
    for (const field of ['carts','wishlists','content']) if (field in value && (!value[field] || typeof value[field] !== 'object' || Array.isArray(value[field]))) throw new Error('invalid saved map');
    if (value.content) for (const field of ['articles','foods','mealTemplates','exerciseTemplates'])
      if (field in value.content && !records(value.content[field])) throw new Error('invalid saved content');
    const state = normalizeState(value, base);
    if (!canRender(state)) throw new Error('invalid saved fields');
    return {state, error: '', readBlocked: false};
  } catch {
    return {state: normalizeState(undefined, base), error: 'อ่านข้อมูลเดิมในเบราว์เซอร์ไม่ได้ จึงแสดงข้อมูลตัวอย่างชั่วคราว ข้อมูลเดิมยังไม่ถูกเขียนทับ', readBlocked: true};
  }
}

export function persistLocalState(storage: LocalStoragePort, state: State): string {
  try { storage.setItem(STATE_KEY, JSON.stringify(state)); return ''; }
  catch { return 'การเปลี่ยนแปลงล่าสุดยังไม่ได้บันทึก อาจเกิดจากพื้นที่จัดเก็บเต็มหรือเบราว์เซอร์ปิดการจัดเก็บข้อมูล'; }
}
