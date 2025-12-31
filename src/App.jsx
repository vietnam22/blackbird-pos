import { useState, useEffect, useCallback } from 'react'
import { api } from './utils/api'
import LoginView from './components/LoginView'
import FloorView from './components/FloorView'
import BillView from './components/BillView'
import SettleView from './components/SettleView'
import SalesView from './components/SalesView'
import StaffView from './components/StaffView'
import AdminView from './components/AdminView'
import InventoryView from './components/InventoryView'
import CreditorView from './components/CreditorView'
import DayManagement from './components/DayManagement'

function App() {
  const [user, setUser] = useState(null)
  const [currentView, setCurrentView] = useState('floor')
  const [selectedTable, setSelectedTable] = useState(null)
  const [openTabs, setOpenTabs] = useState({})
  const [completedBills, setCompletedBills] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [dayStatus, setDayStatus] = useState({ currentDay: null, history: [] })
  const [showDayManagement, setShowDayManagement] = useState(false)

  const loadDayStatus = useCallback(async () => {
    console.log('[App] Loading day status...')
    try {
      const status = await api.getDayStatus()
      console.log('[App] Day status received:', status)
      setDayStatus(status || { currentDay: null, history: [] })
    } catch (err) {
      console.error('[App] Failed to load day status:', err)
    }
  }, [])

  const handleTableTransfer = async (newTable) => {
    await refreshTabData()
    setSelectedTable(null)
    setCurrentView('floor')
  }

  const loadData = useCallback(async () => {
    console.log('[App] Loading data...')
    try {
      const data = await api.getData()
      console.log('[App] Data received:', data?.completedBills?.length, 'bills,', Object.keys(data?.openTabs || {}).length, 'tabs')
      setOpenTabs(data.openTabs || {})
      setCompletedBills(data.completedBills || [])
    } catch (err) {
      console.error('[App] Failed to load data:', err)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await loadData()
      await loadDayStatus()
      setIsLoaded(true)
    }
    init()
  }, [loadData, loadDayStatus])

  const refreshTabData = async () => {
    await loadData()
  }

  const handleLogin = async (pin) => {
    const result = await api.login(pin)
    if (result.success && result.user) {
      setUser(result.user)
      await loadDayStatus()
      return true
    }
    return false
  }

  const handleLogout = () => {
    setUser(null)
    setCurrentView('floor')
    setSelectedTable(null)
  }

  const handleTableClick = (tableName) => {
    setSelectedTable(tableName)
    setCurrentView('bill')
  }

  const handleStartDay = async (userId, userName, startingCash) => {
    console.log('[App] handleStartDay called:', { userId, userName, startingCash })
    try {
      const result = await api.startDay(userId, userName, startingCash)
      console.log('[App] Start day API result:', result)
      if (result.success) {
        console.log('[App] Reloading day status after start...')
        await loadDayStatus()
      }
      return result
    } catch (err) {
      console.error('[App] Start day error:', err)
      return { success: false, error: err.message }
    }
  }

  const handleEndDay = async (userId, userName, endingCash, endingQR) => {
    console.log('[App] handleEndDay called:', { userId, userName, endingCash, endingQR })
    try {
      const result = await api.endDay(userId, userName, endingCash, endingQR)
      console.log('[App] End day API result:', result)
      if (result.success) {
        console.log('[App] Day ended successfully, updating state...')
        // Immediately update local state
        setDayStatus(prev => {
          console.log('[App] Previous dayStatus:', prev)
          return { ...prev, currentDay: null }
        })
        // Then reload fresh data
        console.log('[App] Reloading day status and data...')
        await loadDayStatus()
        await loadData()
      }
      return result
    } catch (err) {
      console.error('[App] End day error:', err)
      return { success: false, error: err.message }
    }
  }

  const handleVerifyPin = async (pin) => {
    console.log('[App] Verifying PIN for user:', user?.name)
    const result = await api.login(pin)
    console.log('[App] PIN verify result:', result)
    // Check if PIN matches the currently logged-in user
    if (result.success && result.user?.id === user?.id) {
      return { success: true, user: result.user }
    }
    return { success: false }
  }

  const handleCloseDayManagement = async () => {
    console.log('[App] Closing day management modal')
    await loadDayStatus()
    setShowDayManagement(false)
  }

  const getTabKey = (table) => table

  const handleBack = () => {
    if (currentView === 'settle') {
      setCurrentView('bill')
    } else {
      setCurrentView('floor')
      setSelectedTable(null)
    }
  }

  const handleSettle = () => {
    setCurrentView('settle')
  }

  const handleConfirmSettle = async (paymentDetails) => {
    const tabKey = getTabKey(selectedTable)
    const tab = openTabs[tabKey]
    const items = tab?.items || []
    const total = items.reduce((sum, item) => sum + item.price, 0)

    const bill = {
      id: Date.now(),
      table: selectedTable,
      items,
      total,
      customerName: tab?.customerName || null,
      paymentMode: paymentDetails.mode,
      creditName: paymentDetails.creditName,
      creditorId: paymentDetails.creditorId || null,
      creditPaid: paymentDetails.mode !== 'credit' && paymentDetails.mode !== 'partial',
      cashAmount: paymentDetails.cashAmount,
      qrAmount: paymentDetails.qrAmount,
      partialPayment: paymentDetails.partialPayment,
      timestamp: new Date().toISOString(),
      createdBy: user.name,
    }

    await api.addBill(bill)
    await api.cancelBill(selectedTable)
    await refreshTabData()
    setCurrentView('floor')
    setSelectedTable(null)
  }

  // Debug log current state
  console.log('[App] Current dayStatus:', dayStatus?.currentDay ? 'ACTIVE' : 'CLOSED')

  if (!isLoaded) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} dayStatus={dayStatus} />
  }

  const dayManagementModal = showDayManagement && (
    <DayManagement
      dayStatus={dayStatus}
      user={user}
      onStartDay={handleStartDay}
      onEndDay={handleEndDay}
      onClose={handleCloseDayManagement}
      onVerifyPin={handleVerifyPin}
      openTabs={openTabs}
    />
  )

  if (currentView === 'inventory') {
    return (
      <>
        <InventoryView user={user} onBack={() => setCurrentView('floor')} />
        {dayManagementModal}
      </>
    )
  }

  if (currentView === 'creditors') {
    return (
      <>
        <CreditorView user={user} onBack={() => setCurrentView('floor')} />
        {dayManagementModal}
      </>
    )
  }

  if (currentView === 'staff') {
    return (
      <>
        <StaffView user={user} onBack={() => setCurrentView('floor')} />
        {dayManagementModal}
      </>
    )
  }

  if (currentView === 'admin') {
    return (
      <>
        <AdminView
          user={user}
          onBack={() => setCurrentView('floor')}
          completedBills={completedBills}
        />
        {dayManagementModal}
      </>
    )
  }

  if (currentView === 'sales') {
    return (
      <>
        <SalesView
          completedBills={completedBills}
          onBack={handleBack}
        />
        {dayManagementModal}
      </>
    )
  }

  if (currentView === 'settle') {
    const tabKey = getTabKey(selectedTable)
    const tab = openTabs[tabKey]
    return (
      <>
        <SettleView
          table={selectedTable}
          items={tab?.items || []}
          customerName={tab?.customerName}
          onBack={handleBack}
          onConfirm={handleConfirmSettle}
          user={user}
        />
        {dayManagementModal}
      </>
    )
  }

  if (currentView === 'bill') {
  const tabKey = getTabKey(selectedTable)
  return (
    <>
      <BillView
        table={selectedTable}
        tab={openTabs[tabKey]}
        onBack={handleBack}
        onUpdate={refreshTabData}
        onSettle={handleSettle}
        user={user}
        openTabs={openTabs}
        onTransfer={handleTableTransfer}
      />
      {dayManagementModal}
    </>
  )
}

  return (
    <>
      <FloorView
        openTabs={openTabs}
        completedBills={completedBills}
        onTableClick={handleTableClick}
        onSalesClick={() => setCurrentView('sales')}
        onStaffClick={() => setCurrentView('staff')}
        onAdminClick={() => setCurrentView('admin')}
        onInventoryClick={() => setCurrentView('inventory')}
        onCreditorsClick={() => setCurrentView('creditors')}
        onDayClick={() => setShowDayManagement(true)}
        onLogout={handleLogout}
        user={user}
        dayStatus={dayStatus}
      />
      {dayManagementModal}
    </>
  )
}

export default App