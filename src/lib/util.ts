export function genCoupon(amount: number) {
  const chunk = () => Math.random().toString(36).substring(2, 6).toUpperCase()
  return `KAL-${amount}-${chunk()}-${chunk()}`
}
