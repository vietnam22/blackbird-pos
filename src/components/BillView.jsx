import { useState, useEffect } from 'react'
import { MENU } from '../data/menu'
import { api } from '../utils/api'

const TABLES = [
  'Table 1', 'Table 2', 'Table 3', 'Table 4',
  'Table 5', 'Table 6', 'Table 7', 'Table 8', 'Counter'
]

function BillView({ table, tab, onBack, onUpdate, onSettle, user, openTabs, onTransfer }) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  
  // Customer name state
  const [customerName, setCustomerName] = useState(tab?.customerName || '')
  const [editingCustomer, setEditingCustomer] = useState(false)
  
  // Sync customerName when tab updates from server
  useEffect(() => {
    setCustomerName(tab?.customerName || '')
  }, [tab?.customerName])

  const items = tab?.items || []
  const total = items.reduce((sum, item) => sum + item.price, 0)

  // Get vacant tables for transfer
  const getVacantTables = () => {
    return TABLES.filter(t => {
      if (t === table) return false // Exclude current table
      const tableTab = openTabs?.[t]
      return !tableTab || !tableTab.items || tableTab.items.length === 0
    })
  }

  // Handle table transfer
  const handleTransfer = async (targetTable) => {
    const result = await api.transferTable(table, targetTable)
    if (result.success) {
      setShowTransferModal(false)
      onTransfer?.(targetTable) // Navigate to new table
    }
  }

  // Group items by name for display
  const groupedItems = items.reduce((acc, item, index) => {
    const existing = acc.find(g => g.name === item.name && g.price === item.price)
    if (existing) {
      existing.quantity += 1
      existing.indices.push(index)
    } else {
      acc.push({
        name: item.name,
        price: item.price,
        quantity: 1,
        indices: [index]
      })
    }
    return acc
  }, [])

  // Capitalize first letter of each word
  const capitalizeFirstLetter = (str) => {
    if (!str) return str
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleCustomerNameChange = (e) => {
    const value = e.target.value
    setCustomerName(capitalizeFirstLetter(value))
  }

  const handleAddItem = async (menuItem) => {
    await api.addToTab(table, menuItem, user.name, items.length === 0 ? customerName : undefined)
    onUpdate()
  }

  const handleRemoveFromGroup = async (group) => {
    const lastIndex = group.indices[group.indices.length - 1]
    await api.removeFromTab(table, lastIndex)
    onUpdate()
  }

  const handleUpdateCustomerName = async () => {
    const trimmedName = customerName.trim()
    
    setCustomerName(trimmedName)
    setEditingCustomer(false)
    
    // Then save to server
    if (!tab) {
      await api.createTab(table, trimmedName)
    } else {
      await api.updateCustomerName(table, trimmedName)
    }
    
    onUpdate()
  }

  const handleCancelBill = async () => {
    await api.cancelBill(table)
    setShowCancelConfirm(false)
    await onUpdate()
    onBack()
  }

  const handleSuccessOk = async () => {
    setShowSuccessModal(false)
    await onUpdate()
    onBack()
  }

  // Called from SettleView via App.jsx after successful settlement
  useEffect(() => {
    // Check if we should show success modal (passed via tab state)
    if (tab?.showSuccess) {
      setShowSuccessModal(true)
    }
  }, [tab?.showSuccess])

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>←</button>
        <h2 style={styles.title}>{table}</h2>
        {items.length > 0 && (
          <>
            <button onClick={() => setShowTransferModal(true)} style={styles.transferButton}>
              Transfer ↔
            </button>
            <button onClick={() => setShowCancelConfirm(true)} style={styles.cancelBillButton}>
              Cancel Bill
            </button>
          </>
        )}
      </div>

      {/* Customer Name Section */}
      <div style={styles.customerSection}>
        {editingCustomer ? (
          <div style={styles.customerEditRow}>
            <input
              type="text"
              value={customerName}
              onChange={handleCustomerNameChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateCustomerName()
                } else if (e.key === 'Escape') {
                  setEditingCustomer(false)
                  setCustomerName(tab?.customerName || '')
                }
              }}
              placeholder="Customer name"
              style={styles.customerInput}
              autoFocus
            />
            <button onClick={handleUpdateCustomerName} style={styles.customerSaveButton}>
              ✓
            </button>
            <button 
              onClick={() => { setEditingCustomer(false); setCustomerName(tab?.customerName || '') }} 
              style={styles.customerCancelButton}
            >
              ✕
            </button>
          </div>
        ) : (
          <div 
            style={styles.customerDisplayRow} 
            onClick={() => setEditingCustomer(true)}
          >
            <span style={styles.customerLabel}>
              {customerName ? (
                <>👤 {customerName}</>
              ) : (
                <span style={styles.noCustomer}>+ Add customer name</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div style={styles.content}>
        {/* Menu */}
        <div style={styles.menuSection}>
          <h3>Menu</h3>
          <div style={styles.menuGrid}>
            {MENU.map((item) => (
              <button
                key={item.name}
                onClick={() => handleAddItem(item)}
                style={styles.menuItem}
              >
                <span style={styles.menuItemName}>{item.name}</span>
                <span style={styles.menuItemPrice}>Rs. {item.price}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Current Order */}
        <div style={styles.orderSection}>
          <h3>Current Order</h3>
          {items.length === 0 ? (
            <p style={styles.emptyText}>No items yet</p>
          ) : (
            <>
              <div style={styles.orderList}>
                {groupedItems.map((group, idx) => (
                  <div key={idx} style={styles.orderItem}>
                    <span>
                      {group.name}
                      {group.quantity > 1 && (
                        <span style={styles.quantityBadge}> x{group.quantity}</span>
                      )}
                    </span>
                    <div style={styles.orderItemRight}>
                      <span>Rs. {group.price * group.quantity}</span>
                      <button
                        onClick={() => handleRemoveFromGroup(group)}
                        style={styles.removeButton}
                      >
                        −
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.totalRow}>
                <span>Total</span>
                <span style={styles.totalAmount}>Rs. {total}</span>
              </div>
              <button
                onClick={onSettle}
                style={styles.payButton}
              >
                Complete Bill →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cancel Bill Confirmation */}
      {showCancelConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Cancel Bill?</h3>
            <p>This will remove all items from {table}.</p>
            <div style={styles.modalButtons}>
              <button onClick={() => setShowCancelConfirm(false)} style={styles.modalCancel}>
                Keep
              </button>
              <button onClick={handleCancelBill} style={styles.confirmCancelButton}>
                Cancel Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={styles.successTitle}>Bill Completed Successfully!</h3>
            <p style={styles.successText}>
              {table} • Rs. {total}
              {customerName && ` • ${customerName}`}
            </p>
            <button onClick={handleSuccessOk} style={styles.successButton}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Transfer to Vacant Table</h3>
            <p style={{ color: '#888', marginBottom: '15px' }}>
              Move all items from {table} to:
            </p>
            <div style={styles.transferGrid}>
              {getVacantTables().map(t => (
                <button
                  key={t}
                  onClick={() => handleTransfer(t)}
                  style={styles.transferTableButton}
                >
                  {t}
                </button>
              ))}
            </div>
            {getVacantTables().length === 0 && (
              <p style={{ color: '#f87171', textAlign: 'center' }}>
                No vacant tables available
              </p>
            )}
            <button 
              onClick={() => setShowTransferModal(false)} 
              style={styles.modalCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    padding: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px',
  },
  backButton: {
    background: '#333',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
  },
  title: {
    margin: 0,
    flex: 1,
  },
  cancelBillButton: {
    background: '#5a2d2d',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  transferButton: {
    background: '#1e3a5f',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  customerSection: {
    background: '#2a2a2a',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '20px',
  },
  customerEditRow: {
    display: 'flex',
    gap: '10px',
  },
  customerInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #555',
    borderRadius: '8px',
    background: '#333',
    color: '#fff',
    fontSize: '16px',
  },
  customerSaveButton: {
    background: '#2d5a2d',
    color: '#fff',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  customerCancelButton: {
    background: '#5a2d2d',
    color: '#fff',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  customerDisplayRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '5px 0',
  },
  customerLabel: {
    fontSize: '16px',
  },
  noCustomer: {
    color: '#666',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  menuSection: {
    background: '#2a2a2a',
    borderRadius: '12px',
    padding: '15px',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginTop: '10px',
  },
  menuItem: {
    background: '#333',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
  },
  menuItemName: {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  menuItemPrice: {
    color: '#888',
    fontSize: '14px',
  },
  orderSection: {
    background: '#2a2a2a',
    borderRadius: '12px',
    padding: '15px',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    padding: '30px',
  },
  orderList: {
    marginTop: '10px',
  },
  orderItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #333',
  },
  quantityBadge: {
    color: '#4ade80',
    fontWeight: 'bold',
  },
  orderItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  removeButton: {
    background: '#5a2d2d',
    color: '#fff',
    border: 'none',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '2px solid #444',
  },
  totalAmount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4ade80',
  },
  payButton: {
    width: '100%',
    marginTop: '15px',
    padding: '15px',
    background: '#2d5a2d',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#2a2a2a',
    padding: '25px',
    borderRadius: '12px',
    minWidth: '300px',
    textAlign: 'center',
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
  },
  modalCancel: {
    flex: 1,
    padding: '12px',
    background: '#444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmCancelButton: {
    flex: 1,
    padding: '12px',
    background: '#5a2d2d',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  successIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#2d5a2d',
    color: '#4ade80',
    fontSize: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px',
  },
  successTitle: {
    color: '#4ade80',
    marginBottom: '10px',
  },
  successText: {
    color: '#888',
    marginBottom: '20px',
  },
  successButton: {
    width: '100%',
    padding: '12px',
    background: '#2d5a2d',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  transferGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '15px',
  },
  transferTableButton: {
    background: '#2d4a3e',
    color: '#fff',
    border: 'none',
    padding: '15px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
}

export default BillView