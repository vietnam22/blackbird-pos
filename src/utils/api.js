const API_URL = 'http://localhost:3001/api'

export const api = {
  // ============ BILLS ============
  getData: async () => {
    try {
      const res = await fetch(`${API_URL}/data?_t=${Date.now()}`)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch data:', error)
      return { completedBills: [], openTabs: {} }
    }
  },

  transferTable: async (fromTable, toTable) => {
  try {
    const res = await fetch(`${API_URL}/tabs/${encodeURIComponent(fromTable)}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetTable: toTable }),
    })
    return await res.json()
  } catch (error) {
    console.error('Failed to transfer table:', error)
    return { success: false }
  }
},

  saveData: async (completedBills, openTabs) => {
    try {
      await fetch(`${API_URL}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedBills, openTabs }),
      })
    } catch (error) {
      console.error('Failed to save data:', error)
    }
  },

  addBill: async (bill) => {
    try {
      await fetch(`${API_URL}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bill),
      })
    } catch (error) {
      console.error('Failed to add bill:', error)
    }
  },

  updateBill: async (id, updates) => {
    try {
      await fetch(`${API_URL}/bills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    } catch (error) {
      console.error('Failed to update bill:', error)
    }
  },

  createTab: async (table, customerName) => {
    try {
      const res = await fetch(`${API_URL}/tabs/${encodeURIComponent(table)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to create tab:', error)
      return { success: false }
    }
  },

  addToTab: async (table, item, user, customerName) => {
    try {
      const res = await fetch(`${API_URL}/tabs/${encodeURIComponent(table)}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, user, customerName }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to add to tab:', error)
      return { success: false }
    }
  },

  removeFromTab: async (table, index) => {
    try {
      const res = await fetch(`${API_URL}/tabs/${encodeURIComponent(table)}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to remove from tab:', error)
      return { success: false }
    }
  },

  updateCustomerName: async (table, customerName) => {
    try {
      const res = await fetch(`${API_URL}/tabs/${encodeURIComponent(table)}/customer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to update customer name:', error)
      return { success: false }
    }
  },

  completeBill: async (table, paymentMode, user, creditName, cashAmount, qrAmount) => {
    try {
      const res = await fetch(`${API_URL}/tabs/${encodeURIComponent(table)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMode, user, creditName, cashAmount, qrAmount }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to complete bill:', error)
      return { success: false }
    }
  },

  cancelBill: async (table) => {
    try {
      const res = await fetch(`${API_URL}/tabs/${encodeURIComponent(table)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to cancel bill:', error)
      return { success: false }
    }
  },

  requestClearCredit: async (billId, requestedBy) => {
    try {
      await fetch(`${API_URL}/bills/${billId}/request-clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedBy }),
      })
    } catch (error) {
      console.error('Failed to request credit clear:', error)
    }
  },

  approveClearCredit: async (billId, approvedBy) => {
    try {
      await fetch(`${API_URL}/bills/${billId}/approve-clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      })
    } catch (error) {
      console.error('Failed to approve credit clear:', error)
    }
  },

  rejectClearCredit: async (billId) => {
    try {
      await fetch(`${API_URL}/bills/${billId}/reject-clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Failed to reject credit clear:', error)
    }
  },

  // ============ USERS ============
  getUsers: async () => {
    try {
      const res = await fetch(`${API_URL}/users`)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch users:', error)
      return []
    }
  },

  addUser: async (user) => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to add user:', error)
    }
  },

  updateUser: async (id, updates) => {
    try {
      await fetch(`${API_URL}/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  },

  deleteUser: async (id) => {
    try {
      await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  },

  login: async (pin) => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to login:', error)
      return { success: false }
    }
  },

  changePin: async (userId, currentPin, newPin) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to change PIN:', error)
      return { success: false, message: 'Network error' }
    }
  },

  login: async (pin) => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to login:', error)
      return { success: false }
    }
  },

  

  // ============ TIMESHEETS ============
  getTimesheets: async () => {
    try {
      const res = await fetch(`${API_URL}/timesheets`)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch timesheets:', error)
      return []
    }
  },

  getActiveTimesheets: async () => {
    try {
      const res = await fetch(`${API_URL}/timesheets/active?_t=${Date.now()}`)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch active timesheets:', error)
      return []
    }
  },

  clockIn: async (userId, userName) => {
    try {
      const res = await fetch(`${API_URL}/timesheets/clockin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to clock in:', error)
      return { success: false }
    }
  },

  clockOut: async (userId) => {
    try {
      const res = await fetch(`${API_URL}/timesheets/clockout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to clock out:', error)
      return { success: false }
    }
  },

  // ============ DAY MANAGEMENT ============
  getDayStatus: async () => {
    console.log('[API] Fetching day status...')
    try {
      const res = await fetch(`${API_URL}/days/current?_t=${Date.now()}`)
      const data = await res.json()
      console.log('[API] Day status response:', data)
      return data
    } catch (error) {
      console.error('[API] Failed to fetch day status:', error)
      return { currentDay: null, history: [] }
    }
  },

  startDay: async (userId, userName, startingCash) => {
    console.log('[API] Starting day...', { userId, userName, startingCash })
    try {
      const res = await fetch(`${API_URL}/days/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName, startingCash }),
      })
      const data = await res.json()
      console.log('[API] Start day response:', data)
      return data
    } catch (error) {
      console.error('[API] Failed to start day:', error)
      return { success: false }
    }
  },

  endDay: async (userId, userName, endingCash, endingQR, emailSummary) => {
  console.log('[API] Ending day...', { userId, userName, endingCash, endingQR, hasEmailSummary: !!emailSummary })
  try {
    const res = await fetch(`${API_URL}/days/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, endingCash, endingQR, emailSummary }),
    })
    const data = await res.json()
    console.log('[API] End day response:', data)
    return data
  } catch (error) {
    console.error('[API] Failed to end day:', error)
    return { success: false }
  }
  },

  // ============ INVENTORY ============
  getInventory: async () => {
    try {
      const res = await fetch(`${API_URL}/inventory?_t=${Date.now()}`)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
      return { entries: [], requests: [] }
    }
  },

  addInventoryEntry: async (item, quantity, unit, totalPrice, paidVia, entryUser) => {
    try {
      const res = await fetch(`${API_URL}/inventory/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, quantity, unit, totalPrice, paidVia, entryUser }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to add inventory:', error)
      return { success: false }
    }
  },

  createInventoryRequest: async (item, quantity, unit, notes, requestedBy, recommendedPrice, recommendedMethod) => {
    try {
      const res = await fetch(`${API_URL}/inventory/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, quantity, unit, notes, requestedBy, recommendedPrice, recommendedMethod }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to create inventory request:', error)
      return { success: false }
    }
  },

  fulfillInventoryRequest: async (id, fulfilledBy, totalPrice, paidVia) => {
    try {
      const res = await fetch(`${API_URL}/inventory/requests/${id}/fulfill`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfilledBy, totalPrice, paidVia }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to fulfill inventory request:', error)
      return { success: false }
    }
  },

  cancelInventoryRequest: async (id, cancelledBy) => {
    try {
      await fetch(`${API_URL}/inventory/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledBy }),
      })
    } catch (error) {
      console.error('Failed to cancel inventory request:', error)
    }
  },

  // ============ WAGES ============
  getWages: async () => {
    try {
      const res = await fetch(`${API_URL}/wages`)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch wages:', error)
      return { payments: [] }
    }
  },

  payWages: async (userId, userName, amount, paidBy) => {
    try {
      const res = await fetch(`${API_URL}/wages/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName, amount, paidBy }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to record wage payment:', error)
      return { success: false }
    }
  },

  // ============ CREDITORS ============
  getCreditors: async () => {
    try {
      const res = await fetch(`${API_URL}/creditors`)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch creditors:', error)
      return { creditors: [] }
    }
  },

  addCreditor: async (name, phone, notes, createdBy) => {
    try {
      const res = await fetch(`${API_URL}/creditors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, notes, createdBy }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to add creditor:', error)
      return { success: false }
    }
  },

  updateCreditor: async (id, updates) => {
    try {
      const res = await fetch(`${API_URL}/creditors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to update creditor:', error)
      return { success: false }
    }
  },

  deleteCreditor: async (id) => {
    try {
      await fetch(`${API_URL}/creditors/${id}`, { method: 'DELETE' })
      return { success: true }
    } catch (error) {
      console.error('Failed to delete creditor:', error)
      return { success: false }
    }
  },

  addCreditPayment: async (billId, amount, method, recordedBy) => {
    try {
      const res = await fetch(`${API_URL}/bills/${billId}/credit-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method, recordedBy }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to add credit payment:', error)
      return { success: false }
    }
  },

  // ============ CREDIT LOGS ============
  getCreditLogs: async () => {
    try {
      // Get recent logs (today + yesterday)
      const res = await fetch(`${API_URL}/credit-logs/recent?_t=${Date.now()}`)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch credit logs:', error)
      return { logs: [] }
    }
  },

  getAllCreditLogs: async (days) => {
    try {
      const url = days 
        ? `${API_URL}/credit-logs?days=${days}&_t=${Date.now()}`
        : `${API_URL}/credit-logs?_t=${Date.now()}`
      const res = await fetch(url)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch all credit logs:', error)
      return { logs: [] }
    }
  },

  // ============ EMAIL RECIPIENTS ============
  getEmailRecipients: async () => {
    try {
      const res = await fetch(`${API_URL}/email-recipients`)
      return await res.json()
    } catch (error) {
      console.error('Failed to fetch email recipients:', error)
      return { recipients: [] }
    }
  },

  addEmailRecipient: async (email) => {
    try {
      const res = await fetch(`${API_URL}/email-recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to add email recipient:', error)
      return { success: false }
    }
  },

  deleteEmailRecipient: async (email) => {
    try {
      const res = await fetch(`${API_URL}/email-recipients/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      })
      return await res.json()
    } catch (error) {
      console.error('Failed to delete email recipient:', error)
      return { success: false }
    }
  },
  getMenu: async () => {
  try {
    const res = await fetch(`${API_URL}/menu`)
    return await res.json()
  } catch (error) {
    console.error('Failed to fetch menu:', error)
    return { items: [] }
  }
},

addMenuItem: async (item) => {
  try {
    const res = await fetch(`${API_URL}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    return await res.json()
  } catch (error) {
    console.error('Failed to add menu item:', error)
    return { success: false }
  }
},

updateMenuItem: async (originalName, updates) => {
  try {
    const res = await fetch(`${API_URL}/menu/${encodeURIComponent(originalName)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return await res.json()
  } catch (error) {
    console.error('Failed to update menu item:', error)
    return { success: false }
  }
},

deleteMenuItem: async (itemName) => {
  try {
    const res = await fetch(`${API_URL}/menu/${encodeURIComponent(itemName)}`, {
      method: 'DELETE',
    })
    return await res.json()
  } catch (error) {
    console.error('Failed to delete menu item:', error)
    return { success: false }
  }
},
}