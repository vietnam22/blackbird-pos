export const MENU = [
  { name: 'Americano', price: 150 },
  { name: 'Latte', price: 180 },
  { name: 'Cappuccino', price: 180 },
  { name: 'Espresso', price: 120 },
  { name: 'Momo (Steam)', price: 180 },
  { name: 'Momo (Fried)', price: 200 },
  { name: 'Sandwich', price: 160 },
  { name: 'Brownie', price: 140 },
]

export const PAYMENT_MODES = [
  { id: 'cash', label: 'Cash', color: '#2d5a2d' },
  { id: 'qr', label: 'QR Payment', color: '#2d4a6d' },
  { id: 'cash_qr', label: 'Cash + QR', color: '#5a4a2d' },
  { id: 'credit', label: 'Credit', color: '#6d2d2d' },
]

export const TABLES = [
  { name: 'Table 4', style: { gridColumn: '4 / 6', gridRow: '1 / 3' } },
  { name: 'Table 3', style: { gridColumn: '6 / 9', gridRow: '1 / 3' } },
  { name: 'Table 1', style: { gridColumn: '9 / 11', gridRow: '1 / 2' } },
  { name: 'Table 2', style: { gridColumn: '9 / 11', gridRow: '2 / 3' } },
  { name: 'Table 5', style: { gridColumn: '4 / 6', gridRow: '3 / 5' } },
  { name: 'Table 6', style: { gridColumn: '4 / 6', gridRow: '5 / 7' } },
  { name: 'Counter', style: { gridColumn: '6 / 9', gridRow: '4 / 7', fontSize: '18px' } },
  { name: 'Table 8', style: { gridColumn: '2 / 4', gridRow: '7 / 9' } },
  { name: 'Table 7', style: { gridColumn: '4 / 6', gridRow: '7 / 9' } },
]

export const INVENTORY_UNITS = [
  { id: 'kg', label: 'Kilogram (kg)' },
  { id: 'gm', label: 'Gram (gm)' },
  { id: 'L', label: 'Liter (L)' },
  { id: 'ML', label: 'Milliliter (ML)' },
  { id: 'pcs', label: 'Pieces (pcs)' },
  { id: 'cart', label: 'Carton (cart)' },
]