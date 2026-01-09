import { useState } from 'react'

const PAYMENT_MODES = [
  { id: 'cash', label: '💵 Cash', color: '#2d5a2d' },
  { id: 'qr', label: '📱 QR', color: '#2d4a6d' },
  { id: 'credit', label: '📝 Credit', color: '#6d4a2d' },
  { id: 'cash_qr', label: '💵+📱 Split', color: '#4a4a6d' },
]

function SalesView({ completedBills, onBack }) {
  const [filter, setFilter] = useState('today')

  const getFilteredBills = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    return completedBills.filter(bill => {
      const billDate = new Date(bill.timestamp)
      if (filter === 'today') return billDate >= today
      if (filter === 'week') return billDate >= weekAgo
      if (filter === 'month') return billDate >= monthAgo
      return true
    })
  }

  const filteredBills = getFilteredBills()
  const totalSales = filteredBills.reduce((sum, b) => sum + b.total, 0)

  const byPaymentMode = PAYMENT_MODES.reduce((acc, mode) => {
    const modeBills = filteredBills.filter(b => b.paymentMode === mode.id)
    acc[mode.id] = {
      count: modeBills.length,
      total: modeBills.reduce((sum, b) => sum + b.total, 0),
      label: mode.label,
      color: mode.color,
    }
    return acc
  }, {})

  const partialBills = filteredBills.filter(b => b.paymentMode === 'partial')
  byPaymentMode['partial'] = {
    count: partialBills.length,
    total: partialBills.reduce((sum, b) => sum + b.total, 0),
    label: 'Partial Payment',
    color: '#8b4a6d',
  }

  const outstandingCredits = completedBills.filter(
    b => (b.paymentMode === 'credit' || b.paymentMode === 'partial') && !b.creditPaid
  )
  const totalCredit = outstandingCredits.reduce((sum, b) => {
    const originalCredit = b.partialPayment ? b.partialPayment.creditAmount : b.total
    const payments = b.creditPayments || []
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
    return sum + (originalCredit - totalPaid)
  }, 0)

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h1>📊 Sales</h1>
      </header>

      <div style={styles.filterBar}>
        {['today', 'week', 'month', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ ...styles.filterButton, background: filter === f ? '#444' : 'transparent' }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          <h3>Summary</h3>
          <div style={styles.bigNumber}>Rs. {totalSales.toLocaleString()}</div>
          <div style={styles.subText}>{filteredBills.length} bills</div>
        </div>

        <div style={styles.card}>
          <h3>By Payment Mode</h3>
          <div style={styles.modeList}>
            {[...PAYMENT_MODES, { id: 'partial', label: 'Partial Payment', color: '#8b4a6d' }].map(mode => (
              <div key={mode.id} style={styles.modeRow}>
                <div style={styles.modeLabel}>
                  <span style={{ ...styles.modeDot, background: mode.color }}></span>
                  {mode.label}
                </div>
                <div style={styles.modeStats}>
                  <span style={styles.modeCount}>{byPaymentMode[mode.id]?.count || 0} bills</span>
                  <span style={styles.modeTotal}>Rs. {(byPaymentMode[mode.id]?.total || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalCredit > 0 && (
          <div style={styles.creditCard}>
            <div style={styles.creditHeader}>
              <span>💳 Outstanding Credits</span>
              <span style={styles.creditTotal}>Rs. {totalCredit.toLocaleString()}</span>
            </div>
            <p style={styles.creditNote}>
              {outstandingCredits.length} pending bill{outstandingCredits.length > 1 ? 's' : ''} • 
              Manage in Creditors section
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '20px' },
  header: { textAlign: 'center', marginBottom: '20px', position: 'relative' },
  backButton: { position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  filterBar: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px' },
  filterButton: { padding: '8px 20px', border: '1px solid #444', borderRadius: '20px', color: '#fff', cursor: 'pointer', fontSize: '14px' },
  content: { maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { background: '#2a2a2a', borderRadius: '12px', padding: '20px' },
  bigNumber: { fontSize: '36px', fontWeight: 'bold', marginTop: '10px' },
  subText: { color: '#888', marginTop: '5px' },
  modeList: { marginTop: '15px' },
  modeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #333' },
  modeLabel: { display: 'flex', alignItems: 'center', gap: '10px' },
  modeDot: { width: '12px', height: '12px', borderRadius: '50%' },
  modeStats: { display: 'flex', gap: '20px', alignItems: 'center' },
  modeCount: { color: '#888', fontSize: '14px' },
  modeTotal: { fontWeight: 'bold', minWidth: '100px', textAlign: 'right' },
  creditCard: { background: '#3d1e1e', border: '1px solid #5a2d2d', borderRadius: '12px', padding: '20px' },
  creditHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  creditTotal: { color: '#f87171', fontSize: '20px', fontWeight: 'bold' },
  creditNote: { color: '#888', fontSize: '13px', marginTop: '10px', marginBottom: 0 },
}

export default SalesView