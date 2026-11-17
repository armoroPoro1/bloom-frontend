export type CartLine = {productId: string; quantity: number};

// Share the exact write path between the React store and integration tests.
export function createCartWriter(deps: {
  account: () => string | null;
  cart: () => CartLine[];
  write: (productId: string, quantity: number) => Promise<CartLine>;
  apply: (line: CartLine) => void;
  error: (message: string) => void;
}) {
  let pending = Promise.resolve(true);
  return {
    idle: () => pending,
    update(productId: string, quantity: (current: number) => number) {
      const account = deps.account();
      pending = pending.then(async () => {
        if (deps.account() !== account) return false;
        const next = quantity(deps.cart().find(item => item.productId === productId)?.quantity ?? 0);
        if (!Number.isInteger(next) || next < 0) throw new Error('จำนวนสินค้าไม่ถูกต้อง');
        const item = await deps.write(productId, next);
        if (deps.account() !== account) return false;
        if (!item || item.productId !== productId || !Number.isInteger(item.quantity) || item.quantity < 0) {
          throw new Error('ข้อมูลตะกร้าจากเซิร์ฟเวอร์ไม่ถูกต้อง กรุณาลองใหม่');
        }
        deps.apply({productId: item.productId, quantity: item.quantity});
        return true;
      }).catch(error => {
        if (deps.account() === account) deps.error(error instanceof Error ? error.message : 'บันทึกตะกร้าไม่สำเร็จ');
        return false;
      });
      return pending;
    },
  };
}
