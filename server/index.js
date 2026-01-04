import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

const DATA_DIR = path.join(__dirname, 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR)

const BILLS_FILE = path.join(DATA_DIR, 'bills.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const TIMESHEETS_FILE = path.join(DATA_DIR, 'timesheets.json')
const WAGES_FILE = path.join(DATA_DIR, 'wages.json')
const DAYS_FILE = path.join(DATA_DIR, 'days.json')
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json')
const CREDITORS_FILE = path.join(DATA_DIR, 'creditors.json')
const CREDIT_LOGS_FILE = path.join(DATA_DIR, 'credit_logs.json')
const EMAIL_RECIPIENTS_FILE = path.join(DATA_DIR, 'email_recipients.json')

const readJSON = (file, def) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } 
  catch { return def }
}
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))

// ============ BILLS / TABS ENDPOINTS ============

app.post('/api/tabs/:table/transfer', (req, res) => {
  const { table } = req.params
  const { targetTable } = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  
  if (!data.openTabs[table] || !data.openTabs[table].items?.length) {
    return res.status(400).json({ success: false, error: 'Source table is empty' })
  }
  
  if (data.openTabs[targetTable] && data.openTabs[targetTable].items?.length > 0) {
    return res.status(400).json({ success: false, error: 'Target table is not vacant' })
  }
  
  data.openTabs[targetTable] = { ...data.openTabs[table] }
  delete data.openTabs[table]
  
  writeJSON(BILLS_FILE, data)
  res.json({ success: true, tab: data.openTabs[targetTable] })
})

app.get('/api/data', (req, res) => {
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  res.json(data)
})

app.post('/api/data', (req, res) => {
  writeJSON(BILLS_FILE, req.body)
  res.json({ success: true })
})

app.post('/api/bills', (req, res) => {
  const bill = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  data.completedBills.push(bill)
  writeJSON(BILLS_FILE, data)
  
  // Log credit if applicable
  if (bill.paymentMode === 'credit' || bill.paymentMode === 'partial') {
    const logsData = readJSON(CREDIT_LOGS_FILE, { logs: [] })
    const creditAmount = bill.partialPayment ? bill.partialPayment.creditAmount : bill.total
    logsData.logs.push({
      id: Date.now(),
      type: 'credit_given',
      timestamp: new Date().toISOString(),
      billId: bill.id,
      table: bill.table,
      creditName: bill.creditName,
      creditorId: bill.creditorId || null,
      amount: creditAmount,
      totalBillAmount: bill.total,
      createdBy: bill.createdBy,
      customerName: bill.customerName,
      paymentMode: bill.paymentMode,
      partialPayment: bill.partialPayment || null
    })
    writeJSON(CREDIT_LOGS_FILE, logsData)
  }
  
  res.json({ success: true })
})

app.patch('/api/bills/:id', (req, res) => {
  const { id } = req.params
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  data.completedBills = data.completedBills.map(b => b.id === id ? { ...b, ...req.body } : b)
  writeJSON(BILLS_FILE, data)
  res.json({ success: true })
})

app.post('/api/tabs/:table', (req, res) => {
  const { table } = req.params
  const { customerName } = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  if (!data.openTabs[table]) {
    data.openTabs[table] = { items: [], customerName: customerName || '' }
    writeJSON(BILLS_FILE, data)
  }
  res.json({ success: true, tab: data.openTabs[table] })
})

app.post('/api/tabs/:table/add', (req, res) => {
  const { table } = req.params
  const { item, user, customerName } = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  if (!data.openTabs[table]) {
    data.openTabs[table] = { items: [], customerName: customerName || '' }
  }
  data.openTabs[table].items.push({ ...item, addedBy: user, addedAt: new Date().toISOString() })
  writeJSON(BILLS_FILE, data)
  res.json({ success: true, tab: data.openTabs[table] })
})

app.post('/api/tabs/:table/remove', (req, res) => {
  const { table } = req.params
  const { index } = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  if (data.openTabs[table]) {
    data.openTabs[table].items.splice(index, 1)
    writeJSON(BILLS_FILE, data)
  }
  res.json({ success: true, tab: data.openTabs[table] })
})

app.patch('/api/tabs/:table/customer', (req, res) => {
  const { table } = req.params
  const { customerName } = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  if (data.openTabs[table]) {
    data.openTabs[table].customerName = customerName
    writeJSON(BILLS_FILE, data)
  }
  res.json({ success: true })
})

app.post('/api/tabs/:table/complete', (req, res) => {
  const { table } = req.params
  const { paymentMode, user, creditName, cashAmount, qrAmount } = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  const tab = data.openTabs[table]
  if (!tab) return res.status(404).json({ success: false })
  
  const total = tab.items.reduce((s, i) => s + (i.price * (i.qty || 1)), 0)
  const bill = {
    id: Date.now(),
    table,
    items: tab.items,
    total,
    paymentMode,
    cashAmount: cashAmount || (paymentMode === 'cash' ? total : 0),
    qrAmount: qrAmount || (paymentMode === 'qr' ? total : 0),
    creditName: creditName || null,
    creditPaid: paymentMode !== 'credit',
    creditCleared: paymentMode !== 'credit',
    clearRequested: false,
    clearRequestedBy: null,
    customerName: tab.customerName,
    completedBy: user,
    timestamp: new Date().toISOString(),
    completedAt: new Date().toISOString()
  }
  data.completedBills.push(bill)
  delete data.openTabs[table]
  writeJSON(BILLS_FILE, data)
  res.json({ success: true, bill })
})

app.post('/api/tabs/:table/cancel', (req, res) => {
  const { table } = req.params
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  delete data.openTabs[table]
  writeJSON(BILLS_FILE, data)
  res.json({ success: true })
})

app.post('/api/bills/:id/request-clear', (req, res) => {
  const { id } = req.params
  const { requestedBy } = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  
  let targetBill = null
  data.completedBills = data.completedBills.map(b => {
    if (b.id === parseInt(id) || b.id === id) {
      targetBill = b
      return { ...b, clearRequested: true, clearRequestedBy: requestedBy }
    }
    return b
  })
  writeJSON(BILLS_FILE, data)
  
  // Log the request
  if (targetBill) {
    const logsData = readJSON(CREDIT_LOGS_FILE, { logs: [] })
    logsData.logs.push({
      id: Date.now(),
      type: 'clear_requested',
      timestamp: new Date().toISOString(),
      billId: targetBill.id,
      creditName: targetBill.creditName,
      creditorId: targetBill.creditorId,
      amount: targetBill.partialPayment ? targetBill.partialPayment.creditAmount : targetBill.total,
      requestedBy
    })
    writeJSON(CREDIT_LOGS_FILE, logsData)
  }
  
  res.json({ success: true })
})

app.post('/api/bills/:id/approve-clear', (req, res) => {
  const { id } = req.params
  const { approvedBy } = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  
  let targetBill = null
  data.completedBills = data.completedBills.map(b => {
    if (b.id === parseInt(id) || b.id === id) {
      targetBill = b
      return { 
        ...b, 
        creditPaid: true,
        creditCleared: true, 
        clearRequested: false, 
        clearedBy: approvedBy, 
        clearedAt: new Date().toISOString() 
      }
    }
    return b
  })
  writeJSON(BILLS_FILE, data)
  
  // Log the approval
  if (targetBill) {
    const logsData = readJSON(CREDIT_LOGS_FILE, { logs: [] })
    logsData.logs.push({
      id: Date.now(),
      type: 'credit_cleared',
      timestamp: new Date().toISOString(),
      billId: targetBill.id,
      creditName: targetBill.creditName,
      creditorId: targetBill.creditorId,
      amount: targetBill.partialPayment ? targetBill.partialPayment.creditAmount : targetBill.total,
      approvedBy
    })
    writeJSON(CREDIT_LOGS_FILE, logsData)
  }
  
  res.json({ success: true })
})

app.post('/api/bills/:id/reject-clear', (req, res) => {
  const { id } = req.params
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  data.completedBills = data.completedBills.map(b => {
    if (b.id === parseInt(id) || b.id === id) {
      return { ...b, clearRequested: false, clearRequestedBy: null }
    }
    return b
  })
  writeJSON(BILLS_FILE, data)
  res.json({ success: true })
})

// ============ CREDIT PAYMENT ENDPOINT ============

app.post('/api/bills/:id/credit-payment', (req, res) => {
  const { id } = req.params
  const { amount, method, recordedBy } = req.body
  const data = readJSON(BILLS_FILE, { completedBills: [], openTabs: {} })
  
  let targetBill = null
  data.completedBills = data.completedBills.map(b => {
    if (b.id === parseInt(id) || b.id === id) {
      targetBill = b
      const payments = b.creditPayments || []
      payments.push({
        amount,
        method,
        recordedBy,
        paidAt: new Date().toISOString()
      })
      return { ...b, creditPayments: payments }
    }
    return b
  })
  
  writeJSON(BILLS_FILE, data)
  
  // Log the payment
  if (targetBill) {
    const logsData = readJSON(CREDIT_LOGS_FILE, { logs: [] })
    logsData.logs.push({
      id: Date.now(),
      type: 'payment_received',
      timestamp: new Date().toISOString(),
      billId: targetBill.id,
      table: targetBill.table,
      creditName: targetBill.creditName,
      creditorId: targetBill.creditorId,
      amount,
      method,
      recordedBy
    })
    writeJSON(CREDIT_LOGS_FILE, logsData)
  }
  
  res.json({ success: true })
})

// ============ USER ENDPOINTS ============

app.get('/api/users', (req, res) => {
  const data = readJSON(USERS_FILE, { users: [] })
  res.json(data.users)
})

app.post('/api/users', (req, res) => {
  const data = readJSON(USERS_FILE, { users: [] })
  const user = { id: Date.now(), ...req.body }
  data.users.push(user)
  writeJSON(USERS_FILE, data)
  res.json(user)
})

app.patch('/api/users/:id', (req, res) => {
  const { id } = req.params
  const data = readJSON(USERS_FILE, { users: [] })
  data.users = data.users.map(u => u.id === parseInt(id) ? { ...u, ...req.body } : u)
  writeJSON(USERS_FILE, data)
  res.json({ success: true })
})

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params
  const data = readJSON(USERS_FILE, { users: [] })
  data.users = data.users.filter(u => u.id !== parseInt(id))
  writeJSON(USERS_FILE, data)
  res.json({ success: true })
})

app.post('/api/login', (req, res) => {
  const { pin } = req.body
  const data = readJSON(USERS_FILE, { users: [] })
  const user = data.users.find(u => u.pin === pin)
  if (user) {
    res.json({ success: true, user: { id: user.id, name: user.name, role: user.role } })
  } else {
    res.json({ success: false })
  }
})

app.post('/api/users/:id/change-pin', (req, res) => {
  const { id } = req.params
  const { currentPin, newPin } = req.body
  const data = readJSON(USERS_FILE, { users: [] })
  const user = data.users.find(u => u.id === parseInt(id))
  if (!user) {
    return res.json({ success: false, message: 'User not found' })
  }
  if (user.pin !== currentPin) {
    return res.json({ success: false, message: 'Current PIN is incorrect' })
  }
  if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    return res.json({ success: false, message: 'New PIN must be 4 digits' })
  }
  const pinExists = data.users.some(u => u.id !== parseInt(id) && u.pin === newPin)
  if (pinExists) {
    return res.json({ success: false, message: 'This PIN is already in use' })
  }
  user.pin = newPin
  writeJSON(USERS_FILE, data)
  res.json({ success: true, message: 'PIN changed successfully' })
})

// ============ TIMESHEETS ENDPOINTS ============

app.get('/api/timesheets', (req, res) => {
  const data = readJSON(TIMESHEETS_FILE, { entries: [] })
  res.json(data.entries)
})

app.get('/api/timesheets/active', (req, res) => {
  const data = readJSON(TIMESHEETS_FILE, { entries: [] })
  const active = data.entries.filter(e => !e.clockOut)
  res.json(active)
})

app.post('/api/timesheets/clockin', (req, res) => {
  const { userId, userName } = req.body
  const data = readJSON(TIMESHEETS_FILE, { entries: [] })
  const existing = data.entries.find(e => e.userId === userId && !e.clockOut)
  if (existing) {
    return res.status(400).json({ success: false, message: 'Already clocked in' })
  }
  const entry = {
    id: Date.now(),
    userId,
    userName,
    clockIn: new Date().toISOString(),
    clockOut: null,
    hoursWorked: null,
  }
  data.entries.push(entry)
  writeJSON(TIMESHEETS_FILE, data)
  res.json({ success: true, entry })
})

app.post('/api/timesheets/clockout', (req, res) => {
  const { userId } = req.body
  const data = readJSON(TIMESHEETS_FILE, { entries: [] })
  const clockOutTime = new Date()
  data.entries = data.entries.map(e => {
    if (e.userId === userId && !e.clockOut) {
      const clockIn = new Date(e.clockIn)
      const hours = (clockOutTime - clockIn) / (1000 * 60 * 60)
      return { ...e, clockOut: clockOutTime.toISOString(), hoursWorked: Math.round(hours * 100) / 100 }
    }
    return e
  })
  writeJSON(TIMESHEETS_FILE, data)
  res.json({ success: true })
})

// ============ WAGES ENDPOINTS ============

app.get('/api/wages', (req, res) => {
  const data = readJSON(WAGES_FILE, { payments: [] })
  res.json(data)
})

app.post('/api/wages/pay', (req, res) => {
  const { userId, userName, amount, paidBy } = req.body
  const data = readJSON(WAGES_FILE, { payments: [] })
  const payment = {
    id: Date.now(),
    userId,
    userName,
    amount,
    paidBy,
    paidAt: new Date().toISOString()
  }
  data.payments.push(payment)
  writeJSON(WAGES_FILE, data)
  res.json({ success: true, payment })
})

// ============ DAY MANAGEMENT ENDPOINTS ============

app.get('/api/days/current', (req, res) => {
  const data = readJSON(DAYS_FILE, { currentDay: null, history: [] })
  res.json(data)
})

app.post('/api/days/start', (req, res) => {
  const { startedBy, openingCash } = req.body
  const data = readJSON(DAYS_FILE, { currentDay: null, history: [] })
  if (data.currentDay) {
    return res.status(400).json({ success: false, message: 'Day already started' })
  }
  data.currentDay = {
    id: Date.now(),
    startedAt: new Date().toISOString(),
    startedBy,
    openingCash: openingCash || 0,
    endedAt: null,
    endedBy: null,
    closingCash: null
  }
  writeJSON(DAYS_FILE, data)
  res.json({ success: true, day: data.currentDay })
})

app.post('/api/days/end', (req, res) => {
  const { endedBy, closingCash } = req.body
  const data = readJSON(DAYS_FILE, { currentDay: null, history: [] })
  if (!data.currentDay) {
    return res.status(400).json({ success: false, message: 'No day to end' })
  }
  const endedDay = {
    ...data.currentDay,
    endedAt: new Date().toISOString(),
    endedBy,
    closingCash: closingCash || 0
  }
  data.history.push(endedDay)
  data.currentDay = null
  writeJSON(DAYS_FILE, data)
  res.json({ success: true, day: endedDay })
})

// ============ INVENTORY ENDPOINTS ============

app.get('/api/inventory', (req, res) => {
  const data = readJSON(INVENTORY_FILE, { entries: [], requests: [] })
  res.json(data)
})

app.post('/api/inventory/entries', (req, res) => {
  const { item, quantity, unit, totalPrice, paidVia, entryUser } = req.body
  const data = readJSON(INVENTORY_FILE, { entries: [], requests: [] })
  const entry = {
    id: Date.now(),
    item,
    quantity,
    unit: unit || null,
    totalPrice,
    paidVia,
    addedBy: entryUser,
    addedAt: new Date().toISOString()
  }
  data.entries.push(entry)
  writeJSON(INVENTORY_FILE, data)
  res.json({ success: true, entry })
})

app.post('/api/inventory/requests', (req, res) => {
  const { item, quantity, unit, notes, requestedBy, recommendedPrice, recommendedMethod } = req.body
  const data = readJSON(INVENTORY_FILE, { entries: [], requests: [] })
  const request = {
    id: Date.now(),
    item,
    quantity,
    unit: unit || null,
    notes: notes || null,
    recommendedPrice: recommendedPrice || null,
    recommendedMethod: recommendedMethod || null,
    requestedBy,
    requestedAt: new Date().toISOString(),
    status: 'pending',
    fulfilledBy: null,
    fulfilledAt: null,
    totalPrice: null,
    paidVia: null
  }
  data.requests.push(request)
  writeJSON(INVENTORY_FILE, data)
  res.json({ success: true, request })
})

app.patch('/api/inventory/requests/:id/fulfill', (req, res) => {
  const { id } = req.params
  const { fulfilledBy, totalPrice, paidVia } = req.body
  const data = readJSON(INVENTORY_FILE, { entries: [], requests: [] })
  
  let fulfilledRequest = null
  data.requests = data.requests.map(r => {
    if (r.id === parseInt(id)) {
      fulfilledRequest = r
      return {
        ...r,
        status: 'fulfilled',
        fulfilledBy,
        fulfilledAt: new Date().toISOString(),
        totalPrice,
        paidVia
      }
    }
    return r
  })
  
  // Also add to entries
  if (fulfilledRequest) {
    data.entries.push({
      id: Date.now(),
      item: fulfilledRequest.item,
      quantity: fulfilledRequest.quantity,
      unit: fulfilledRequest.unit,
      totalPrice,
      paidVia,
      addedBy: fulfilledBy,
      addedAt: new Date().toISOString(),
      fromRequest: fulfilledRequest.id
    })
  }
  
  writeJSON(INVENTORY_FILE, data)
  res.json({ success: true })
})

app.patch('/api/inventory/requests/:id/cancel', (req, res) => {
  const { id } = req.params
  const { cancelledBy } = req.body
  const data = readJSON(INVENTORY_FILE, { entries: [], requests: [] })
  data.requests = data.requests.map(r => 
    r.id === parseInt(id) ? { ...r, status: 'cancelled', cancelledBy, cancelledAt: new Date().toISOString() } : r
  )
  writeJSON(INVENTORY_FILE, data)
  res.json({ success: true })
})

// ============ CREDITORS ENDPOINTS ============

app.get('/api/creditors', (req, res) => {
  const data = readJSON(CREDITORS_FILE, { creditors: [] })
  res.json(data)
})

app.post('/api/creditors', (req, res) => {
  const { name, phone, notes, createdBy } = req.body
  const data = readJSON(CREDITORS_FILE, { creditors: [] })
  
  const creditor = {
    id: Date.now(),
    name,
    phone: phone || null,
    notes: notes || null,
    createdBy,
    createdAt: new Date().toISOString(),
    active: true
  }
  
  data.creditors.push(creditor)
  writeJSON(CREDITORS_FILE, data)
  
  // Log the action
  const logsData = readJSON(CREDIT_LOGS_FILE, { logs: [] })
  logsData.logs.push({
    id: Date.now(),
    type: 'creditor_added',
    timestamp: new Date().toISOString(),
    creditorId: creditor.id,
    creditorName: name,
    phone: phone || null,
    createdBy
  })
  writeJSON(CREDIT_LOGS_FILE, logsData)
  
  res.json({ success: true, creditor })
})

app.patch('/api/creditors/:id', (req, res) => {
  const { id } = req.params
  const data = readJSON(CREDITORS_FILE, { creditors: [] })
  data.creditors = data.creditors.map(c => 
    c.id === parseInt(id) ? { ...c, ...req.body } : c
  )
  writeJSON(CREDITORS_FILE, data)
  res.json({ success: true })
})

app.delete('/api/creditors/:id', (req, res) => {
  const { id } = req.params
  const data = readJSON(CREDITORS_FILE, { creditors: [] })
  data.creditors = data.creditors.filter(c => c.id !== parseInt(id))
  writeJSON(CREDITORS_FILE, data)
  res.json({ success: true })
})

// ============ CREDIT LOGS ENDPOINTS ============

app.get('/api/credit-logs', (req, res) => {
  const { days } = req.query
  const data = readJSON(CREDIT_LOGS_FILE, { logs: [] })
  
  if (days) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - parseInt(days))
    const filtered = data.logs.filter(log => new Date(log.timestamp) >= cutoff)
    return res.json({ logs: filtered })
  }
  
  res.json(data)
})

app.get('/api/credit-logs/recent', (req, res) => {
  const data = readJSON(CREDIT_LOGS_FILE, { logs: [] })
  
  // Get today and yesterday
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const recentLogs = data.logs.filter(log => {
    const logDate = new Date(log.timestamp)
    return logDate >= yesterday
  })
  
  res.json({ logs: recentLogs })
})

// ============ EMAIL RECIPIENTS ENDPOINTS ============

app.get('/api/email-recipients', (req, res) => {
  const data = readJSON(EMAIL_RECIPIENTS_FILE, { recipients: ['arpanregmi@protonmail.com'] })
  res.json(data)
})

app.post('/api/email-recipients', (req, res) => {
  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Invalid email' })
  }
  const data = readJSON(EMAIL_RECIPIENTS_FILE, { recipients: [] })
  if (data.recipients.includes(email.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Email already exists' })
  }
  data.recipients.push(email.toLowerCase())
  writeJSON(EMAIL_RECIPIENTS_FILE, data)
  res.json({ success: true, recipients: data.recipients })
})

app.delete('/api/email-recipients/:email', (req, res) => {
  const { email } = req.params
  const data = readJSON(EMAIL_RECIPIENTS_FILE, { recipients: [] })
  data.recipients = data.recipients.filter(e => e !== decodeURIComponent(email))
  writeJSON(EMAIL_RECIPIENTS_FILE, data)
  res.json({ success: true, recipients: data.recipients })
})

const PORT = 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))