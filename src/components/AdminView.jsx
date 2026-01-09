import { useState } from 'react'
import AdminUsersView from './AdminUsersView'
import AdminHistoryView from './AdminHistoryView'
import AdminMenuView from './AdminMenuView'

function AdminView({ user, onBack, completedBills }) {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h1>⚙️ Admin</h1>
      </header>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('users')}
          style={{ ...styles.tab, background: activeTab === 'users' ? '#444' : 'transparent' }}
        >
          👥 Users
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{ ...styles.tab, background: activeTab === 'history' ? '#444' : 'transparent' }}
        >
          📅 History
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          style={{ ...styles.tab, background: activeTab === 'menu' ? '#444' : 'transparent' }}
        >
          🍽️ Update Menu
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'users' && <AdminUsersView user={user} />}
        {activeTab === 'history' && <AdminHistoryView completedBills={completedBills} />}
        {activeTab === 'menu' && <AdminMenuView />}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: 20 },
  header: { textAlign: 'center', marginBottom: 20, position: 'relative' },
  backButton: { 
    position: 'absolute', 
    left: 0, 
    top: '50%', 
    transform: 'translateY(-50%)', 
    background: '#333', 
    color: '#fff', 
    border: 'none', 
    padding: '10px 20px', 
    borderRadius: 8, 
    cursor: 'pointer', 
    fontSize: 16 
  },
  tabs: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  tab: { 
    padding: '10px 20px', 
    border: '1px solid #444', 
    borderRadius: 8, 
    color: '#fff', 
    cursor: 'pointer', 
    fontSize: 14 
  },
  content: { maxWidth: 700, margin: '0 auto' },
}

export default AdminView