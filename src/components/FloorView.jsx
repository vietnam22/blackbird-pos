import { useState, useEffect } from 'react'
import { api } from '../utils/api'

// Table layout configuration
export const TABLES = [
  { name: 'Table 4', style: { gridColumn: '4 / 6', gridRow: '1 / 3' } },
  { name: 'Table 3', style: { gridColumn: '6 / 9', gridRow: '1 / 3' } },
  { name: 'Table 1', style: { gridColumn: '9 / 11', gridRow: '1 / 2' } },
  { name: 'Table 2', style: { gridColumn: '9 / 11', gridRow: '2 / 3' } },
  { name: 'Table 5', style: { gridColumn: '4 / 6', gridRow: '3 / 5' } },
  { name: 'Table 6', style: { gridColumn: '4 / 6', gridRow: '5 / 7' } },
  { name: 'Counter', style: { gridColumn: '6 / 9', gridRow: '4 / 7', fontSize: '18px' } },
  { name: 'Table 8', style: { gridColumn: '2 / 4', gridRow: '7 / 9' } },
  { name: 'Table 7', style: { gridColumn: '4 / 6', gridRow: '7 / 9' } },
]

function FloorView({ 
  openTabs, 
  completedBills, 
  onTableClick, 
  onSalesClick, 
  onStaffClick, 
  onAdminClick,
  onInventoryClick,
  onCreditorsClick,
  onDayClick,
  onLogout,
  user,
  dayStatus 
}) {
  const [activeWorkers, setActiveWorkers] = useState([])
  const [pendingInventoryCount, setPendingInventoryCount] = useState(0)
  const [creditActivityCount, setCreditActivityCount] = useState(0)

  // Get last seen timestamp from localStorage
  const getLastSeenCreditors = () => {
    const stored = localStorage.getItem(`blackbird_creditors_seen_${user.id}`)
    return stored ? new Date(stored) : new Date(0)
  }

  const markCreditorsAsSeen = () => {
    localStorage.setItem(`blackbird_creditors_seen_${user.id}`, new Date().toISOString())
    setCreditActivityCount(0)
  }

  const handleCreditorsClick = () => {
    onCreditorsClick()
  }

  useEffect(() => {
    loadActiveWorkers()
    loadNotifications()
    const interval = setInterval(() => {
      loadActiveWorkers()
      loadNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [completedBills])

  const loadActiveWorkers = async () => {
    const active = await api.getActiveTimesheets()
    setActiveWorkers(active)
  }

  const loadNotifications = async () => {
    if (user.role === 'admin') {
      const invData = await api.getInventory()
      const pending = (invData.requests || []).filter(r => r.status === 'pending')
      setPendingInventoryCount(pending.length)
    }

    if (user.role === 'admin') {
      const lastSeen = getLastSeenCreditors()
      const isBillCleared = (b) => b.creditPaid === true || b.creditCleared === true
      const logsData = await api.getCreditLogs()
      const logs = logsData.logs || []
      
      const newLogsSinceLastSeen = logs.filter(log => {
        const logTime = new Date(log.timestamp)
        return logTime > lastSeen && log.type !== 'clear_requested'
      }).length
      
      const billsData = await api.getData()
      const pendingClearRequests = (billsData.completedBills || []).filter(b => 
        b.clearRequested && !isBillCleared(b)
      ).length
      
      setCreditActivityCount(pendingClearRequests + newLogsSinceLastSeen)
    } else {
      setCreditActivityCount(0)
    }
  }

  const getTableStyle = (tableName, positionStyle) => {
    let bgColor = '#2a2a2a'
    if (tableName === 'Counter') {
      bgColor = '#3d3d3d'
    } else if (openTabs[tableName]) {
      bgColor = '#2d4a3e'
    }
    return { ...styles.table, ...positionStyle, background: bgColor }
  }

  const getTableDisplay = (tableName) => {
    const tab = openTabs[tableName]
    if (tab?.customerName) {
      return (
        <div style={styles.tableContent}>
          <span style={styles.tableName}>{tableName}</span>
          <span style={styles.customerName}>{tab.customerName}</span>
        </div>
      )
    }
    return tableName
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayBills = completedBills.filter(b => new Date(b.timestamp) >= todayStart)
  const todayTotal = todayBills.reduce((sum, b) => sum + b.total, 0)
  const isDayActive = dayStatus?.currentDay !== null

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.userName}>👤 {user.name}</span>
          <button onClick={onLogout} style={styles.logoutButton}>Logout</button>
        </div>
        <h1 style={styles.title}>🐦‍⬛ Blackbird</h1>
        <div style={styles.headerRight}>
          <button onClick={onDayClick} style={styles.dayButton(isDayActive)}>
            {isDayActive ? '🟢 Day Active' : '🔴 Day Closed'}
          </button>
        </div>
      </header>

      {activeWorkers.length > 0 && (
        <div style={styles.workersBar}>
          <span style={styles.workersLabel}>On Shift:</span>
          {activeWorkers.map(w => (
            <span key={w.userId} style={styles.workerBadge}>{w.userName}</span>
          ))}
        </div>
      )}

      {todayBills.length > 0 && (
        <div style={styles.statsBar}>
          Today: {todayBills.length} bills • Rs. {todayTotal.toLocaleString()}
        </div>
      )}

      <div style={styles.navBar}>
        <button onClick={onSalesClick} style={styles.navButton}>📊 Sales</button>
        <button onClick={onInventoryClick} style={styles.navButtonWithBadge}>
          📦 Inventory
          {user.role === 'admin' && pendingInventoryCount > 0 && (
            <span style={styles.notificationBubble}>{pendingInventoryCount}</span>
          )}
        </button>
        <button onClick={handleCreditorsClick} style={styles.navButtonWithBadge}>
          💳 Creditors
          {creditActivityCount > 0 && (
            <span style={styles.notificationBubbleCredit}>{creditActivityCount}</span>
          )}
        </button>
        <button onClick={onStaffClick} style={styles.navButton}>⏱️ Clock</button>
        {user.role === 'admin' && (
          <button onClick={onAdminClick} style={styles.navButton}>⚙️ Admin</button>
        )}
      </div>

      {!isDayActive && (
        <div style={styles.closedBanner}>
          🔴 Day is closed. Start the day to take orders.
        </div>
      )}

      <div style={{
        ...styles.floor,
        opacity: isDayActive ? 1 : 0.5,
        pointerEvents: isDayActive ? 'auto' : 'none',
      }}>
        {TABLES.map(table => (
          <div
            key={table.name}
            style={getTableStyle(table.name, table.style)}
            onClick={() => onTableClick(table.name)}
          >
            {getTableDisplay(table.name)}
          </div>
        ))}
      </div>

      <div style={styles.legend}>
        <span><span style={styles.dot('#2a2a2a')}></span> Vacant</span>
        <span><span style={styles.dot('#2d4a3e')}></span> Occupied</span>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerRight: { display: 'flex', gap: '10px' },
  title: { margin: 0 },
  userName: { color: '#888', fontSize: '14px' },
  logoutButton: { background: 'transparent', border: '1px solid #444', color: '#888', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  dayButton: (isActive) => ({ background: isActive ? '#1e3d1e' : '#3d1e1e', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }),
  workersBar: { display: 'flex', alignItems: 'center', gap: '10px', background: '#2a2a2a', padding: '10px 15px', borderRadius: '8px', marginBottom: '10px', flexWrap: 'wrap' },
  workersLabel: { color: '#888', fontSize: '13px' },
  workerBadge: { background: '#2d5a2d', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' },
  statsBar: { textAlign: 'center', color: '#888', fontSize: '14px', marginBottom: '15px' },
  navBar: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
  navButton: { background: '#333', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  navButtonWithBadge: { background: '#333', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', position: 'relative' },
  notificationBubble: { position: 'absolute', top: '-8px', right: '-8px', background: '#f97316', color: '#fff', fontSize: '11px', fontWeight: 'bold', minWidth: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' },
  notificationBubbleCredit: { position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 'bold', minWidth: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' },
  closedBanner: { background: '#3d1e1e', color: '#f87171', textAlign: 'center', padding: '12px', borderRadius: '8px', marginBottom: '20px' },
  floor: { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'repeat(8, 60px)', gap: '10px', maxWidth: '900px', margin: '0 auto', transition: 'opacity 0.3s' },
  table: { border: '2px solid #444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.3s', textAlign: 'center', padding: '4px' },
  tableContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  tableName: { fontSize: '13px' },
  customerName: { fontSize: '10px', color: '#4ade80', fontWeight: 'normal', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  legend: { display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '30px', fontSize: '14px', color: '#888' },
  dot: (color) => ({ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: color, marginRight: '8px', verticalAlign: 'middle' }),
}

export default FloorView