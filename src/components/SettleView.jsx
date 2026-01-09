import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const PAYMENT_MODES = [
  { id: 'cash', label: '💵 Cash', color: '#2d5a2d' },
  { id: 'qr', label: '📱 QR', color: '#2d4a6d' },
  { id: 'credit', label: '📝 Credit', color: '#6d4a2d' },
  { id: 'cash_qr', label: '💵+📱 Split', color: '#4a4a6d' },
]

function SettleView({ table, items, customerName, onBack, onConfirm, user }) {
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [cashAmount, setCashAmount] = useState('')
  const [qrAmount, setQrAmount] = useState('')
  const [isPartialPayment, setIsPartialPayment] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')
  const [partialMethod, setPartialMethod] = useState('cash')
  const [processing, setProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [completedBillInfo, setCompletedBillInfo] = useState(null)

  const capitalizeFirstLetter = (str) => {
    if (!str) return str
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }
  
  const [creditors, setCreditors] = useState([])
  const [selectedCreditor, setSelectedCreditor] = useState(null)
  const [showCreditorList, setShowCreditorList] = useState(false)
  const [creditorSearch, setCreditorSearch] = useState('')
  const [showAddCreditor, setShowAddCreditor] = useState(false)
  const [newCreditorName, setNewCreditorName] = useState('')
  const [newCreditorPhone, setNewCreditorPhone] = useState('')
  const [addingCreditor, setAddingCreditor] = useState(false)

  const total = items.reduce((sum, item) => sum + item.price, 0)
  const isCounter = table === 'Counter'

  useEffect(() => { loadCreditors() }, [])

  const loadCreditors = async () => {
    const data = await api.getCreditors()
    setCreditors(data.creditors || [])
  }

  const filteredCreditors = creditors.filter(c => c.name.toLowerCase().includes(creditorSearch.toLowerCase()))

  const groupedItems = items.reduce((acc, item) => {
    const existing = acc.find(g => g.name === item.name && g.price === item.price)
    if (existing) { existing.quantity += 1 } else { acc.push({ name: item.name, price: item.price, quantity: 1 }) }
    return acc
  }, [])

  const validatePayment = () => {
    if (isPartialPayment) {
      const paid = parseInt(partialAmount) || 0
      if (paid <= 0 || paid >= total) return false
      if (!selectedCreditor) return false
      return true
    }
    if (!selectedPayment) return false
    if (selectedPayment === 'credit') { if (!selectedCreditor) return false; return true }
    if (selectedPayment === 'cash_qr') {
      const cash = parseInt(cashAmount) || 0
      const qr = parseInt(qrAmount) || 0
      return cash + qr === total
    }
    return true
  }

  const canConfirm = validatePayment()

  const getPaymentLabel = () => {
    if (isPartialPayment) return `Partial (Rs. ${partialAmount} ${partialMethod})`
    if (selectedPayment === 'cash_qr') return `Cash Rs. ${cashAmount} + QR Rs. ${qrAmount}`
    const mode = PAYMENT_MODES.find(m => m.id === selectedPayment)
    return mode?.label || selectedPayment
  }

  const handleConfirm = async () => {
    if (!canConfirm || processing) return
    setProcessing(true)
    let paymentDetails = { mode: selectedPayment, creditName: null, creditorId: null, cashAmount: null, qrAmount: null, partialPayment: null }
    if (isPartialPayment) {
      const paid = parseInt(partialAmount)
      paymentDetails = { mode: 'partial', creditName: selectedCreditor?.name, creditorId: selectedCreditor?.id, partialPayment: { paidAmount: paid, paidMethod: partialMethod, creditAmount: total - paid } }
    } else if (selectedPayment === 'credit') {
      paymentDetails.creditName = selectedCreditor?.name
      paymentDetails.creditorId = selectedCreditor?.id
    } else if (selectedPayment === 'cash_qr') {
      paymentDetails.cashAmount = parseInt(cashAmount)
      paymentDetails.qrAmount = parseInt(qrAmount)
    }
    setCompletedBillInfo({ table, customerName, total, paymentLabel: getPaymentLabel(), paymentDetails })
    setShowSuccess(true)
    setProcessing(false)
  }

  const handleSuccessOk = async () => { if (completedBillInfo) await onConfirm(completedBillInfo.paymentDetails) }

  const handleCashQrChange = (field, value) => {
    const numValue = value.replace(/[^0-9]/g, '')
    if (field === 'cash') { setCashAmount(numValue); const cash = parseInt(numValue) || 0; if (cash <= total) setQrAmount(String(total - cash)) }
    else { setQrAmount(numValue); const qr = parseInt(numValue) || 0; if (qr <= total) setCashAmount(String(total - qr)) }
  }

  const handlePartialToggle = () => { setIsPartialPayment(!isPartialPayment); setSelectedPayment(null); setPartialAmount(''); setSelectedCreditor(null) }
  const selectCreditor = (creditor) => { setSelectedCreditor(creditor); setShowCreditorList(false); setCreditorSearch('') }

  const handleAddCreditor = async () => {
    if (!newCreditorName.trim()) return
    setAddingCreditor(true)
    try {
      const result = await api.addCreditor(newCreditorName.trim(), newCreditorPhone.trim() || null, null, user.name)
      if (result?.success && result.creditor) {
        const newCreditor = { ...result.creditor, totalPending: 0 }
        setCreditors(prev => [...prev, newCreditor])
        setSelectedCreditor(newCreditor)
        setShowAddCreditor(false)
        setNewCreditorName('')
        setNewCreditorPhone('')
      }
    } catch (error) { console.error('Error adding creditor:', error) }
    setAddingCreditor(false)
  }

  const renderCreditorSelection = () => (
    <div style={styles.creditorSection}>
      <div style={styles.creditorPicker}>
        {selectedCreditor ? (
          <div style={styles.selectedCreditor}>
            <span>👤 {selectedCreditor.name}</span>
            {selectedCreditor.totalPending > 0 && <span style={styles.existingDebt}>(Owes: Rs. {selectedCreditor.totalPending.toLocaleString()})</span>}
            <button onClick={() => setSelectedCreditor(null)} style={styles.clearBtn}>✕</button>
          </div>
        ) : (
          <div style={styles.creditorSearch}>
            <input type="text" value={creditorSearch} onChange={(e) => { setCreditorSearch(capitalizeFirstLetter(e.target.value)); setShowCreditorList(true) }} onFocus={() => setShowCreditorList(true)} placeholder="Search or add creditor..." style={styles.input} />
            {showCreditorList && (
              <div style={styles.creditorDropdown}>
                <div onClick={() => { setShowAddCreditor(true); setShowCreditorList(false); setNewCreditorName(capitalizeFirstLetter(creditorSearch)) }} style={styles.addCreditorOption}>
                  <span>+ Add New Creditor</span>
                  {creditorSearch && <span style={styles.searchHint}>"{creditorSearch}"</span>}
                </div>
                {filteredCreditors.length === 0 ? (
                  <div style={styles.noCreditors}>{creditorSearch ? 'No matching creditors' : 'No creditors yet'}</div>
                ) : (
                  filteredCreditors.slice(0, 5).map(c => (
                    <div key={c.id} onClick={() => selectCreditor(c)} style={styles.creditorOption}>
                      <span>{c.name}</span>
                      {c.totalPending > 0 && <span style={styles.pendingBadge}>Rs. {c.totalPending.toLocaleString()}</span>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h1>Settle - {table}</h1>
      </header>
      <div style={styles.settleContainer}>
        <div style={styles.billSummary}>
          <h3>Bill Summary</h3>
          {customerName && <div style={styles.customerDisplay}>👤 {customerName}</div>}
          {groupedItems.map((group, idx) => (
            <div key={idx} style={styles.summaryItem}>
              <span>{group.name}{group.quantity > 1 && <span style={styles.quantityBadge}> x{group.quantity}</span>}</span>
              <span>Rs. {group.price * group.quantity}</span>
            </div>
          ))}
          <div style={styles.summaryTotal}><span>Total</span><span>Rs. {total}</span></div>
        </div>
        <div style={styles.paymentSection}>
          <div style={styles.partialToggle}>
            <label style={styles.toggleLabel}>
              <input type="checkbox" checked={isPartialPayment} onChange={handlePartialToggle} style={styles.checkbox} />
              Partial Payment (remaining on credit)
            </label>
          </div>
          {isPartialPayment ? (
            <div style={styles.partialSection}>
              <h3>Partial Payment</h3>
              <div style={styles.inputGroup}>
                <label>Amount Paying Now:</label>
                <input type="text" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder={`Max Rs. ${total - 1}`} style={styles.input} />
              </div>
              {partialAmount && parseInt(partialAmount) > 0 && parseInt(partialAmount) < total && (
                <div style={styles.partialBreakdown}>
                  <div style={styles.breakdownRow}><span>Paying now:</span><span style={styles.paidAmount}>Rs. {partialAmount}</span></div>
                  <div style={styles.breakdownRow}><span>On credit:</span><span style={styles.creditAmountText}>Rs. {total - parseInt(partialAmount)}</span></div>
                </div>
              )}
              <div style={styles.inputGroup}>
                <label>Payment Method:</label>
                <div style={styles.methodButtons}>
                  <button onClick={() => setPartialMethod('cash')} style={{ ...styles.methodButton, background: partialMethod === 'cash' ? '#2d5a2d' : '#3d3d3d' }}>Cash</button>
                  <button onClick={() => setPartialMethod('qr')} style={{ ...styles.methodButton, background: partialMethod === 'qr' ? '#2d4a6d' : '#3d3d3d' }}>QR</button>
                </div>
              </div>
              <div style={styles.inputGroup}><label>Credit To:</label>{renderCreditorSelection()}</div>
            </div>
          ) : (
            <>
              <h3>Payment Mode</h3>
              <div style={styles.paymentGrid}>
                {PAYMENT_MODES.map(mode => (
                  <button key={mode.id} onClick={() => { setSelectedPayment(mode.id); setCashAmount(''); setQrAmount(''); if (mode.id !== 'credit') setSelectedCreditor(null) }}
                    style={{ ...styles.paymentButton, background: selectedPayment === mode.id ? mode.color : '#3d3d3d', borderColor: selectedPayment === mode.id ? '#fff' : '#555' }}>
                    {mode.label}
                  </button>
                ))}
              </div>
              {selectedPayment === 'cash_qr' && (
                <div style={styles.splitSection}>
                  <div style={styles.splitInputs}>
                    <div style={styles.splitInput}><label>Cash:</label><input type="text" value={cashAmount} onChange={(e) => handleCashQrChange('cash', e.target.value)} placeholder="0" style={styles.input} /></div>
                    <div style={styles.splitInput}><label>QR:</label><input type="text" value={qrAmount} onChange={(e) => handleCashQrChange('qr', e.target.value)} placeholder="0" style={styles.input} /></div>
                  </div>
                  {(parseInt(cashAmount) || 0) + (parseInt(qrAmount) || 0) !== total && <p style={styles.splitWarning}>Must equal Rs. {total} (currently Rs. {(parseInt(cashAmount) || 0) + (parseInt(qrAmount) || 0)})</p>}
                </div>
              )}
              {selectedPayment === 'credit' && <div style={styles.creditInput}><label>Credit To:</label>{renderCreditorSelection()}</div>}
            </>
          )}
          <button onClick={handleConfirm} disabled={!canConfirm || processing} style={{ ...styles.confirmButton, opacity: canConfirm && !processing ? 1 : 0.5 }}>
            {processing ? 'Processing...' : `Confirm ${isCounter ? 'Sale' : 'Settlement'}`}
          </button>
        </div>
      </div>
      {showAddCreditor && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Add New Creditor</h3>
            <div style={styles.addCreditorForm}>
              <div style={styles.inputGroup}><label>Name *</label><input type="text" value={newCreditorName} onChange={(e) => setNewCreditorName(capitalizeFirstLetter(e.target.value))} placeholder="Customer name" style={styles.input} autoFocus /></div>
              <div style={styles.inputGroup}><label>Phone (optional)</label><input type="text" value={newCreditorPhone} onChange={(e) => setNewCreditorPhone(e.target.value)} placeholder="Phone number" style={styles.input} /></div>
            </div>
            <div style={styles.modalButtons}>
              <button onClick={() => { setShowAddCreditor(false); setNewCreditorName(''); setNewCreditorPhone('') }} style={styles.modalCancel} disabled={addingCreditor}>Cancel</button>
              <button onClick={handleAddCreditor} style={styles.modalConfirm} disabled={!newCreditorName.trim() || addingCreditor}>{addingCreditor ? 'Adding...' : 'Add & Select'}</button>
            </div>
          </div>
        </div>
      )}
      {showSuccess && completedBillInfo && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={styles.successTitle}>Bill Completed Successfully!</h3>
            <div style={styles.successDetails}>
              <p style={styles.successTable}>{completedBillInfo.table}</p>
              {completedBillInfo.customerName && <p style={styles.successCustomer}>👤 {completedBillInfo.customerName}</p>}
              <p style={styles.successTotal}>Rs. {completedBillInfo.total.toLocaleString()}</p>
              <p style={styles.successPayment}>{completedBillInfo.paymentLabel}</p>
            </div>
            <button onClick={handleSuccessOk} style={styles.successButton}>OK</button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '20px' },
  header: { textAlign: 'center', marginBottom: '30px', position: 'relative' },
  backButton: { position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  settleContainer: { display: 'flex', gap: '30px', maxWidth: '900px', margin: '0 auto', flexWrap: 'wrap' },
  billSummary: { background: '#2a2a2a', borderRadius: '12px', padding: '20px', flex: '1', minWidth: '280px' },
  customerDisplay: { background: '#1e3d1e', color: '#4ade80', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '16px' },
  summaryItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #333', fontSize: '14px' },
  quantityBadge: { color: '#4ade80', fontWeight: 'bold' },
  summaryTotal: { display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid #444', fontSize: '20px', fontWeight: 'bold' },
  paymentSection: { background: '#2a2a2a', borderRadius: '12px', padding: '20px', flex: '1', minWidth: '280px' },
  partialToggle: { marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #444' },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  paymentGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '15px' },
  paymentButton: { padding: '20px 15px', border: '2px solid #555', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' },
  splitSection: { marginTop: '20px' },
  splitInputs: { display: 'flex', gap: '15px' },
  splitInput: { flex: 1 },
  splitWarning: { color: '#e74c3c', fontSize: '13px', marginTop: '10px' },
  creditInput: { marginTop: '20px' },
  input: { width: '100%', padding: '12px', marginTop: '8px', border: '1px solid #555', borderRadius: '8px', background: '#333', color: '#fff', fontSize: '16px', boxSizing: 'border-box' },
  partialSection: { marginBottom: '20px' },
  inputGroup: { marginTop: '15px' },
  methodButtons: { display: 'flex', gap: '10px', marginTop: '8px' },
  methodButton: { flex: 1, padding: '12px', border: '1px solid #555', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' },
  partialBreakdown: { background: '#333', borderRadius: '8px', padding: '15px', marginTop: '15px' },
  breakdownRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0' },
  paidAmount: { color: '#4ade80', fontWeight: 'bold' },
  creditAmountText: { color: '#f87171', fontWeight: 'bold' },
  confirmButton: { width: '100%', background: '#2d5a2d', color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
  creditorSection: { marginTop: '10px' },
  creditorPicker: { position: 'relative' },
  selectedCreditor: { display: 'flex', alignItems: 'center', gap: '10px', background: '#2d5a2d', padding: '12px 15px', borderRadius: '8px' },
  existingDebt: { color: '#fbbf24', fontSize: '12px' },
  clearBtn: { marginLeft: 'auto', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' },
  creditorSearch: { position: 'relative' },
  creditorDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#333', borderRadius: '8px', marginTop: '4px', maxHeight: '250px', overflow: 'auto', zIndex: 10, border: '1px solid #555' },
  addCreditorOption: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 15px', cursor: 'pointer', background: '#2d4a3e', borderBottom: '1px solid #444', color: '#4ade80', fontWeight: 'bold' },
  searchHint: { color: '#888', fontSize: '12px', fontWeight: 'normal' },
  noCreditors: { padding: '15px', color: '#888', textAlign: 'center', fontSize: '13px' },
  creditorOption: { display: 'flex', justifyContent: 'space-between', padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #444' },
  pendingBadge: { color: '#f87171', fontSize: '12px' },
  addCreditorForm: { marginTop: '15px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#2a2a2a', padding: '30px', borderRadius: '12px', minWidth: '320px', textAlign: 'center' },
  modalButtons: { display: 'flex', gap: '10px', marginTop: '20px' },
  modalCancel: { flex: 1, padding: '12px', background: '#444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  modalConfirm: { flex: 1, padding: '12px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  successIcon: { width: '70px', height: '70px', borderRadius: '50%', background: '#1e3d1e', color: '#4ade80', fontSize: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '3px solid #2d5a2d' },
  successTitle: { color: '#4ade80', marginBottom: '15px', fontSize: '20px' },
  successDetails: { background: '#333', borderRadius: '8px', padding: '15px', marginBottom: '20px' },
  successTable: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' },
  successCustomer: { color: '#888', margin: '5px 0', fontSize: '14px' },
  successTotal: { fontSize: '24px', fontWeight: 'bold', color: '#4ade80', margin: '10px 0 5px 0' },
  successPayment: { color: '#888', margin: '0', fontSize: '14px' },
  successButton: { width: '100%', padding: '15px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
}

export default SettleView