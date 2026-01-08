import { useState, useEffect } from 'react'
import { api } from '../utils/api'

function DayManagement({ dayStatus, user, onStartDay, onEndDay, onClose, onVerifyPin, openTabs }) {
  const [showPinEntry, setShowPinEntry] = useState(false)
  const [action, setAction] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [activeWorkers, setActiveWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [startingCash, setStartingCash] = useState('')
  const [showCashInput, setShowCashInput] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [daySummary, setDaySummary] = useState(null)

  const isActive = dayStatus?.currentDay !== null

  useEffect(() => {
    loadActiveWorkers()
  }, [])

  const loadActiveWorkers = async () => {
    try {
      const active = await api.getActiveTimesheets()
      setActiveWorkers(active)
    } catch (err) {
      console.error('[DayMgmt] Failed to load active workers:', err)
    }
    setLoading(false)
  }

  // Calculate day summary including email data
  const calculateDaySummary = async () => {
    console.log('[DayMgmt] Calculating day summary...')
    
    try {
      const billsData = await api.getData()
      const inventoryData = await api.getInventory()
      
      if (!dayStatus?.currentDay?.startedAt) {
        console.error('[DayMgmt] No current day found!')
        return null
      }
      
      const dayDate = new Date(dayStatus.currentDay.startedAt).toISOString().split('T')[0]
      const startingCashAmount = dayStatus.currentDay.startingCash || 0
      
      // Filter today's bills
      const dayBills = (billsData.completedBills || []).filter(b => {
        const billDate = new Date(b.timestamp).toISOString().split('T')[0]
        return billDate === dayDate
      })

      let cashFromSales = 0
      let qrFromSales = 0
      let creditGiven = 0

      dayBills.forEach(bill => {
        if (bill.paymentMode === 'cash') {
          cashFromSales += bill.total
        } else if (bill.paymentMode === 'qr') {
          qrFromSales += bill.total
        } else if (bill.paymentMode === 'cash_qr') {
          cashFromSales += bill.cashAmount || 0
          qrFromSales += bill.qrAmount || 0
        } else if (bill.paymentMode === 'credit') {
          creditGiven += bill.total
        } else if (bill.paymentMode === 'partial' && bill.partialPayment) {
          if (bill.partialPayment.paidMethod === 'cash') {
            cashFromSales += bill.partialPayment.paidAmount
          } else {
            qrFromSales += bill.partialPayment.paidAmount
          }
          creditGiven += bill.partialPayment.creditAmount
        }
      })

      // Credit payments collected today
      let cashFromCredit = 0
      let qrFromCredit = 0
      ;(billsData.completedBills || []).forEach(bill => {
        if (bill.creditPayments) {
          bill.creditPayments.forEach(payment => {
            const paymentDate = new Date(payment.paidAt).toISOString().split('T')[0]
            if (paymentDate === dayDate) {
              if (payment.method === 'cash') {
                cashFromCredit += payment.amount
              } else {
                qrFromCredit += payment.amount
              }
            }
          })
        }
      })

      // Inventory expenses - filter by date properly
      const inventoryItems = (inventoryData.entries || []).filter(e => {
        const entryDate = e.addedAt ? new Date(e.addedAt).toISOString().split('T')[0] : e.date
        return entryDate === dayDate
      })
      
      let inventoryCash = 0
      let inventoryQR = 0
      inventoryItems.forEach(e => {
        if (e.paidVia === 'qr') {
          inventoryQR += e.totalPrice || 0
        } else {
          inventoryCash += e.totalPrice || 0
        }
      })

      const expectedCash = startingCashAmount + cashFromSales + cashFromCredit - inventoryCash
      const expectedQR = qrFromSales + qrFromCredit - inventoryQR
      const totalSales = dayBills.reduce((sum, b) => sum + b.total, 0)

      // === EMAIL DATA: Sold items list ===
      const soldItemsList = []
      const itemTotals = {}
      dayBills.forEach(bill => {
        (bill.items || []).forEach(item => {
          const key = item.name
          if (!itemTotals[key]) {
            itemTotals[key] = { name: item.name, quantity: 0, total: 0 }
          }
          itemTotals[key].quantity += item.quantity || 1
          itemTotals[key].total += (item.price || 0) * (item.quantity || 1)
        })
      })
      Object.values(itemTotals).forEach(item => soldItemsList.push(item))

      // === EMAIL DATA: Staff wages ===
      let staffWages = []
      let totalWages = 0
      try {
        const tsData = await api.getTimesheets()
        const dayTimesheets = (tsData.entries || []).filter(t => {
          const tDate = new Date(t.clockIn).toISOString().split('T')[0]
          return tDate === dayDate
        })
        staffWages = dayTimesheets.map(t => ({
          name: t.userName,
          hours: t.hoursWorked || 0
        }))
        totalWages = staffWages.reduce((sum, s) => sum + (s.hours * 70), 0)
      } catch (e) {
        console.error('Failed to load timesheets for email:', e)
      }

      // === EMAIL DATA: Totals ===
      const rent = 800
      const totalIn = totalSales
      const inventoryTotal = inventoryCash + inventoryQR
      const totalOut = inventoryTotal + totalWages + rent
      const netProfit = totalIn - totalOut

      const summary = {
        // Day management display fields
        startingCash: startingCashAmount,
        cashFromSales,
        qrFromSales,
        creditGiven,
        cashFromCredit,
        qrFromCredit,
        inventoryCash,
        inventoryQR,
        inventoryTotal,
        expectedCash,
        expectedQR,
        totalSales,
        billCount: dayBills.length,
        
        // Email fields
        soldItemsList,
        inventoryItems,
        staffWages,
        totalWages,
        totalIn,
        totalOut,
        rent,
        netProfit,
      }
      
      console.log('[DayMgmt] Calculated summary:', summary)
      return summary
    } catch (err) {
      console.error('[DayMgmt] Error calculating summary:', err)
      throw err
    }
  }

  const getOpenTablesList = () => {
    return Object.keys(openTabs || {}).filter(key => {
      if (key === '_counter') return false
      const tab = openTabs[key]
      return tab && tab.items && tab.items.length > 0
    })
  }

  const openTablesList = getOpenTablesList()
  const hasOpenTabs = openTablesList.length > 0
  const hasActiveWorkers = activeWorkers.length > 0
  const canEndDay = !hasOpenTabs && !hasActiveWorkers

  const handleStartClick = () => {
    setAction('start')
    setShowCashInput(true)
    setStartingCash('')
    setError('')
  }

  const handleEndClick = async () => {
    if (!canEndDay) return
    
    setLoading(true)
    setError('')
    
    try {
      const summary = await calculateDaySummary()
      if (summary) {
        setDaySummary(summary)
        setShowEndConfirm(true)
      } else {
        setError('Failed to calculate summary - no data')
      }
    } catch (err) {
      console.error('[DayMgmt] Failed to calculate summary:', err)
      setError('Failed to load summary: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCashInputNext = () => {
    if (!startingCash || isNaN(Number(startingCash))) {
      setError('Enter valid starting cash amount')
      return
    }
    setError('')
    setShowCashInput(false)
    setShowPinEntry(true)
    setPin('')
  }

  const handleConfirmEnd = () => {
    setAction('end')
    setShowEndConfirm(false)
    setShowPinEntry(true)
    setPin('')
    setError('')
  }

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      setError('Enter 4-digit PIN')
      return
    }

    setProcessing(true)
    setError('')
    
    try {
      const result = await onVerifyPin(pin)
      
      if (!result.success) {
        setError('Invalid PIN')
        setPin('')
        setProcessing(false)
        return
      }

      if (action === 'start') {
        const startResult = await onStartDay(result.user.id, result.user.name, Number(startingCash))
        
        if (startResult.success) {
          setShowPinEntry(false)
          onClose()
        } else {
          setError('Failed to start day')
        }
      } else if (action === 'end') {
        // Build email summary object
        const emailSummary = daySummary ? {
          soldItemsList: daySummary.soldItemsList || [],
          totalIn: daySummary.totalIn || daySummary.totalSales || 0,
          inventoryItems: daySummary.inventoryItems || [],
          inventoryTotal: daySummary.inventoryTotal || 0,
          staffWages: daySummary.staffWages || [],
          totalWages: daySummary.totalWages || 0,
          rent: daySummary.rent || 0,
          totalOut: daySummary.totalOut || 0,
          netProfit: daySummary.netProfit || 0,
        } : null

        const endResult = await onEndDay(
          result.user.id, 
          result.user.name, 
          daySummary?.expectedCash || 0, 
          daySummary?.expectedQR || 0,
          emailSummary
        )
        
        if (endResult.success) {
          setShowPinEntry(false)
          setShowSummary(true)
        } else {
          setError('Failed to end day')
        }
      }
    } catch (err) {
      console.error('[DayMgmt] Error in PIN submit:', err)
      setError('An error occurred: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (showCashInput) handleCashInputNext()
      else if (showPinEntry && !processing) handlePinSubmit()
    } else if (e.key === 'Escape') {
      setShowPinEntry(false)
      setShowCashInput(false)
      setShowEndConfirm(false)
    }
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString('en-NP', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p>Loading...</p>
          {error && <p style={styles.error}>{error}</p>}
        </div>
      </div>
    )
  }

  // End of Day Summary (after successful close)
  if (showSummary && daySummary) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2>✅ Day Closed Successfully</h2>
          
          <div style={styles.summaryGrid}>
            <div style={styles.summaryBox}>
              <span style={styles.summaryLabel}>💵 Expected Cash</span>
              <span style={styles.summaryValue}>Rs. {(daySummary.expectedCash || 0).toLocaleString()}</span>
            </div>
            <div style={styles.summaryBox}>
              <span style={styles.summaryLabel}>📱 Expected QR</span>
              <span style={styles.summaryValue}>Rs. {(daySummary.expectedQR || 0).toLocaleString()}</span>
            </div>
            <div style={styles.summaryBox}>
              <span style={styles.summaryLabel}>🧾 Total Sales</span>
              <span style={styles.summaryValue}>Rs. {(daySummary.totalSales || 0).toLocaleString()}</span>
            </div>
            <div style={styles.summaryBox}>
              <span style={styles.summaryLabel}>📦 Inventory Spent</span>
              <span style={{ ...styles.summaryValue, color: '#f87171' }}>
                Rs. {(daySummary.inventoryTotal || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <p style={styles.emailNote}>📧 Summary email sent</p>
          
          <button onClick={onClose} style={styles.closeButton}>Close</button>
        </div>
      </div>
    )
  }

  // End Day Confirmation with Summary Preview
  if (showEndConfirm && daySummary) {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.modal, maxWidth: '450px' }}>
          <h2>🔴 End Day</h2>
          <p style={styles.subtitle}>Review calculated totals</p>

          <div style={styles.expectedSection}>
            <div style={styles.expectedRow}>
              <div style={styles.expectedItem}>
                <span style={styles.expectedLabel}>💵 Expected Cash</span>
                <span style={styles.expectedValue}>Rs. {(daySummary.expectedCash || 0).toLocaleString()}</span>
              </div>
              <div style={styles.expectedItem}>
                <span style={styles.expectedLabel}>📱 Expected QR</span>
                <span style={styles.expectedValue}>Rs. {(daySummary.expectedQR || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style={styles.breakdownSection}>
            <div style={styles.breakdownTitle}>Cash Calculation</div>
            <div style={styles.breakdownRow}>
              <span>Starting Cash</span>
              <span>Rs. {(daySummary.startingCash || 0).toLocaleString()}</span>
            </div>
            <div style={styles.breakdownRow}>
              <span>+ Sales (Cash)</span>
              <span style={{ color: '#4ade80' }}>Rs. {(daySummary.cashFromSales || 0).toLocaleString()}</span>
            </div>
            <div style={styles.breakdownRow}>
              <span>+ Credit Collected (Cash)</span>
              <span style={{ color: '#4ade80' }}>Rs. {(daySummary.cashFromCredit || 0).toLocaleString()}</span>
            </div>
            <div style={styles.breakdownRow}>
              <span>- Inventory (Cash)</span>
              <span style={{ color: '#f87171' }}>Rs. {(daySummary.inventoryCash || 0).toLocaleString()}</span>
            </div>
          </div>

          <div style={styles.breakdownSection}>
            <div style={styles.breakdownTitle}>QR Calculation</div>
            <div style={styles.breakdownRow}>
              <span>Sales (QR)</span>
              <span style={{ color: '#4ade80' }}>Rs. {(daySummary.qrFromSales || 0).toLocaleString()}</span>
            </div>
            <div style={styles.breakdownRow}>
              <span>+ Credit Collected (QR)</span>
              <span style={{ color: '#4ade80' }}>Rs. {(daySummary.qrFromCredit || 0).toLocaleString()}</span>
            </div>
            <div style={styles.breakdownRow}>
              <span>- Inventory (QR)</span>
              <span style={{ color: '#f87171' }}>Rs. {(daySummary.inventoryQR || 0).toLocaleString()}</span>
            </div>
          </div>

          {daySummary.creditGiven > 0 && (
            <div style={styles.creditNote}>
              ⚠️ Credit given today: Rs. {daySummary.creditGiven.toLocaleString()}
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.buttonRow}>
            <button onClick={() => setShowEndConfirm(false)} style={styles.cancelButton}>Cancel</button>
            <button onClick={handleConfirmEnd} style={styles.endButtonSmall}>Confirm End Day</button>
          </div>
        </div>
      </div>
    )
  }

  // Cash Input Screen (Start Day)
  if (showCashInput) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2>🟢 Start Day</h2>
          <p style={styles.subtitle}>Count and enter cash in register</p>
          <div style={styles.inputGroup}>
            <label>Starting Cash (Rs.)</label>
            <input
              type="number"
              value={startingCash}
              onChange={(e) => { setStartingCash(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 5000"
              style={styles.cashInput}
              autoFocus
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <div style={styles.buttonRow}>
            <button onClick={() => setShowCashInput(false)} style={styles.cancelButton}>Cancel</button>
            <button onClick={handleCashInputNext} style={styles.confirmButton}>Next</button>
          </div>
        </div>
      </div>
    )
  }

  // PIN Entry Screen
  if (showPinEntry) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2>{action === 'start' ? '🟢 Start Day' : '🔴 End Day'}</h2>
          <p style={styles.subtitle}>Enter your PIN to confirm</p>
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4)); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="Enter PIN"
            style={styles.pinInput}
            autoFocus
            maxLength={4}
            disabled={processing}
          />
          {error && <p style={styles.error}>{error}</p>}
          <div style={styles.buttonRow}>
            <button 
              onClick={() => { setShowPinEntry(false); setShowEndConfirm(false) }} 
              style={styles.cancelButton}
              disabled={processing}
            >
              Cancel
            </button>
            <button 
              onClick={handlePinSubmit} 
              style={styles.confirmButton}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main Day Management Screen
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>Day Management</h2>

        {error && <p style={styles.error}>{error}</p>}

        {isActive ? (
          <div style={styles.section}>
            <div style={styles.statusActive}>🟢 Shop is OPEN</div>
            <div style={styles.info}>Opened: {formatDateTime(dayStatus.currentDay.startedAt)}</div>
            <div style={styles.info}>By: {dayStatus.currentDay.startedBy?.userName || 'Unknown'}</div>
            {dayStatus.currentDay.startingCash !== undefined && (
              <div style={styles.info}>Starting Cash: Rs. {dayStatus.currentDay.startingCash.toLocaleString()}</div>
            )}

            {!canEndDay && (
              <div style={styles.blockersSection}>
                <h4 style={styles.blockersTitle}>⚠️ Cannot close yet:</h4>
                {hasOpenTabs && (
                  <div style={styles.blockerItem}>
                    <span style={styles.blockerIcon}>🍽️</span>
                    <span>Open tabs: {openTablesList.join(', ')}</span>
                  </div>
                )}
                {hasActiveWorkers && (
                  <div style={styles.blockerItem}>
                    <span style={styles.blockerIcon}>👷</span>
                    <span>Clocked in: {activeWorkers.map(w => w.userName).join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleEndClick}
              style={{ ...styles.endButton, opacity: canEndDay ? 1 : 0.5, cursor: canEndDay ? 'pointer' : 'not-allowed' }}
              disabled={!canEndDay}
            >
              End Day & Close Shop
            </button>
            {!canEndDay && <p style={styles.helperText}>Settle all tables and clock out all staff first</p>}
          </div>
        ) : (
          <div style={styles.section}>
            <div style={styles.statusInactive}>🔴 Shop is CLOSED</div>
            {dayStatus?.history?.length > 0 && (
              <div style={styles.lastDayInfo}>
                <p style={styles.lastDayTitle}>Last Session:</p>
                <p style={styles.lastDayDetail}>
                  {formatDateTime(dayStatus.history[dayStatus.history.length - 1]?.startedAt)} - 
                  {formatDateTime(dayStatus.history[dayStatus.history.length - 1]?.endedAt)}
                </p>
              </div>
            )}
            <button onClick={handleStartClick} style={styles.startButton}>Start Day & Open Shop</button>
          </div>
        )}

        <button onClick={onClose} style={styles.closeButton}>Close</button>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#2a2a2a', padding: '30px', borderRadius: '12px', minWidth: '350px', maxWidth: '450px', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto' },
  subtitle: { color: '#888', marginBottom: '20px' },
  section: { margin: '25px 0' },
  statusActive: { fontSize: '20px', color: '#4ade80', marginBottom: '15px' },
  statusInactive: { fontSize: '20px', color: '#f87171', marginBottom: '15px' },
  info: { color: '#888', marginBottom: '5px' },
  lastDayInfo: { background: '#333', padding: '15px', borderRadius: '8px', marginBottom: '20px' },
  lastDayTitle: { color: '#888', fontSize: '12px', marginBottom: '5px' },
  lastDayDetail: { color: '#aaa', fontSize: '14px' },
  blockersSection: { background: '#3d2a2a', border: '1px solid #5a3d3d', borderRadius: '8px', padding: '15px', marginTop: '20px', marginBottom: '15px', textAlign: 'left' },
  blockersTitle: { color: '#f87171', marginBottom: '10px', fontSize: '14px' },
  blockerItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', color: '#fca5a5', fontSize: '14px' },
  blockerIcon: { fontSize: '16px' },
  helperText: { color: '#888', fontSize: '12px', marginTop: '10px' },
  inputGroup: { marginBottom: '15px', textAlign: 'left' },
  cashInput: { width: '100%', padding: '15px', fontSize: '18px', border: '1px solid #555', borderRadius: '8px', background: '#333', color: '#fff', marginTop: '8px', boxSizing: 'border-box' },
  pinInput: { width: '100%', padding: '15px', fontSize: '24px', textAlign: 'center', letterSpacing: '10px', border: '1px solid #555', borderRadius: '8px', background: '#333', color: '#fff', marginBottom: '15px', boxSizing: 'border-box' },
  error: { color: '#f87171', marginBottom: '15px', fontSize: '14px' },
  buttonRow: { display: 'flex', gap: '10px' },
  cancelButton: { flex: 1, background: '#444', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  confirmButton: { flex: 1, background: '#2d5a2d', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  startButton: { background: '#2d5a2d', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' },
  endButton: { background: '#5a2d2d', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginTop: '15px', width: '100%' },
  endButtonSmall: { flex: 1, background: '#5a2d2d', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  closeButton: { background: '#444', color: '#fff', border: 'none', padding: '10px 30px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' },
  summaryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' },
  summaryBox: { background: '#333', padding: '15px', borderRadius: '8px', textAlign: 'center' },
  summaryLabel: { display: 'block', color: '#888', fontSize: '12px', marginBottom: '5px' },
  summaryValue: { fontSize: '18px', fontWeight: 'bold' },
  emailNote: { color: '#888', fontSize: '13px', marginBottom: '15px' },
  expectedSection: { background: '#1e3d1e', borderRadius: '8px', padding: '15px', marginBottom: '15px' },
  expectedRow: { display: 'flex', gap: '15px' },
  expectedItem: { flex: 1, textAlign: 'center' },
  expectedLabel: { display: 'block', color: '#888', fontSize: '12px', marginBottom: '5px' },
  expectedValue: { fontSize: '22px', fontWeight: 'bold', color: '#4ade80' },
  breakdownSection: { background: '#333', borderRadius: '8px', padding: '12px 15px', marginBottom: '10px', textAlign: 'left' },
  breakdownTitle: { color: '#888', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' },
  breakdownRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' },
  creditNote: { background: '#5a4a2d', border: '1px solid #8b7355', borderRadius: '8px', padding: '10px', marginBottom: '15px', color: '#fbbf24', fontSize: '13px' },
}

export default DayManagement