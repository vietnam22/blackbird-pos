import { useState, useEffect } from 'react'
import { api } from '../utils/api'

function StaffView({ user, onBack }) {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState(null)
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  const [showPinModal, setShowPinModal] = useState(false)
  const [pinAction, setPinAction] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [changePinError, setChangePinError] = useState('')
  const [changePinSuccess, setChangePinSuccess] = useState('')
  const [changingPin, setChangingPin] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    const active = await api.getActiveTimesheets()
    const myActive = active.find(e => e.userId === user.id)
    if (myActive) {
      setIsClockedIn(true)
      setClockInTime(myActive.clockIn)
    }
    const all = await api.getTimesheets()
    const myTimesheets = all.filter(e => e.userId === user.id && e.clockOut)
    setTimesheets(myTimesheets.slice(-10).reverse())
    setLoading(false)
  }

  const handleClockAction = (action) => {
    setPinAction(action)
    setShowPinModal(true)
    setPin('')
    setPinError('')
  }

  const handlePinSubmit = async () => {
    if (pin.length !== 4) { setPinError('Enter 4-digit PIN'); return }
    setSubmitting(true)
    const result = await api.login(pin)
    if (!result.success) { setPinError('Invalid PIN'); setPin(''); setSubmitting(false); return }
    if (result.user.id !== user.id) { setPinError('PIN does not match your account'); setPin(''); setSubmitting(false); return }

    if (pinAction === 'clockin') {
      const clockResult = await api.clockIn(user.id, user.name)
      if (clockResult.success) { setIsClockedIn(true); setClockInTime(clockResult.entry.clockIn) }
    } else {
      const clockResult = await api.clockOut(user.id)
      if (clockResult.success) { setIsClockedIn(false); setClockInTime(null); loadData() }
    }
    setShowPinModal(false); setPin(''); setSubmitting(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handlePinSubmit()
    if (e.key === 'Escape') { setShowPinModal(false); setPin('') }
  }

  const handleChangePin = async () => {
    setChangePinError(''); setChangePinSuccess('')
    if (currentPin.length !== 4) { setChangePinError('Enter current 4-digit PIN'); return }
    if (newPin.length !== 4) { setChangePinError('New PIN must be 4 digits'); return }
    if (newPin !== confirmPin) { setChangePinError('New PINs do not match'); return }
    if (currentPin === newPin) { setChangePinError('New PIN must be different'); return }

    setChangingPin(true)
    const result = await api.changePin(user.id, currentPin, newPin)
    setChangingPin(false)
    if (result.success) {
      setChangePinSuccess('PIN changed successfully!')
      setTimeout(() => { setShowChangePinModal(false); setCurrentPin(''); setNewPin(''); setConfirmPin(''); setChangePinSuccess('') }, 1500)
    } else {
      setChangePinError(result.message || 'Failed to change PIN')
    }
  }

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (ts) => new Date(ts).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })
  const getElapsedTime = () => {
    if (!clockInTime) return '0h 0m'
    const elapsed = Date.now() - new Date(clockInTime).getTime()
    return `${Math.floor(elapsed / 3600000)}h ${Math.floor((elapsed % 3600000) / 60000)}m`
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h1 style={styles.title}>⏱️ Clock</h1>
        <button onClick={() => setShowChangePinModal(true)} style={styles.changePinButton}>🔒 PIN</button>
      </header>

      <div style={styles.greeting}>👤 {user.name}</div>

      <div style={styles.content}>
        <div style={styles.card}>
          <h3>Time Clock</h3>
          {isClockedIn ? (
            <div style={styles.clockedInSection}>
              <div style={styles.statusActive}>🟢 Clocked In</div>
              <div style={styles.clockInTime}>Since {formatTime(clockInTime)}</div>
              <div style={styles.elapsed}>{getElapsedTime()}</div>
              <button onClick={() => handleClockAction('clockout')} style={styles.clockOutButton}>Clock Out</button>
            </div>
          ) : (
            <div style={styles.clockedOutSection}>
              <div style={styles.statusInactive}>⚪ Not Clocked In</div>
              <button onClick={() => handleClockAction('clockin')} style={styles.clockInButton}>Clock In</button>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3>Recent Shifts</h3>
          {timesheets.length === 0 ? (
            <p style={styles.emptyText}>No shifts recorded yet</p>
          ) : (
            <div style={styles.shiftList}>
              {timesheets.map(entry => (
                <div key={entry.id} style={styles.shiftRow}>
                  <div style={styles.shiftDate}>{formatDate(entry.clockIn)}</div>
                  <div style={styles.shiftTimes}>{formatTime(entry.clockIn)} - {formatTime(entry.clockOut)}</div>
                  <div style={styles.shiftHours}>{entry.hoursWorked?.toFixed(1)}h</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPinModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>{pinAction === 'clockin' ? '🟢 Clock In' : '🔴 Clock Out'}</h3>
            <p style={styles.modalSubtitle}>Enter your PIN to confirm</p>
            <input
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
              onKeyDown={handleKeyDown}
              placeholder="••••"
              style={styles.pinInput}
              autoFocus
              maxLength={4}
            />
            {pinError && <p style={styles.error}>{pinError}</p>}
            <div style={styles.modalButtons}>
              <button onClick={() => setShowPinModal(false)} style={styles.cancelButton} disabled={submitting}>Cancel</button>
              <button onClick={handlePinSubmit} style={styles.confirmButton} disabled={submitting}>
                {submitting ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangePinModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>🔒 Change PIN</h3>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Current PIN</label>
              <input type="password" value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={styles.pinInput} placeholder="••••" maxLength={4} autoFocus />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>New PIN</label>
              <input type="password" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={styles.pinInput} placeholder="••••" maxLength={4} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Confirm New PIN</label>
              <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={styles.pinInput} placeholder="••••" maxLength={4} />
            </div>
            {changePinError && <p style={styles.error}>{changePinError}</p>}
            {changePinSuccess && <p style={styles.success}>{changePinSuccess}</p>}
            <div style={styles.modalButtons}>
              <button onClick={() => { setShowChangePinModal(false); setCurrentPin(''); setNewPin(''); setConfirmPin(''); setChangePinError(''); setChangePinSuccess('') }} style={styles.cancelButton}>Cancel</button>
              <button onClick={handleChangePin} disabled={changingPin} style={styles.confirmButton}>{changingPin ? 'Changing...' : 'Change PIN'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '20px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
  backButton: { background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  title: { margin: 0, fontSize: '24px' },
  changePinButton: { background: '#1e3a5f', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  greeting: { textAlign: 'center', fontSize: '16px', color: '#888', marginBottom: '20px' },
  content: { maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { background: '#2a2a2a', borderRadius: '12px', padding: '20px' },
  clockedInSection: { textAlign: 'center', padding: '20px 0' },
  clockedOutSection: { textAlign: 'center', padding: '20px 0' },
  statusActive: { fontSize: '18px', marginBottom: '10px', color: '#4ade80' },
  statusInactive: { fontSize: '18px', marginBottom: '20px', color: '#888' },
  clockInTime: { color: '#888', marginBottom: '5px' },
  elapsed: { fontSize: '36px', fontWeight: 'bold', marginBottom: '20px' },
  clockInButton: { background: '#2d5a2d', color: '#fff', border: 'none', padding: '15px 40px', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  clockOutButton: { background: '#5a2d2d', color: '#fff', border: 'none', padding: '15px 40px', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  emptyText: { color: '#666', textAlign: 'center', padding: '20px' },
  shiftList: { marginTop: '15px' },
  shiftRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #333' },
  shiftDate: { color: '#888', minWidth: '70px' },
  shiftTimes: { flex: 1, textAlign: 'center' },
  shiftHours: { fontWeight: 'bold', minWidth: '50px', textAlign: 'right' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#2a2a2a', padding: '30px', borderRadius: '12px', minWidth: '300px', textAlign: 'center' },
  modalSubtitle: { color: '#888', marginBottom: '20px' },
  pinInput: { width: '100%', padding: '15px', fontSize: '24px', textAlign: 'center', letterSpacing: '10px', border: '1px solid #555', borderRadius: '8px', background: '#333', color: '#fff', marginBottom: '15px', boxSizing: 'border-box' },
  error: { color: '#f87171', marginBottom: '15px', fontSize: '14px' },
  success: { color: '#4ade80', marginBottom: '15px', fontSize: '14px' },
  modalButtons: { display: 'flex', gap: '10px' },
  cancelButton: { flex: 1, padding: '12px', background: '#444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  confirmButton: { flex: 1, padding: '12px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  inputGroup: { marginBottom: '15px' },
  inputLabel: { display: 'block', marginBottom: '5px', fontSize: '14px', color: '#aaa', textAlign: 'left' },
}

export default StaffView