import { useState, useEffect } from 'react'
import { api } from '../utils/api'

function AdminUsersView({ user }) {
  const [users, setUsers] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [wagePayments, setWagePayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'staff', hourlyRate: 100 })
  const [editingUser, setEditingUser] = useState(null)
  const [payingUser, setPayingUser] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [paymentMessage, setPaymentMessage] = useState('')
  
  // Change PIN modal state (for admin to change their own PIN)
    const [showChangePinModal, setShowChangePinModal] = useState(false)
    const [currentPin, setCurrentPin] = useState('')
    const [newPin, setNewPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [changePinError, setChangePinError] = useState('')
    const [changePinSuccess, setChangePinSuccess] = useState('')
    const [changingPin, setChangingPin] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [u, t, w] = await Promise.all([api.getUsers(), api.getTimesheets(), api.getWages()])
    setUsers(u); setTimesheets(t); setWagePayments(w.payments || []); setLoading(false)
  }

  const calcWages = (uid) => {
    const u = users.find(x => x.id === uid)
    const rate = u?.hourlyRate || 100
    const hrs = timesheets.filter(t => t.userId === uid && t.hoursWorked).reduce((s, t) => s + t.hoursWorked, 0)
    const earned = Math.round(hrs * rate)
    const paid = wagePayments.filter(p => p.userId === uid).reduce((s, p) => s + p.amount, 0)
    return { totalHours: Math.round(hrs * 100) / 100, totalEarned: earned, totalPaid: paid, pending: earned - paid, rate }
  }

  const handleAddUser = async () => {
    if (!newUser.name || newUser.pin.length !== 4) { alert('Enter name and 4-digit PIN'); return }
    await api.addUser(newUser)
    setNewUser({ name: '', pin: '', role: 'staff', hourlyRate: 100 }); setShowAddUser(false); loadData()
  }

  const handleUpdateUser = async () => {
    if (!editingUser.name) return
    await api.updateUser(editingUser.id, editingUser); setEditingUser(null); loadData()
  }

  const handleDeleteUser = async (id) => {
    if (window.confirm('Delete this user?')) { await api.deleteUser(id); loadData() }
  }

  const handlePayWages = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) { setPaymentMessage('Enter valid amount'); return }
    const r = await api.payWages(payingUser.id, payingUser.name, parseFloat(payAmount), user.name)
    if (r.success) {
      setPaymentMessage('Payment recorded!')
      setTimeout(() => { setPayingUser(null); setPayAmount(''); setPaymentMessage(''); loadData() }, 1000)
    } else setPaymentMessage('Failed')
  }

  const handleChangePin = async () => {
    setChangePinError('')
    setChangePinSuccess('')
    
    if (currentPin.length !== 4) {
      setChangePinError('Enter current 4-digit PIN')
      return
    }
    if (newPin.length !== 4) {
      setChangePinError('New PIN must be 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setChangePinError('New PINs do not match')
      return
    }
    if (currentPin === newPin) {
      setChangePinError('New PIN must be different')
      return
    }

    setChangingPin(true)
    const result = await api.changePin(user.id, currentPin, newPin)
    setChangingPin(false)

    if (result.success) {
      setChangePinSuccess('PIN changed successfully!')
      setTimeout(() => {
        setShowChangePinModal(false)
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
        setChangePinSuccess('')
      }, 1500)
    } else {
      setChangePinError(result.message || 'Failed to change PIN')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  const totPending = users.reduce((s, u) => s + Math.max(0, calcWages(u.id).pending), 0)

  return (
    <div>
        {/* Admin's own PIN change button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 15 }}>
        <button onClick={() => setShowChangePinModal(true)} style={{ background: '#1e3a5f', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>🔑 Change My PIN</button>
      </div>
      {totPending > 0 && (
        <div style={S.wageCard}>
          <span>💰 Total Pending Wages</span>
          <span style={S.wageAmt}>Rs. {totPending.toLocaleString()}</span>
        </div>
      )}

      <div style={S.card}>
        <div style={S.cardHdr}>
          <h3>User Management</h3>
          <button onClick={() => setShowAddUser(true)} style={S.addBtn}>+ Add User</button>
        </div>

        {users.map(u => {
          const w = calcWages(u.id)
          return (
            <div key={u.id} style={S.userCard}>
              {editingUser?.id === u.id ? (
                <div style={S.editForm}>
                  <input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} style={S.editInput} placeholder="Name" />
                  <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} style={S.editSel}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div style={S.rateInput}>
                    <span style={S.rateLabel}>Rs.</span>
                    <input 
                      type="number" 
                      value={editingUser.hourlyRate || ''} 
                      onChange={e => setEditingUser({ ...editingUser, hourlyRate: parseInt(e.target.value) || 0 })} 
                      style={S.editInputSmall} 
                      placeholder="Rate"
                    />
                    <span style={S.rateLabel}>/hr</span>
                  </div>
                  <button onClick={handleUpdateUser} style={S.saveBtn}>Save</button>
                  <button onClick={() => setEditingUser(null)} style={S.cnclBtn}>Cancel</button>
                </div>
              ) : (
                <>
                  <div style={S.userRow}>
                    <div style={S.userInfo}>
                      <span style={S.userName}>{u.name}</span>
                      <span style={S.userRole}>{u.role}</span>
                      <span style={S.userRate}>Rs.{u.hourlyRate || 100}/hr</span>
                    </div>
                    <div>
                      <button onClick={() => setEditingUser({ ...u, hourlyRate: u.hourlyRate || 100 })} style={S.editBtn}>Edit</button>
                      <button onClick={() => handleDeleteUser(u.id)} style={S.delBtn}>Delete</button>
                    </div>
                  </div>
                  <div style={S.wageRow}>
                    <div style={S.wageStats}>
                      <span><span style={S.lbl}>Hours:</span> {w.totalHours}h</span>
                      <span><span style={S.lbl}>Earned:</span> Rs.{w.totalEarned.toLocaleString()}</span>
                      <span><span style={S.lbl}>Paid:</span> Rs.{w.totalPaid.toLocaleString()}</span>
                    </div>
                    {w.pending > 0 ? (
                      <div style={S.pendSec}>
                        <span style={S.pendAmt}>Pending: Rs.{w.pending.toLocaleString()}</span>
                        <button onClick={() => { setPayingUser(u); setPayAmount(String(w.pending)) }} style={S.payBtn}>Pay</button>
                      </div>
                    ) : <span style={S.cleared}>✔ Cleared</span>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3>Add New User</h3>
            <div style={S.inpGrp}>
              <label>Name</label>
              <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} style={S.input} />
            </div>
            <div style={S.inpGrp}>
              <label>4-Digit PIN</label>
              <input type="password" value={newUser.pin} onChange={e => setNewUser({ ...newUser, pin: e.target.value.slice(0, 4) })} style={S.input} maxLength={4} />
            </div>
            <div style={S.inpGrp}>
              <label>Hourly Rate (Rs.)</label>
              <input 
                type="number" 
                value={newUser.hourlyRate} 
                onChange={e => setNewUser({ ...newUser, hourlyRate: parseInt(e.target.value) || 0 })} 
                style={S.input} 
                placeholder="100"
              />
            </div>
            <div style={S.inpGrp}>
              <label>Role</label>
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={S.select}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={S.modBtns}>
              <button onClick={() => setShowAddUser(false)} style={S.modCncl}>Cancel</button>
              <button onClick={handleAddUser} style={S.modConf}>Add User</button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Wages Modal */}
      {payingUser && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3>Pay Wages to {payingUser.name}</h3>
            <p style={{ color: '#aaa' }}>Pending: Rs.{calcWages(payingUser.id).pending.toLocaleString()}</p>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount" style={S.input} />
            {paymentMessage && <p style={{ color: paymentMessage.includes('recorded') ? '#51cf66' : '#ff6b6b', marginTop: 10 }}>{paymentMessage}</p>}
            <div style={S.btnRow}>
              <button onClick={() => { setPayingUser(null); setPayAmount(''); setPaymentMessage('') }} style={S.cancelBtn}>Cancel</button>
              <button onClick={handlePayWages} style={S.saveBtn}>Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Change PIN Modal (Admin's own PIN) */}
      {showChangePinModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3>🔑 Change My PIN</h3>
            <div style={S.inpGrp}>
              <label>Current PIN</label>
              <input
                type="password"
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={S.input}
                placeholder="••••"
                maxLength={4}
                autoFocus
              />
            </div>
            <div style={S.inpGrp}>
              <label>New PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={S.input}
                placeholder="••••"
                maxLength={4}
              />
            </div>
            <div style={S.inpGrp}>
              <label>Confirm New PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={S.input}
                placeholder="••••"
                maxLength={4}
              />
            </div>
            {changePinError && <p style={{ color: '#ff6b6b', marginTop: 10 }}>{changePinError}</p>}
            {changePinSuccess && <p style={{ color: '#51cf66', marginTop: 10 }}>{changePinSuccess}</p>}
            <div style={S.btnRow}>
              <button onClick={() => { setShowChangePinModal(false); setCurrentPin(''); setNewPin(''); setConfirmPin(''); setChangePinError(''); setChangePinSuccess('') }} style={S.cancelBtn}>Cancel</button>
              <button onClick={handleChangePin} disabled={changingPin} style={S.saveBtn}>
                {changingPin ? 'Changing...' : 'Change PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  wageCard: { background: 'linear-gradient(135deg, #2d5a2d, #1a3a1a)', padding: 20, borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  wageAmt: { fontSize: 24, fontWeight: 'bold', color: '#4ade80' },
  card: { background: '#1e1e1e', borderRadius: 12, padding: 20 },
  cardHdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addBtn: { background: '#2d5a2d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' },
  userCard: { background: '#2a2a2a', borderRadius: 8, padding: 15, marginBottom: 12 },
  userRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  userName: { fontWeight: 'bold' },
  userRole: { background: '#444', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#888' },
  userRate: { background: '#2d4a2d', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#4ade80' },
  editBtn: { background: '#444', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', marginRight: 8, fontSize: 12 },
  delBtn: { background: '#5a2d2d', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  editForm: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  editInput: { flex: 1, minWidth: 120, padding: 8, border: '1px solid #555', borderRadius: 4, background: '#2a2a2a', color: '#fff' },
  editInputSmall: { width: 60, padding: 8, border: '1px solid #555', borderRadius: 4, background: '#2a2a2a', color: '#fff', textAlign: 'center' },
  editSel: { padding: 8, border: '1px solid #555', borderRadius: 4, background: '#2a2a2a', color: '#fff' },
  rateInput: { display: 'flex', alignItems: 'center', gap: 4 },
  rateLabel: { color: '#888', fontSize: 12 },
  saveBtn: { background: '#2d5a2d', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 4, cursor: 'pointer' },
  cnclBtn: { background: '#444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 4, cursor: 'pointer' },
  wageRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #444', flexWrap: 'wrap', gap: 10 },
  wageStats: { display: 'flex', gap: 15, fontSize: 13, color: '#aaa' },
  lbl: { color: '#666' },
  pendSec: { display: 'flex', alignItems: 'center', gap: 10 },
  pendAmt: { color: '#f87171', fontWeight: 'bold' },
  payBtn: { background: '#2d5a2d', color: '#fff', border: 'none', padding: '6px 15px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' },
  cleared: { color: '#4ade80', fontSize: 13 },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#2a2a2a', padding: 25, borderRadius: 12, minWidth: 320 },
  inpGrp: { marginBottom: 15 },
  input: { width: '100%', padding: 12, marginTop: 5, border: '1px solid #555', borderRadius: 6, background: '#333', color: '#fff', fontSize: 16, boxSizing: 'border-box' },
  select: { width: '100%', padding: 12, marginTop: 5, border: '1px solid #555', borderRadius: 6, background: '#333', color: '#fff', fontSize: 16, boxSizing: 'border-box' },
  modBtns: { display: 'flex', gap: 10, marginTop: 20 },
  modCncl: { flex: 1, padding: 12, background: '#444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  modConf: { flex: 1, padding: 12, background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' },
  payName: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  payRate: { fontSize: 14, color: '#4ade80', textAlign: 'center', marginBottom: 15 },
  payDets: { background: '#333', borderRadius: 8, padding: 15, marginBottom: 15 },
  payRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0' },
  payMsg: { textAlign: 'center', color: '#4ade80', marginBottom: 10 },
}

export default AdminUsersView