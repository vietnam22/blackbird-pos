import { useState, useEffect } from 'react'
import { api } from '../utils/api'

// Menu categories configuration
const MENU_CATEGORIES = [
  { id: 'coffee', name: 'Coffee', icon: '☕' },
  { id: 'chilled', name: 'Chilled Drinks', icon: '🧊' },
  { id: 'tea', name: 'Tea', icon: '🍵' },
  { id: 'herbal', name: 'Herbal Tea', icon: '🌿' },
  { id: 'smoke', name: 'Smoke', icon: '💨' },
  { id: 'kitchen', name: 'Kitchen', icon: '🍽️' },
]

const TABLES = [
  'Table 1', 'Table 2', 'Table 3', 'Table 4',
  'Table 5', 'Table 6', 'Table 7', 'Table 8', 'Counter'
]

function BillView({ table, tab, onBack, onUpdate, onSettle, user, openTabs, onTransfer }) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState(['coffee'])
  const [customerName, setCustomerName] = useState(tab?.customerName || '')
  const [editingCustomer, setEditingCustomer] = useState(false)

  useEffect(() => { loadMenu() }, [])
  
  const loadMenu = async () => {
    setMenuLoading(true)
    const data = await api.getMenu()
    setMenuItems(data.items || [])
    setMenuLoading(false)
  }

  useEffect(() => {
    setCustomerName(tab?.customerName || '')
  }, [tab?.customerName])

  const items = tab?.items || []
  const total = items.reduce((sum, item) => sum + item.price, 0)

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    )
  }

  const menuByCategory = MENU_CATEGORIES.map(category => ({
    ...category,
    items: menuItems.filter(item => item.category === category.id)
  }))

  const getVacantTables = () => {
    return TABLES.filter(t => {
      if (t === table) return false
      const tableTab = openTabs?.[t]
      return !tableTab || !tableTab.items || tableTab.items.length === 0
    })
  }

  const handleTransfer = async (targetTable) => {
    const result = await api.transferTable(table, targetTable)
    if (result.success) {
      setShowTransferModal(false)
      onTransfer?.(targetTable)
    }
  }

  const handleAddItem = async (item) => {
    const result = await api.addToTab(table, item, user.name, customerName)
    if (result.success) onUpdate?.(result.tab)
  }

  const handleRemoveItem = async (index) => {
    const result = await api.removeFromTab(table, index)
    if (result.success) onUpdate?.(result.tab)
  }

  const groupedItems = items.reduce((acc, item, index) => {
    const existing = acc.find(g => g.name === item.name && g.price === item.price)
    if (existing) {
      existing.quantity++
      existing.indices.push(index)
    } else {
      acc.push({ ...item, quantity: 1, indices: [index] })
    }
    return acc
  }, [])

  const handleRemoveFromGroup = async (group) => {
    const lastIndex = group.indices[group.indices.length - 1]
    await handleRemoveItem(lastIndex)
  }

  const handleCustomerNameChange = (e) => {
    let value = e.target.value
    value = value.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    setCustomerName(value)
  }

  const handleUpdateCustomerName = async () => {
    const result = await api.updateCustomerName(table, customerName)
    if (result.success) {
      setEditingCustomer(false)
      onUpdate?.(result.tab)
    }
  }

  // In BillView.jsx - UPDATE this function:
  const handleCancelBill = async () => {
  const result = await api.cancelBill(table)
  if (result.success) {
    setShowCancelConfirm(false)
    await onUpdate?.()  // ✅ Refresh the data first
    onBack?.()          // Then go back to floor view
  }
}

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h2 style={styles.title}>{table}</h2>
        <div style={styles.headerActions}>
          {items.length > 0 && (
            <button onClick={() => setShowTransferModal(true)} style={styles.transferButton}>↔ Transfer</button>
          )}
        </div>
      </header>

      <div style={styles.customerSection}>
        {editingCustomer ? (
          <div style={styles.customerEditRow}>
            <input
              type="text"
              value={customerName}
              onChange={handleCustomerNameChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateCustomerName()
                else if (e.key === 'Escape') { setEditingCustomer(false); setCustomerName(tab?.customerName || '') }
              }}
              placeholder="Customer name"
              style={styles.customerInput}
              autoFocus
            />
            <button onClick={handleUpdateCustomerName} style={styles.customerSaveButton}>✓</button>
            <button onClick={() => { setEditingCustomer(false); setCustomerName(tab?.customerName || '') }} style={styles.customerCancelButton}>✕</button>
          </div>
        ) : (
          <div style={styles.customerDisplayRow} onClick={() => setEditingCustomer(true)}>
            <span style={styles.customerLabel}>
              {customerName ? <>👤 {customerName}</> : <span style={styles.noCustomer}>+ Add customer name</span>}
            </span>
          </div>
        )}
      </div>

      <div style={styles.content}>
        <div style={styles.menuSection}>
          <h3>Menu</h3>
          {menuLoading ? (
            <p style={styles.emptyText}>Loading menu...</p>
          ) : (
            <div style={styles.categoryList}>
              {menuByCategory.map((category) => (
                <div key={category.id} style={styles.categoryContainer}>
                  <button onClick={() => toggleCategory(category.id)} style={styles.categoryHeader}>
                    <span style={styles.categoryTitle}>
                      <span style={styles.categoryIcon}>{category.icon}</span>
                      {category.name}
                      <span style={styles.categoryCount}>({category.items.length})</span>
                    </span>
                    <span style={styles.expandIcon}>{expandedCategories.includes(category.id) ? '▼' : '▶'}</span>
                  </button>
                  {expandedCategories.includes(category.id) && (
                    <div style={styles.menuGrid}>
                      {category.items.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => !item.priceOnRequest && handleAddItem(item)}
                          style={{ ...styles.menuItem, ...(item.priceOnRequest ? styles.menuItemDisabled : {}) }}
                          disabled={item.priceOnRequest}
                        >
                          <span style={styles.menuItemName}>{item.name}</span>
                          <span style={styles.menuItemPrice}>{item.priceOnRequest ? '—' : `Rs. ${item.price}`}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.orderSection}>
          <h3>Current Order</h3>
          {items.length === 0 ? (
            <p style={styles.emptyText}>No items yet</p>
          ) : (
            <>
              <div style={styles.orderList}>
                {groupedItems.map((group, idx) => (
                  <div key={idx} style={styles.orderItem}>
                    <span>{group.name}{group.quantity > 1 && <span style={styles.quantityBadge}> x{group.quantity}</span>}</span>
                    <div style={styles.orderItemRight}>
                      <span>Rs. {group.price * group.quantity}</span>
                      <button onClick={() => handleRemoveFromGroup(group)} style={styles.removeButton}>−</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.totalRow}>
                <span>Total</span>
                <span style={styles.totalAmount}>Rs. {total}</span>
              </div>
              <button onClick={() => onSettle?.()} style={styles.payButton}>Pay Now</button>
              <button onClick={() => setShowCancelConfirm(true)} style={styles.cancelButton}>Cancel Order</button>
            </>
          )}
        </div>
      </div>

      {showCancelConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowCancelConfirm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Cancel Order?</h3>
            <p style={styles.modalText}>This will remove all items from the tab.</p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowCancelConfirm(false)} style={styles.modalCancelBtn}>Keep Order</button>
              <button onClick={handleCancelBill} style={styles.modalConfirmBtn}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTransferModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Transfer to Table</h3>
            <div style={styles.transferGrid}>
              {getVacantTables().length === 0 ? (
                <p style={styles.emptyText}>No vacant tables available</p>
              ) : (
                getVacantTables().map(t => (
                  <button key={t} onClick={() => handleTransfer(t)} style={styles.transferTableBtn}>{t}</button>
                ))
              )}
            </div>
            <button onClick={() => setShowTransferModal(false)} style={styles.modalCancelBtn}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '20px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  backButton: { background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  title: { margin: 0 },
  headerActions: { display: 'flex', gap: '10px' },
  transferButton: { background: '#3d4a5a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  customerSection: { background: '#2a2a2a', borderRadius: '12px', padding: '15px', marginBottom: '20px' },
  customerEditRow: { display: 'flex', gap: '10px' },
  customerInput: { flex: 1, padding: '10px', border: '1px solid #555', borderRadius: '8px', background: '#333', color: '#fff', fontSize: '16px' },
  customerSaveButton: { background: '#2d5a2d', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  customerCancelButton: { background: '#5a2d2d', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  customerDisplayRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '5px 0' },
  customerLabel: { fontSize: '16px' },
  noCustomer: { color: '#666' },
  content: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  menuSection: { background: '#2a2a2a', borderRadius: '12px', padding: '15px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' },
  categoryList: { marginTop: '10px' },
  categoryContainer: { marginBottom: '8px' },
  categoryHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', color: '#fff', fontSize: '15px', fontWeight: '600', transition: 'background 0.2s' },
  categoryTitle: { display: 'flex', alignItems: 'center', gap: '10px' },
  categoryIcon: { fontSize: '18px' },
  categoryCount: { color: '#666', fontWeight: 'normal', fontSize: '13px' },
  expandIcon: { color: '#666', fontSize: '12px' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '8px', padding: '0 5px' },
  menuItem: { background: '#333', border: '1px solid #444', borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'left', color: '#fff', transition: 'background 0.2s, transform 0.1s' },
  menuItemDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  menuItemName: { display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' },
  menuItemPrice: { color: '#888', fontSize: '12px' },
  orderSection: { background: '#2a2a2a', borderRadius: '12px', padding: '15px', height: 'fit-content' },
  emptyText: { color: '#666', textAlign: 'center', padding: '30px' },
  orderList: { marginTop: '10px' },
  orderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' },
  quantityBadge: { color: '#4ade80', fontWeight: 'bold' },
  orderItemRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  removeButton: { background: '#5a2d2d', color: '#fff', border: 'none', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '18px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #444' },
  totalAmount: { fontSize: '24px', fontWeight: 'bold', color: '#4ade80' },
  payButton: { width: '100%', marginTop: '15px', padding: '15px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  cancelButton: { width: '100%', marginTop: '10px', padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #5a2d2d', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1e1e1e', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '400px' },
  modalText: { color: '#888', marginBottom: '20px' },
  modalActions: { display: 'flex', gap: '10px' },
  modalCancelBtn: { flex: 1, padding: '12px', background: 'transparent', color: '#fff', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer' },
  modalConfirmBtn: { flex: 1, padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  transferGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' },
  transferTableBtn: { padding: '15px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
}

export default BillView