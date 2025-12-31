import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { INVENTORY_UNITS } from '../data/menu'

function InventoryView({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('add')
  const [entries, setEntries] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [item, setItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [recommendedPrice, setRecommendedPrice] = useState('')
  const [recommendedMethod, setRecommendedMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  // Fulfill modal
  const [fulfillModal, setFulfillModal] = useState(null)
  const [fulfillPrice, setFulfillPrice] = useState('')
  const [fulfillMethod, setFulfillMethod] = useState('cash')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const data = await api.getInventory()
    setEntries(data.entries || [])
    setRequests(data.requests || [])
    setLoading(false)
  }

  const resetForm = () => {
    setItem('')
    setQuantity('')
    setUnit('')
    setTotalPrice('')
    setPaymentMethod('cash')
    setRecommendedPrice('')
    setRecommendedMethod('cash')
    setNotes('')
  }

  const handleAddEntry = async () => {
    if (!item.trim() || !quantity || !totalPrice) {
      setMessage('Please fill item, quantity, and price')
      return
    }

    setSubmitting(true)
    const result = await api.addInventoryEntry(
      item.trim(),
      parseInt(quantity),
      unit || null,
      parseFloat(totalPrice),
      paymentMethod,
      user.name
    )

    if (result.success) {
      setMessage('Inventory added successfully!')
      resetForm()
      loadData()
    } else {
      setMessage('Failed to add inventory')
    }
    setSubmitting(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleCreateRequest = async () => {
    if (!item.trim() || !quantity) {
      setMessage('Please enter item and quantity')
      return
    }

    setSubmitting(true)
    const result = await api.createInventoryRequest(
      item.trim(),
      parseInt(quantity),
      unit || null,
      notes.trim(),
      user.name,
      recommendedPrice ? parseFloat(recommendedPrice) : null,
      recommendedMethod
    )

    if (result.success) {
      setMessage('Request submitted!')
      resetForm()
      loadData()
    } else {
      setMessage('Failed to submit request')
    }
    setSubmitting(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleFulfill = async () => {
    if (!fulfillPrice) {
      setMessage('Please enter total price')
      return
    }

    setSubmitting(true)
    const result = await api.fulfillInventoryRequest(
      fulfillModal.id,
      user.name,
      parseFloat(fulfillPrice),
      fulfillMethod
    )

    if (result.success) {
      setMessage('Request fulfilled and inventory added!')
      setFulfillModal(null)
      setFulfillPrice('')
      setFulfillMethod('cash')
      loadData()
    } else {
      setMessage('Failed to fulfill request')
    }
    setSubmitting(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleCancel = async (requestId) => {
    await api.cancelInventoryRequest(requestId, user.name)
    loadData()
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-NP', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const formatQuantity = (qty, unitId) => {
    if (!unitId) return qty
    return `${qty} ${unitId}`
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const recentEntries = [...entries].reverse().slice(0, 20)

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h1>📦 Inventory</h1>
      </header>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('add')} style={{ ...styles.tab, background: activeTab === 'add' ? '#444' : 'transparent' }}>
          {user.role === 'admin' ? 'Add Inventory' : 'Request'}
        </button>
        {user.role === 'admin' && (
          <button onClick={() => setActiveTab('requests')} style={{ ...styles.tab, background: activeTab === 'requests' ? '#444' : 'transparent' }}>
            Requests ({pendingRequests.length})
          </button>
        )}
        <button onClick={() => setActiveTab('history')} style={{ ...styles.tab, background: activeTab === 'history' ? '#444' : 'transparent' }}>
          History
        </button>
      </div>

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.content}>
        {/* Add/Request Tab */}
        {activeTab === 'add' && (
          <div style={styles.card}>
            <h3>{user.role === 'admin' ? 'Add Inventory' : 'Request Inventory'}</h3>
            
            <div style={styles.form}>
              <div style={styles.inputGroup}>
                <label>Item Name</label>
                <input type="text" value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g., Coffee Beans, Milk, Sugar" style={styles.input} />
              </div>

              <div style={styles.inputRow}>
                <div style={styles.inputGroup}>
                  <label>Quantity</label>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 10" style={styles.input} />
                </div>
                <div style={styles.inputGroup}>
                  <label>Unit (optional)</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} style={styles.select}>
                    <option value="">No unit</option>
                    {INVENTORY_UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              {user.role === 'admin' ? (
                <>
                  <div style={styles.inputGroup}>
                    <label>Total Price (Rs.)</label>
                    <input type="number" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} placeholder="e.g., 5000" style={styles.input} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label>Paid Via</label>
                    <div style={styles.methodButtons}>
                      <button type="button" onClick={() => setPaymentMethod('cash')} style={{ ...styles.methodButton, background: paymentMethod === 'cash' ? '#2d5a2d' : '#3d3d3d' }}>
                        💵 Cash
                      </button>
                      <button type="button" onClick={() => setPaymentMethod('qr')} style={{ ...styles.methodButton, background: paymentMethod === 'qr' ? '#2d4a6d' : '#3d3d3d' }}>
                        📱 QR
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.inputGroup}>
                    <label>Est. Price (Optional)</label>
                    <input type="number" value={recommendedPrice} onChange={(e) => setRecommendedPrice(e.target.value)} placeholder="e.g., 5000" style={styles.input} />
                  </div>
                  {recommendedPrice && (
                    <div style={styles.inputGroup}>
                      <label>Paid Via</label>
                      <div style={styles.methodButtons}>
                        <button type="button" onClick={() => setRecommendedMethod('cash')} style={{ ...styles.methodButton, background: recommendedMethod === 'cash' ? '#2d5a2d' : '#3d3d3d' }}>
                          💵 Cash
                        </button>
                        <button type="button" onClick={() => setRecommendedMethod('qr')} style={{ ...styles.methodButton, background: recommendedMethod === 'qr' ? '#2d4a6d' : '#3d3d3d' }}>
                          📱 QR
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={styles.inputGroup}>
                    <label>Notes (optional)</label>
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Running low, need urgently" style={styles.input} />
                  </div>
                </>
              )}

              <button onClick={user.role === 'admin' ? handleAddEntry : handleCreateRequest} disabled={submitting} style={{ ...styles.submitButton, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Submitting...' : (user.role === 'admin' ? 'Add to Inventory' : 'Submit Request')}
              </button>
            </div>
          </div>
        )}

        {/* Requests Tab (Admin Only) */}
        {activeTab === 'requests' && user.role === 'admin' && (
          <div style={styles.card}>
            <h3>Pending Requests</h3>
            {pendingRequests.length === 0 ? (
              <p style={styles.emptyText}>No pending requests</p>
            ) : (
              <div style={styles.requestList}>
                {pendingRequests.map(request => (
                  <div key={request.id} style={styles.requestCard}>
                    <div style={styles.requestInfo}>
                      <div style={styles.requestItemName}>{request.item}</div>
                      <div style={styles.requestMeta}>
                        Qty: {formatQuantity(request.quantity, request.unit)} • By: {request.requestedBy} • {formatDate(request.timestamp)}
                      </div>
                      {request.recommendedPrice && (
                        <div style={styles.recommendedPrice}>
                          💡 Suggested: Rs. {request.recommendedPrice.toLocaleString()} via {request.recommendedMethod || 'cash'}
                        </div>
                      )}
                      {request.notes && <div style={styles.requestNotes}>"{request.notes}"</div>}
                    </div>
                    <div style={styles.requestActions}>
                      <button onClick={() => {
                        setFulfillModal(request)
                        setFulfillPrice(request.recommendedPrice ? String(request.recommendedPrice) : '')
                        setFulfillMethod(request.recommendedMethod || 'cash')
                      }} style={styles.fulfillButton}>✓ Fulfill</button>
                      <button onClick={() => handleCancel(request.id)} style={styles.cancelRequestButton}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div style={styles.card}>
            <h3>Recent Inventory Entries</h3>
            {recentEntries.length === 0 ? (
              <p style={styles.emptyText}>No entries yet</p>
            ) : (
              <div style={styles.entryList}>
                {recentEntries.map(entry => (
                  <div key={entry.id} style={styles.entryItem}>
                    <div style={styles.entryMain}>
                      <span style={styles.entryItemName}>{entry.item}</span>
                      <span style={styles.entryQty}>×{formatQuantity(entry.quantity, entry.unit)}</span>
                    </div>
                    <div style={styles.entryDetails}>
                      <span>Rs. {entry.totalPrice?.toLocaleString()}</span>
                      <span style={styles.entryMethod}>{entry.paidVia === 'qr' ? '📱' : '💵'}</span>
                      <span style={styles.entryMeta}>{entry.entryUser} • {entry.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fulfill Modal */}
      {fulfillModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Fulfill Request</h3>
            <p style={styles.modalInfo}>{fulfillModal.item} × {formatQuantity(fulfillModal.quantity, fulfillModal.unit)}</p>
            <p style={styles.modalMeta}>Requested by {fulfillModal.requestedBy}</p>

            {fulfillModal.recommendedPrice && (
              <div style={styles.recommendedBox}>
                <span>💡 Staff suggested: Rs. {fulfillModal.recommendedPrice.toLocaleString()} via {fulfillModal.recommendedMethod || 'cash'}</span>
                <button onClick={() => {
                  setFulfillPrice(String(fulfillModal.recommendedPrice))
                  setFulfillMethod(fulfillModal.recommendedMethod || 'cash')
                }} style={styles.useButton}>Use This</button>
              </div>
            )}

            <div style={styles.inputGroup}>
              <label>Total Price Paid (Rs.)</label>
              <input type="number" value={fulfillPrice} onChange={(e) => setFulfillPrice(e.target.value)} placeholder="Enter amount" style={styles.input} autoFocus />
            </div>

            <div style={styles.inputGroup}>
              <label>Paid Via</label>
              <div style={styles.methodButtons}>
                <button type="button" onClick={() => setFulfillMethod('cash')} style={{ ...styles.methodButton, background: fulfillMethod === 'cash' ? '#2d5a2d' : '#3d3d3d' }}>
                  💵 Cash
                </button>
                <button type="button" onClick={() => setFulfillMethod('qr')} style={{ ...styles.methodButton, background: fulfillMethod === 'qr' ? '#2d4a6d' : '#3d3d3d' }}>
                  📱 QR
                </button>
              </div>
            </div>

            <div style={styles.modalButtons}>
              <button onClick={() => setFulfillModal(null)} style={styles.modalCancel}>Cancel</button>
              <button onClick={handleFulfill} disabled={submitting} style={styles.modalConfirm}>
                {submitting ? 'Processing...' : 'Confirm & Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '20px' },
  header: { textAlign: 'center', marginBottom: '20px', position: 'relative' },
  backButton: { position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  tabs: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' },
  tab: { padding: '10px 20px', border: '1px solid #444', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px' },
  message: { textAlign: 'center', padding: '10px', background: '#2d4a3e', color: '#4ade80', borderRadius: '8px', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 20px' },
  content: { maxWidth: '500px', margin: '0 auto' },
  card: { background: '#2a2a2a', borderRadius: '12px', padding: '20px' },
  form: { marginTop: '15px' },
  inputGroup: { marginBottom: '15px', flex: 1 },
  inputRow: { display: 'flex', gap: '15px' },
  input: { width: '100%', padding: '12px', marginTop: '5px', border: '1px solid #555', borderRadius: '8px', background: '#333', color: '#fff', fontSize: '16px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px', marginTop: '5px', border: '1px solid #555', borderRadius: '8px', background: '#333', color: '#fff', fontSize: '16px', boxSizing: 'border-box', cursor: 'pointer' },
  methodButtons: { display: 'flex', gap: '10px', marginTop: '8px' },
  methodButton: { flex: 1, padding: '12px', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px' },
  submitButton: { width: '100%', padding: '15px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  emptyText: { color: '#666', textAlign: 'center', padding: '30px' },
  requestList: { marginTop: '15px' },
  requestCard: { background: '#333', borderRadius: '8px', padding: '15px', marginBottom: '10px' },
  requestInfo: { marginBottom: '12px' },
  requestItemName: { fontWeight: 'bold', fontSize: '16px' },
  requestMeta: { color: '#888', fontSize: '13px', marginTop: '5px' },
  recommendedPrice: { color: '#fbbf24', fontSize: '14px', marginTop: '8px', background: '#3d3a2a', padding: '6px 10px', borderRadius: '4px', display: 'inline-block' },
  requestNotes: { color: '#aaa', fontSize: '13px', fontStyle: 'italic', marginTop: '5px' },
  requestActions: { display: 'flex', gap: '8px' },
  fulfillButton: { flex: 1, padding: '10px 15px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  cancelRequestButton: { padding: '10px 15px', background: '#5a2d2d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  entryList: { marginTop: '15px' },
  entryItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #333' },
  entryMain: { display: 'flex', alignItems: 'center', gap: '10px' },
  entryItemName: { fontWeight: 'bold' },
  entryQty: { color: '#888', fontSize: '14px' },
  entryDetails: { display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'right' },
  entryMethod: { fontSize: '16px' },
  entryMeta: { display: 'block', color: '#888', fontSize: '12px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#2a2a2a', padding: '25px', borderRadius: '12px', minWidth: '320px', textAlign: 'center' },
  modalInfo: { fontSize: '18px', fontWeight: 'bold', marginTop: '10px' },
  modalMeta: { color: '#888', fontSize: '14px', marginBottom: '15px' },
  recommendedBox: { background: '#3d3a2a', border: '1px solid #5a5a2d', borderRadius: '8px', padding: '12px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', textAlign: 'left', fontSize: '13px' },
  useButton: { padding: '6px 12px', background: '#5a5a2d', color: '#fbbf24', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  modalButtons: { display: 'flex', gap: '10px', marginTop: '20px' },
  modalCancel: { flex: 1, padding: '12px', background: '#444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  modalConfirm: { flex: 1, padding: '12px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
}

export default InventoryView