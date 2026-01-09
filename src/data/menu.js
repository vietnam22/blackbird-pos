export const MENU_CATEGORIES = [
  { id: 'coffee', name: 'Coffee', icon: '☕' },
  { id: 'chilled', name: 'Chilled Drinks', icon: '🧊' },
  { id: 'tea', name: 'Tea', icon: '🍵' },
  { id: 'herbal', name: 'Herbal/Green Tea', icon: '🌿' },
  { id: 'smoke', name: 'Smoke', icon: '🚬' },
  { id: 'kitchen', name: 'Our Little Kitchen', icon: '🍳' },
  { id: 'breakfast', name: 'Breakfast', icon: '🥞' },
]

export const MENU = [
  // ═══════════════════════════════════════════════════
  // COFFEE (Hot/Ice)
  // ═══════════════════════════════════════════════════
  { name: 'Espresso', price: 90, category: 'coffee' },
  { name: 'Americano (S)', price: 110, category: 'coffee' },
  { name: 'Americano (D)', price: 120, category: 'coffee' },
  { name: 'Doppio', price: 130, category: 'coffee' },
  { name: 'Mocha (Hot)', price: 190, category: 'coffee' },
  { name: 'Mocha (Ice)', price: 210, category: 'coffee' },
  { name: 'Lungo', price: 130, category: 'coffee' },
  { name: 'Latte (Hot)', price: 190, category: 'coffee' },
  { name: 'Latte (Ice)', price: 210, category: 'coffee' },
  { name: 'Double Latte (Hot)', price: 210, category: 'coffee' },
  { name: 'Double Latte (Ice)', price: 230, category: 'coffee' },
  { name: 'Ristretto', price: 90, category: 'coffee' },
  { name: 'Cappuccino (Hot)', price: 170, category: 'coffee' },
  { name: 'Cappuccino (Ice)', price: 200, category: 'coffee' },
  { name: 'Macchiato (Hot)', price: 140, category: 'coffee' },
  { name: 'Macchiato (Ice)', price: 180, category: 'coffee' },
  { name: 'Flat White', price: 180, category: 'coffee' },
  { name: 'Affogato', price: 210, category: 'coffee' },
  { name: 'Breve', price: 170, category: 'coffee' },
  { name: 'Cafe Bombom', price: 200, category: 'coffee' },
  { name: 'Golden Spice Latte (Hot)', price: 170, category: 'coffee' },
  { name: 'Golden Spice Latte (Ice)', price: 190, category: 'coffee' },
  { name: 'Hot Chocolate', price: 190, category: 'coffee' },

  // ═══════════════════════════════════════════════════
  // CHILLED DRINKS
  // ═══════════════════════════════════════════════════
  { name: 'Oreo Milkshake', price: 210, category: 'chilled' },
  { name: 'Kitkat Shake', price: 230, category: 'chilled' },
  { name: 'Peach Iced Tea', price: 160, category: 'chilled' },
  { name: 'Apple Iced Tea', price: 160, category: 'chilled' },
  { name: 'Lemon Iced Tea', price: 160, category: 'chilled' },
  { name: 'Lemonade', price: 110, category: 'chilled' },
  { name: 'Plain Lassi', price: 120, category: 'chilled' },
  { name: 'Chocolate Lassi', price: 150, category: 'chilled' },
  { name: 'Ice Cream Lassi', price: 160, category: 'chilled' },
  { name: 'Coke', price: 70, category: 'chilled' },
  { name: 'Sprite', price: 70, category: 'chilled' },
  { name: 'Lemon Sprite', price: 80, category: 'chilled' },

  // ═══════════════════════════════════════════════════
  // TEA
  // ═══════════════════════════════════════════════════
  { name: 'Milk Tea Small', price: 30, category: 'tea' },
  { name: 'Milk Tea Medium', price: 45, category: 'tea' },
  { name: 'Masala Milk Tea', price: 45, category: 'tea' },
  { name: 'Masala Milk Tea Medium', price: 60, category: 'tea' },
  { name: 'Mataka Tea', price: 100, category: 'tea' },
  { name: 'Black Tea', price: 25, category: 'tea' },
  { name: 'Lemon Tea', price: 30, category: 'tea' },
  { name: 'Hot Lemon', price: 30, category: 'tea' },
  { name: 'Hot Lemon Ginger Honey', price: 140, category: 'tea' },

  // ═══════════════════════════════════════════════════
  // HERBAL/GREEN TEA
  // ═══════════════════════════════════════════════════
  { name: 'Hibiscus Tea', price: 120, category: 'herbal' },
  { name: 'Butterfly Pea Tea', price: 0, category: 'herbal', priceOnRequest: true },
  { name: 'Spearmint Tea', price: 0, category: 'herbal', priceOnRequest: true },
  { name: 'Peppermint Tea', price: 0, category: 'herbal', priceOnRequest: true },
  { name: 'Tulsi Tea', price: 0, category: 'herbal', priceOnRequest: true },
  { name: 'Chamomile Tea', price: 0, category: 'herbal', priceOnRequest: true },
  { name: 'LemonGrass Tea', price: 0, category: 'herbal', priceOnRequest: true },
  { name: 'Green Tea', price: 60, category: 'herbal' },

  // ═══════════════════════════════════════════════════
  // SMOKE
  // ═══════════════════════════════════════════════════
  { name: 'Mint Cloud Hukka', price: 400, category: 'smoke' },
  { name: 'Min Cloud Hukka-Discounted', price: 350, category: 'smoke' },
  { name: 'Hukka Head Change', price: 250, category: 'smoke' },
  { name: 'Surya Red', price: 25, category: 'smoke' },
  { name: 'Surya Light', price: 25, category: 'smoke' },
  { name: 'Surya Fusion', price: 25, category: 'smoke' },
  { name: 'Surya Sleek Bolt', price: 25, category: 'smoke' },
  { name: 'Sikhar Ice', price: 20, category: 'smoke' },
  

  // ═══════════════════════════════════════════════════
  // OUR LITTLE KITCHEN
  // ═══════════════════════════════════════════════════
  { name: 'Dozen Chicken MoMo', price: 200, category: 'kitchen' },
  { name: 'Chowmin (Veg)', price: 110, category: 'kitchen' },
  { name: 'Chowmin (Egg)', price: 140, category: 'kitchen' },
  { name: 'Chowmin (Chicken)', price: 180, category: 'kitchen' },
  { name: 'Chicken Keema Noodle', price: 190, category: 'kitchen' },
  { name: 'Chicken Keema Lachha Paratha', price: 170, category: 'kitchen' },
  { name: 'Lachha Paratha in Ghee', price: 70, category: 'kitchen' },
  { name: 'Chicken Nuggets', price: 220, category: 'kitchen' },
  { name: 'French Fries', price: 160, category: 'kitchen' },
  { name: 'Sausage Sticks', price: 50, category: 'kitchen' },
  { name: 'Popcorn (Ghee)', price: 100, category: 'kitchen' },
  { name: 'Popcorn (Cheese)', price: 150, category: 'kitchen' },
  { name: '2pm (Plain)', price: 100, category: 'kitchen' },
  { name: '2pm (Egg)', price: 140, category: 'kitchen' },
  { name: '2pm (Sausage)', price: 150, category: 'kitchen' },
  { name: 'ChowChow Peanut Sandheko', price: 90, category: 'kitchen' },

  // ═══════════════════════════════════════════════════
  // BREAKFAST
  // ═══════════════════════════════════════════════════
  { name: 'Kodo Pancake', price: 0, category: 'breakfast', priceOnRequest: true },
  { name: 'Sweet Makai Pancake', price: 0, category: 'breakfast', priceOnRequest: true },
  { name: 'Wholewheat Pancake', price: 0, category: 'breakfast', priceOnRequest: true },
  { name: 'French Toast', price: 0, category: 'breakfast', priceOnRequest: true },
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