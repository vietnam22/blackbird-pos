import { useState, useEffect } from 'react'
import { api } from '../utils/api'

function CreditorView({ user, onBack }) {
  const [creditors, setCreditors] = useState([])
  const [bills, setBills] = useState([])
  const [creditLogs, setCreditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCreditor, setExpandedCreditor] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCreditor, setNewCreditor] = useState({ name: '', phone: '', notes: '' })
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('creditors')
  const [showHistory, setShowHistory] = useState({}) // Track which creditors have history expanded

  const capitalizeFirstLetter = (str) => {
    if (!str) return str
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  const getLastSeenTimestamp = () => {
    const stored = localStorage.getItem(`blackbird_creditors_seen_${user.id}`)
    return stored ? new Date(stored) : null
  }

  const markAsSeen = () => {
    localStorage.setItem(`blackbird_creditors_seen_${user.id}`, new Date().toISOString())
  }

  const handleBack = () => {
    if (user.role === 'admin') markAsSeen()
    onBack()
  }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [creditorData, billsData, logsData] = await Promise.all([
      api.getCreditors(),
      api.getData(),
      api.getCreditLogs()
    ])
    setCreditors(creditorData.creditors || [])
    setBills(billsData.completedBills || [])
    setCreditLogs(logsData.logs || [])
    setLoading(false)
  }

  const getActivityLogs = () => {
    const newActivities = []
    const oldActivities = []
    const lastSeen = user.role === 'admin' ? getLastSeenTimestamp() : null
    const hasSeenBefore = lastSeen !== null

    creditLogs.forEach(log => {
      const logTime = new Date(log.timestamp)
      const activity = {
        id: `log-${log.id}`,
        type: log.type,
        timestamp: log.timestamp,
        description: getLogDescription(log),
        amount: log.amount,
        method: log.method,
        table: log.table,
        creditName: log.creditName,
        creditorName: log.creditorName,
        createdBy: log.createdBy || log.recordedBy || log.approvedBy || log.requestedBy,
        billId: log.billId,
      }

      const isPendingClearRequest = log.type === 'clear_requested' && !isCleared(log.billId)
      
      if (hasSeenBefore) {
        if (logTime > lastSeen) {
          newActivities.push(activity)
        } else if (user.role === 'admin' && isPendingClearRequest) {
          newActivities.push(activity)
        } else {
          oldActivities.push(activity)
        }
      } else {
        oldActivities.push(activity)
      }
    })

    newActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    oldActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    return { newActivities, oldActivities }
  }

  const isCleared = (billId) => {
    const bill = bills.find(b => b.id === billId)
    return bill?.creditPaid === true || bill?.creditCleared === true
  }

  const getLogDescription = (log) => {
    switch (log.type) {
      case 'credit_given': return `Credit given to ${log.creditName || 'Unknown'}`
      case 'payment_received': return `Payment from ${log.creditName || 'Unknown'}`
      case 'clear_requested': return `Clear requested for ${log.creditName || 'Unknown'}`
      case 'credit_cleared': return `Credit cleared for ${log.creditName || 'Unknown'}`
      case 'creditor_added': return `New creditor: ${log.creditorName || 'Unknown'}`
      default: return 'Activity'
    }
  }

  // Helper to check if a bill is cleared (handles both property names)
  const isBillCleared = (bill) => {
    return bill.creditPaid === true || bill.creditCleared === true
  }

  // Get PENDING bills only (not cleared)
  const getCreditorBills = (creditor) => {
    return bills.filter(b => {
      if (isBillCleared(b)) return false
      if (b.paymentMode !== 'credit' && b.paymentMode !== 'partial') return false
      if (b.creditorId === creditor.id) return true
      if (!b.creditorId && b.creditName?.toLowerCase() === creditor.name.toLowerCase()) return true
      return false
    })
  }

  // Get ALL bills for a creditor (including cleared - for HISTORY)
  const getAllCreditorBills = (creditor) => {
    return bills.filter(b => {
      if (b.paymentMode !== 'credit' && b.paymentMode !== 'partial') return false
      if (b.creditorId === creditor.id) return true
      if (!b.creditorId && b.creditName?.toLowerCase() === creditor.name.toLowerCase()) return true
      return false
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  // Get cleared bills only (for history section)
  const getClearedBills = (creditor) => {
    return getAllCreditorBills(creditor).filter(b => isBillCleared(b))
  }

  const getRemainingAmount = (bill) => {
    const originalCredit = bill.partialPayment ? bill.partialPayment.creditAmount : bill.total
    const payments = bill.creditPayments || []
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    return originalCredit - totalPaid
  }

  const getCreditorPending = (creditor) => {
    const creditorBills = getCreditorBills(creditor)
    return creditorBills.reduce((sum, b) => sum + getRemainingAmount(b), 0)
  }

  const handleAddCreditor = async () => {
    if (!newCreditor.name.trim()) {
      setMessage('Please enter a name')
      return
    }
    const result = await api.addCreditor(
      newCreditor.name.trim(),
      newCreditor.phone.trim(),
      newCreditor.notes.trim(),
      user.name
    )
    if (result.success) {
      setMessage('Creditor added!')
      setNewCreditor({ name: '', phone: '', notes: '' })
      setShowAddModal(false)
      loadData()
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleClearBill = async (bill) => {
    if (user.role === 'admin') {
      await api.approveClearCredit(bill.id, user.name)
      setMessage('Credit cleared!')
    } else {
      await api.requestClearCredit(bill.id, user.name)
      setMessage('Clear request submitted for approval')
    }
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handlePartialPayment = async () => {
    const amount = Number(paymentAmount)
    const remaining = getRemainingAmount(paymentModal)
    
    if (!amount || amount <= 0 || isNaN(amount)) {
      setMessage('Enter valid amount')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    if (amount > remaining) {
      setMessage(`Amount exceeds remaining (Rs. ${remaining})`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    try {
      if (amount === remaining) {
        if (user.role === 'admin') {
          await api.approveClearCredit(paymentModal.id, user.name)
          setMessage('Payment recorded & credit cleared!')
        } else {
          await api.requestClearCredit(paymentModal.id, user.name)
          setMessage('Payment recorded & clear request submitted!')
        }
      } else {
        setMessage(`Rs. ${amount} payment recorded!`)
      }
      
      setPaymentModal(null)
      setPaymentAmount('')
      await loadData()
    } catch (error) {
      console.error('Payment error:', error)
      setMessage('Error recording payment')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-NP', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const formatDateShort = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-NP', {
      month: 'short', day: 'numeric'
    })
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'credit_given': return '📒'
      case 'payment_received': return '💵'
      case 'clear_requested': return '📤'
      case 'credit_cleared': return '✅'
      case 'creditor_added': return '👤'
      default: return '•'
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case 'credit_given': return '#f87171'
      case 'payment_received': return '#4ade80'
      case 'clear_requested': return '#fbbf24'
      case 'credit_cleared': return '#4ade80'
      case 'creditor_added': return '#60a5fa'
      default: return '#888'
    }
  }

  const toggleHistory = (creditorId) => {
    setShowHistory(prev => ({ ...prev, [creditorId]: !prev[creditorId] }))
  }

  const totalPending = creditors.reduce((sum, c) => sum + getCreditorPending(c), 0)
  const { newActivities, oldActivities } = getActivityLogs()

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={handleBack} style={styles.backButton}>← Back</button>
        <h1>💳 Creditors</h1>
      </header>

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.tabs}>
        <button 
          onClick={() => setActiveTab('creditors')} 
          style={{ ...styles.tab, background: activeTab === 'creditors' ? '#444' : 'transparent' }}
        >
          Creditors
        </button>
        <button 
          onClick={() => setActiveTab('activity')} 
          style={{ ...styles.tab, background: activeTab === 'activity' ? '#444' : 'transparent' }}
        >
          Activity Log
          {user.role === 'admin' && newActivities.length > 0 && (
            <span style={styles.tabBadge}>{newActivities.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'creditors' && (
        <>
          {totalPending > 0 && (
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Outstanding</div>
              <div style={styles.summaryAmount}>Rs. {totalPending.toLocaleString()}</div>
            </div>
          )}

          {user.role === 'admin' && (
            <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
              + Add Creditor
            </button>
          )}

          <div style={styles.list}>
            {creditors.length === 0 ? (
              <p style={styles.emptyText}>No creditors yet</p>
            ) : (
              creditors.map(c => {
                const creditorBills = getCreditorBills(c)
                const clearedBills = getClearedBills(c)
                const pending = getCreditorPending(c)
                const isExpanded = expandedCreditor === c.id
                const historyOpen = showHistory[c.id]

                return (
                  <div key={c.id} style={styles.card}>
                    <div 
                      style={styles.cardHeader}
                      onClick={() => setExpandedCreditor(isExpanded ? null : c.id)}
                    >
                      <div>
                        <div style={styles.creditorName}>{c.name}</div>
                        {c.phone && <div style={styles.phone}>📞 {c.phone}</div>}
                      </div>
                      <div style={styles.headerRight}>
                        {pending > 0 ? (
                          <div style={styles.pendingBadge}>Rs. {pending.toLocaleString()}</div>
                        ) : (
                          <div style={styles.clearedBadge}>✓ Clear</div>
                        )}
                        <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={styles.billsSection}>
                        {/* PENDING BILLS SECTION */}
                        <div style={styles.sectionHeader}>
                          <span style={styles.sectionTitlePending}>📋 Pending Bills</span>
                          <span style={styles.sectionCount}>{creditorBills.length}</span>
                        </div>
                        
                        {creditorBills.length === 0 ? (
                          <p style={styles.noBills}>No pending bills</p>
                        ) : (
                          creditorBills.map(bill => {
                            const originalCredit = bill.partialPayment 
                              ? bill.partialPayment.creditAmount 
                              : bill.total
                            const remaining = getRemainingAmount(bill)
                            const payments = bill.creditPayments || []

                            return (
                              <div key={bill.id} style={styles.billCard}>
                                <div style={styles.billHeader}>
                                  <span style={styles.billTable}>{bill.table}</span>
                                  <span style={styles.billDate}>{formatDate(bill.timestamp)}</span>
                                </div>

                                <div style={styles.billItems}>
                                  {bill.items.slice(0, 3).map((item, i) => (
                                    <span key={i} style={styles.itemTag}>{item.name}</span>
                                  ))}
                                  {bill.items.length > 3 && (
                                    <span style={styles.itemTag}>+{bill.items.length - 3} more</span>
                                  )}
                                </div>

                                <div style={styles.amountSection}>
                                  {bill.partialPayment && (
                                    <div style={styles.amountRow}>
                                      <span style={styles.amountLabel}>Paid at bill:</span>
                                      <span style={styles.paidText}>
                                        Rs. {bill.partialPayment.paidAmount} ({bill.partialPayment.paidMethod})
                                      </span>
                                    </div>
                                  )}
                                  <div style={styles.amountRow}>
                                    <span style={styles.amountLabel}>Credit amount:</span>
                                    <span>Rs. {originalCredit}</span>
                                  </div>
                                  {payments.length > 0 && (
                                    <>
                                      <div style={styles.paymentsHeader}>Payments made:</div>
                                      {payments.map((p, i) => (
                                        <div key={i} style={styles.paymentRow}>
                                          <span>Rs. {p.amount} ({p.method})</span>
                                          <span style={styles.paymentMeta}>{formatDateShort(p.paidAt)}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                  <div style={styles.remainingRow}>
                                    <span>Remaining:</span>
                                    <span style={styles.remainingAmount}>Rs. {remaining}</span>
                                  </div>
                                </div>

                                <div style={styles.billActions}>
                                  {remaining > 0 && (
                                    <>
                                      <button
                                        onClick={() => { setPaymentModal(bill); setPaymentAmount(''); setPaymentMethod('cash') }}
                                        style={styles.partialBtn}
                                      >
                                        💵 Add Payment
                                      </button>
                                      <button
                                        onClick={() => handleClearBill(bill)}
                                        style={bill.clearRequested && user.role !== 'admin' ? styles.pendingApproval : styles.clearBtn}
                                        disabled={bill.clearRequested && user.role !== 'admin'}
                                      >
                                        {bill.clearRequested && user.role !== 'admin' 
                                          ? '⏳ Pending Approval' 
                                          : user.role === 'admin' ? '✓ Clear Full' : '📤 Request Clear'}
                                      </button>
                                    </>
                                  )}
                                </div>

                                {bill.clearRequested && user.role === 'admin' && (
                                  <div style={styles.approvalSection}>
                                    <span style={styles.approvalText}>
                                      🔔 {bill.clearRequestedBy} requested clearance
                                    </span>
                                    <button onClick={() => handleClearBill(bill)} style={styles.approveBtn}>
                                      ✓ Approve
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}

                        {/* HISTORY SECTION - CLEARED BILLS */}
                        {clearedBills.length > 0 && (
                          <>
                            <div 
                              style={styles.historyHeader}
                              onClick={() => toggleHistory(c.id)}
                            >
                              <span style={styles.sectionTitleHistory}>
                                ✅ Payment History ({clearedBills.length})
                              </span>
                              <span style={styles.expandIcon}>{historyOpen ? '▼' : '▶'}</span>
                            </div>

                            {historyOpen && (
                              <div style={styles.historyList}>
                                {clearedBills.map(bill => {
                                  const originalCredit = bill.partialPayment 
                                    ? bill.partialPayment.creditAmount 
                                    : bill.total
                                  const payments = bill.creditPayments || []

                                  return (
                                    <div key={bill.id} style={styles.historyCard}>
                                      <div style={styles.historyCardHeader}>
                                        <div>
                                          <span style={styles.billTable}>{bill.table}</span>
                                          <span style={styles.clearedTag}>✓ Cleared</span>
                                        </div>
                                        <span style={styles.billDate}>{formatDate(bill.timestamp)}</span>
                                      </div>

                                      <div style={styles.billItems}>
                                        {bill.items.slice(0, 3).map((item, i) => (
                                          <span key={i} style={styles.itemTag}>{item.name}</span>
                                        ))}
                                        {bill.items.length > 3 && (
                                          <span style={styles.itemTag}>+{bill.items.length - 3} more</span>
                                        )}
                                      </div>

                                      <div style={styles.historyAmountSection}>
                                        {bill.partialPayment && (
                                          <div style={styles.amountRow}>
                                            <span style={styles.amountLabel}>Paid at bill:</span>
                                            <span style={styles.paidText}>
                                              Rs. {bill.partialPayment.paidAmount}
                                            </span>
                                          </div>
                                        )}
                                        <div style={styles.amountRow}>
                                          <span style={styles.amountLabel}>Credit was:</span>
                                          <span>Rs. {originalCredit}</span>
                                        </div>
                                        {payments.length > 0 && (
                                          <>
                                            <div style={styles.paymentsHeader}>Payments:</div>
                                            {payments.map((p, i) => (
                                              <div key={i} style={styles.paymentRow}>
                                                <span>Rs. {p.amount} ({p.method})</span>
                                                <span style={styles.paymentMeta}>{formatDateShort(p.paidAt)}</span>
                                              </div>
                                            ))}
                                          </>
                                        )}
                                        {bill.clearedAt && (
                                          <div style={styles.clearedInfo}>
                                            Cleared on {formatDate(bill.clearedAt)}
                                            {bill.clearedBy && ` by ${bill.clearedBy}`}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {!isExpanded && (creditorBills.length > 0 || clearedBills.length > 0) && (
                      <div style={styles.billCount}>
                        {creditorBills.length > 0 && `${creditorBills.length} pending`}
                        {creditorBills.length > 0 && clearedBills.length > 0 && ' • '}
                        {clearedBills.length > 0 && `${clearedBills.length} cleared`}
                        {' • Click to expand'}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'activity' && (
        <div style={styles.activitySection}>
          <div style={styles.activityGroup}>
            <h3 style={styles.activityTitleNew}>🔔 New Activity</h3>
            {newActivities.length === 0 ? (
              <p style={styles.emptyTextSmall}>No new activity</p>
            ) : (
              <div style={styles.activityList}>
                {newActivities.map(activity => (
                  <div key={activity.id} style={styles.activityItemNew}>
                    <div style={styles.activityIcon}>{getActivityIcon(activity.type)}</div>
                    <div style={styles.activityContent}>
                      <div style={styles.activityHeader}>
                        <span style={{ ...styles.activityType, color: getActivityColor(activity.type) }}>
                          {activity.description}
                        </span>
                        <span style={styles.activityDate}>{formatDate(activity.timestamp)}</span>
                      </div>
                      <div style={styles.activityDetails}>
                        {activity.amount && (
                          <span style={{ 
                            ...styles.activityAmount, 
                            color: activity.type === 'payment_received' || activity.type === 'credit_cleared' 
                              ? '#4ade80' : '#f87171' 
                          }}>
                            Rs. {activity.amount.toLocaleString()}
                          </span>
                        )}
                        {activity.method && <span style={styles.activityMethod}>via {activity.method}</span>}
                        {activity.table && <span style={styles.activityMeta}>• {activity.table}</span>}
                        {activity.createdBy && <span style={styles.activityMeta}>• by {activity.createdBy}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.activityGroup}>
            <h3 style={styles.activityTitleOld}>📋 History (Last 2 Days)</h3>
            {oldActivities.length === 0 ? (
              <p style={styles.emptyTextSmall}>No previous activity</p>
            ) : (
              <div style={styles.activityList}>
                {oldActivities.slice(0, 30).map(activity => (
                  <div key={activity.id} style={styles.activityItem}>
                    <div style={styles.activityIcon}>{getActivityIcon(activity.type)}</div>
                    <div style={styles.activityContent}>
                      <div style={styles.activityHeader}>
                        <span style={{ ...styles.activityType, color: getActivityColor(activity.type) }}>
                          {activity.description}
                        </span>
                        <span style={styles.activityDate}>{formatDate(activity.timestamp)}</span>
                      </div>
                      <div style={styles.activityDetails}>
                        {activity.amount && (
                          <span style={{ 
                            ...styles.activityAmount, 
                            color: activity.type === 'payment_received' || activity.type === 'credit_cleared' 
                              ? '#4ade80' : '#f87171' 
                          }}>
                            Rs. {activity.amount.toLocaleString()}
                          </span>
                        )}
                        {activity.method && <span style={styles.activityMethod}>via {activity.method}</span>}
                        {activity.table && <span style={styles.activityMeta}>• {activity.table}</span>}
                        {activity.createdBy && <span style={styles.activityMeta}>• by {activity.createdBy}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {oldActivities.length > 30 && (
                  <p style={styles.moreText}>+ {oldActivities.length - 30} more activities</p>
                )}
              </div>
            )}
            <p style={styles.olderLogsNote}>📁 Older activity logs are stored in the database</p>
          </div>
        </div>
      )}

      {/* Add Creditor Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Add New Creditor</h3>
            <div style={styles.inputGroup}>
              <label>Name *</label>
              <input
                type="text"
                value={newCreditor.name}
                onChange={(e) => setNewCreditor({ ...newCreditor, name: capitalizeFirstLetter(e.target.value) })}
                placeholder="Customer name"
                style={styles.input}
                autoFocus
              />
            </div>
            <div style={styles.inputGroup}>
              <label>Phone (optional)</label>
              <input
                type="text"
                value={newCreditor.phone}
                onChange={(e) => setNewCreditor({ ...newCreditor, phone: e.target.value })}
                placeholder="Phone number"
                style={styles.input}
              />
            </div>
            <div style={styles.inputGroup}>
              <label>Notes (optional)</label>
              <input
                type="text"
                value={newCreditor.notes}
                onChange={(e) => setNewCreditor({ ...newCreditor, notes: e.target.value })}
                placeholder="Any notes"
                style={styles.input}
              />
            </div>
            <div style={styles.modalButtons}>
              <button onClick={() => { setShowAddModal(false); setNewCreditor({ name: '', phone: '', notes: '' }) }} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleAddCreditor} style={styles.confirmBtn}>
                Add Creditor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Record Payment</h3>
            <p style={styles.modalSubtitle}>
              {paymentModal.creditName || 'Unknown'} - Remaining: Rs. {getRemainingAmount(paymentModal)}
            </p>
            <div style={styles.inputGroup}>
              <label>Amount</label>
              <input
                type="text"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter amount"
                style={styles.input}
                autoFocus
              />
            </div>
            <div style={styles.quickFill}>
              <span style={styles.quickLabel}>Quick:</span>
              <button onClick={() => setPaymentAmount(String(getRemainingAmount(paymentModal)))} style={styles.quickBtn}>
                Full (Rs. {getRemainingAmount(paymentModal)})
              </button>
            </div>
            <div style={styles.inputGroup}>
              <label>Payment Method</label>
              <div style={styles.methodButtons}>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  style={{ ...styles.methodBtn, background: paymentMethod === 'cash' ? '#2d5a2d' : '#444' }}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => setPaymentMethod('qr')}
                  style={{ ...styles.methodBtn, background: paymentMethod === 'qr' ? '#2d4a5a' : '#444' }}
                >
                  📱 QR
                </button>
              </div>
            </div>
            <div style={styles.modalButtons}>
              <button onClick={() => { setPaymentModal(null); setPaymentAmount('') }} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handlePartialPayment} style={styles.confirmBtn}>
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '20px', maxWidth: '600px', margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: '20px', position: 'relative' },
  backButton: { position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  message: { background: '#2d5a2d', padding: '12px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px' },
  tabs: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' },
  tab: { padding: '10px 25px', border: '1px solid #444', borderRadius: '20px', color: '#fff', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  tabBadge: { background: '#f87171', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' },
  summaryCard: { background: 'linear-gradient(135deg, #5a2d2d 0%, #3d1e1e 100%)', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '20px' },
  summaryLabel: { color: '#f87171', fontSize: '14px', marginBottom: '5px' },
  summaryAmount: { fontSize: '32px', fontWeight: 'bold', color: '#fff' },
  addButton: { width: '100%', padding: '15px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', marginBottom: '20px' },
  list: { display: 'flex', flexDirection: 'column', gap: '15px' },
  emptyText: { color: '#666', textAlign: 'center', padding: '40px' },
  card: { background: '#2a2a2a', borderRadius: '12px', marginBottom: '15px', overflow: 'hidden' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', cursor: 'pointer' },
  creditorName: { fontWeight: 'bold', fontSize: '18px' },
  phone: { color: '#888', fontSize: '13px', marginTop: '4px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  pendingBadge: { background: '#5a2d2d', color: '#f87171', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' },
  clearedBadge: { color: '#4ade80', fontSize: '14px' },
  expandIcon: { color: '#888', fontSize: '12px' },
  billCount: { padding: '0 20px 15px', color: '#666', fontSize: '13px' },
  billsSection: { borderTop: '1px solid #333', padding: '15px 20px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  sectionTitlePending: { color: '#f87171', fontWeight: 'bold', fontSize: '14px' },
  sectionTitleHistory: { color: '#4ade80', fontWeight: 'bold', fontSize: '14px' },
  sectionCount: { background: '#444', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', color: '#888' },
  noBills: { color: '#666', textAlign: 'center', padding: '10px' },
  billCard: { background: '#333', borderRadius: '8px', padding: '15px', marginBottom: '10px' },
  billHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  billTable: { fontWeight: 'bold' },
  billDate: { color: '#888', fontSize: '13px' },
  billItems: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' },
  itemTag: { background: '#444', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' },
  amountSection: { background: '#2a2a2a', borderRadius: '6px', padding: '12px', marginBottom: '12px' },
  amountRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' },
  amountLabel: { color: '#888' },
  paidText: { color: '#4ade80' },
  paymentsHeader: { color: '#888', fontSize: '12px', marginTop: '8px', marginBottom: '4px', borderTop: '1px solid #333', paddingTop: '8px' },
  paymentRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#4ade80' },
  paymentMeta: { color: '#666', fontSize: '11px' },
  remainingRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: '8px', borderTop: '1px solid #444', fontWeight: 'bold' },
  remainingAmount: { color: '#f87171' },
  billActions: { display: 'flex', gap: '10px' },
  partialBtn: { flex: 1, padding: '10px', background: '#3d3d3d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  clearBtn: { flex: 1, padding: '10px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  pendingApproval: { background: '#5a4a2d', color: '#fbbf24', padding: '10px', borderRadius: '6px', textAlign: 'center', flex: 1, fontSize: '13px' },
  approvalSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '10px', background: '#3d3a2a', borderRadius: '6px' },
  approvalText: { color: '#fbbf24', fontSize: '13px' },
  approveBtn: { padding: '8px 15px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  // History section styles
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0 10px', marginTop: '15px', borderTop: '1px solid #444', cursor: 'pointer' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  historyCard: { background: '#2d3a2d', borderRadius: '8px', padding: '12px', border: '1px solid #3d4a3d' },
  historyCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  clearedTag: { background: '#2d5a2d', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '8px' },
  historyAmountSection: { background: '#1a2a1a', borderRadius: '6px', padding: '10px', fontSize: '13px' },
  clearedInfo: { color: '#4ade80', fontSize: '12px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #3d4a3d' },
  // Activity log styles
  activitySection: { maxWidth: '500px', margin: '0 auto' },
  activityGroup: { marginBottom: '25px' },
  activityTitleNew: { marginBottom: '15px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' },
  activityTitleOld: { marginBottom: '15px', color: '#888', display: 'flex', alignItems: 'center', gap: '8px' },
  activityList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  activityItem: { display: 'flex', gap: '12px', background: '#2a2a2a', borderRadius: '8px', padding: '12px 15px' },
  activityItemNew: { display: 'flex', gap: '12px', background: '#2a2a2a', borderRadius: '8px', padding: '12px 15px', border: '1px solid #5a4a2d' },
  activityIcon: { fontSize: '20px', width: '30px', textAlign: 'center' },
  activityContent: { flex: 1 },
  activityHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' },
  activityType: { fontWeight: 'bold', fontSize: '14px' },
  activityDate: { color: '#666', fontSize: '12px' },
  activityDetails: { display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '13px', alignItems: 'center' },
  activityAmount: { fontWeight: 'bold' },
  activityMethod: { color: '#888' },
  activityMeta: { color: '#666' },
  emptyTextSmall: { color: '#666', textAlign: 'center', padding: '20px', background: '#2a2a2a', borderRadius: '8px' },
  moreText: { color: '#666', textAlign: 'center', padding: '10px', fontSize: '13px' },
  olderLogsNote: { color: '#555', textAlign: 'center', padding: '15px', fontSize: '12px', marginTop: '15px', borderTop: '1px solid #333' },
  // Modal styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#2a2a2a', padding: '25px', borderRadius: '12px', minWidth: '320px', maxWidth: '400px' },
  modalSubtitle: { color: '#888', textAlign: 'center', marginBottom: '20px' },
  inputGroup: { marginBottom: '15px' },
  input: { width: '100%', padding: '12px', marginTop: '5px', border: '1px solid #555', borderRadius: '8px', background: '#333', color: '#fff', fontSize: '16px', boxSizing: 'border-box' },
  methodButtons: { display: 'flex', gap: '10px', marginTop: '8px' },
  methodBtn: { flex: 1, padding: '12px', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px' },
  quickFill: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' },
  quickLabel: { color: '#888', fontSize: '13px' },
  quickBtn: { padding: '6px 12px', background: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  modalButtons: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '12px', background: '#444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  confirmBtn: { flex: 1, padding: '12px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
}

export default CreditorView