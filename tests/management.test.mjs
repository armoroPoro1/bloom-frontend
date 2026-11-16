import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const compiled = await build({stdin: {contents: "export * from './src/managementReports';", resolveDir: root, loader: 'ts'}, bundle: true, platform: 'node', format: 'esm', write: false});
const {filterManagementOrders, summarizeSales, salesByShop, orderDay, orderPayment, csvText, readManagementRoute} = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const order = overrides => ({id: 'O1', date: '2026-11-14T01:00:00.000Z', buyerId: 'u1', buyer: 'Prim', shopId: 's1', items: [{productId: 'p1', name: 'สินค้า', price: 500, quantity: 2, image: 0}], subtotal: 1000, discount: 100, shipping: 40, total: 940, status: 'paid', payment: 'demo', paymentStatus: 'paid', address: 'เชียงใหม่', ...overrides});

test('sales report separates paid merchandise, delivery and cancelled refund obligations', () => {
  const summary = summarizeSales([
    order({}),
    order({id: 'O2', shopId: 's2', status: 'shipped', subtotal: 500, discount: 50, shipping: 0, total: 450, items: [{productId: 'p2', name: 'สินค้า 2', price: 500, quantity: 1, image: 1}]}),
    order({id: 'O3', status: 'pending', paymentStatus: 'rejected', total: 300}),
    order({id: 'O4', status: 'cancelled', paymentStatus: 'refund_pending', total: 200}),
    order({id: 'O5', status: 'cancelled', paymentStatus: 'refunded', total: 100}),
    order({id: 'O6', status: 'cancelled', paymentStatus: 'unpaid', total: 80}),
  ]);
  assert.deepEqual(summary, {paidCount: 2, grossItems: 1500, discounts: 150, netItems: 1350, shipping: 40, paidTotal: 1390, units: 3, pendingTotal: 300, refundPending: 200, refunded: 100, cancelledCount: 3});
  assert.equal(summarizeSales([order({paymentStatus: 'rejected'})]).paidCount, 0);
  assert.equal(summarizeSales([order({paymentStatus: undefined})]).paidTotal, 940, 'legacy paid order still belongs to sales');
});

test('inclusive report date filter uses Thai midnight and rejects reversed ranges', () => {
  const orders = [
    order({id: 'before', date: '2026-11-13T16:59:59.000Z'}),
    order({id: 'first', date: '2026-11-13T17:00:00.000Z'}),
    order({id: 'last', date: '2026-11-14T16:59:59.000Z'}),
    order({id: 'after', date: '2026-11-14T17:00:00.000Z'}),
  ];
  assert.deepEqual(filterManagementOrders(orders, {from: '2026-11-14', to: '2026-11-14'}).map(o => o.id), ['last', 'first']);
  assert.deepEqual(filterManagementOrders(orders, {from: '2026-11-15', to: '2026-11-14'}), []);
  assert.equal(orderDay('invalid-date'), '');
});

test('payment and shop queues compose with tracking search without widening scope', () => {
  const orders = [order({id: 'own', status: 'shipped', tracking: 'TH-123'}), order({id: 'other', shopId: 's2', status: 'shipped', tracking: 'TH-123'}), order({id: 'pending', status: 'pending', paymentStatus: 'awaiting_review', tracking: 'TH-123'})];
  assert.deepEqual(filterManagementOrders(orders, {shopId: 's1', status: 'shipped', payment: 'paid', query: '  th-123  '}).map(o => o.id), ['own']);
  assert.deepEqual(filterManagementOrders(orders, {payment: 'awaiting_review'}).map(o => o.id), ['pending']);
  assert.equal(orderPayment(order({paymentStatus: undefined, status: 'pending', receipt: 'proof'})), 'awaiting_review');
});

test('shop summaries preserve store attribution and include zero-sales refund rows', () => {
  const summary = salesByShop([order({}), order({id: 'cancel', shopId: 's2', status: 'cancelled', paymentStatus: 'refund_pending', total: 300})], [{id: 's1', name: 'Bloom'}, {id: 's2', name: 'Rose'}]);
  assert.equal(summary[0].name, 'Bloom'); assert.equal(summary[0].netItems, 900);
  assert.equal(summary[1].name, 'Rose'); assert.equal(summary[1].netItems, 0); assert.equal(summary[1].refundPending, 300);
  assert.deepEqual(salesByShop([], []), []);
});

test('CSV keeps numeric negative values and neutralizes formula-like user text', () => {
  const csv = csvText(['จำนวน', 'ข้อความ'], [[-2, '=SUM(A1:A2)'], [3, 'ชื่อ, "สินค้า"\nบรรทัด 2'], [0, '\t@formula']]);
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes('"-2","\'=SUM(A1:A2)"'));
  assert.ok(csv.includes('"ชื่อ, ""สินค้า""\nบรรทัด 2"'));
  assert.ok(csv.includes('"\'\t@formula"'));
});

test('management URLs retain view and order while excluding admin-only seller views', () => {
  assert.deepEqual(readManagementRoute('seller', '#seller?view=orders&order=BH%2F123'), {view: 'orders', orderId: 'BH/123'});
  assert.deepEqual(readManagementRoute('admin', '#admin?view=members'), {view: 'members', orderId: null});
  assert.deepEqual(readManagementRoute('seller', '#seller?view=members'), {view: 'overview', orderId: null});
  assert.deepEqual(readManagementRoute('seller', '#seller?order=BH1'), {view: 'orders', orderId: 'BH1'});
  assert.deepEqual(readManagementRoute('admin', '#shop?view=reports'), {view: 'overview', orderId: null});
});
