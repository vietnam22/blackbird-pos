import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { MENU_CATEGORIES } from '../data/menu'

function AdminMenuView() {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Edit modal state
  const [editingItem, setEditingItem] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editPriceOnRequest, setEditPriceOnRequest] = useState(false)
  
  // Add new item state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState('coffee')
  const [newPriceOnRequest, setNewPriceOnRequest] = useState(false)
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  
  // Feedback
  const [feedback, setFeedback] = useState(null)

  useEffect(() => { loadMenu() }, [])

  const loadMenu = async () => {
    setLoading(true)
    const data = await api.getMenu()
    setMenuItems(data.items || [])
    setLoading(false)
  }

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 3000)
  }

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Group by category for display
  const groupedItems = MENU_CATEGORIES.map(cat => ({
    ...cat,
    items: filteredItems.filter(item => item.category === cat.id)
  })).filter(cat => selectedCategory === 'all' ? cat.items.length > 0 : cat.id === selectedCategory)

  // Edit handlers
  const openEditModal = (item) => {
    setEditingItem(item)
    setEditName(item.name)
    setEditPrice(item.price.toString())
    setEditCategory(item.category)
    setEditPriceOnRequest(item.priceOnRequest || false)
  }

  const saveEdit = async () => {
    if (!editName.trim()) return showFeedback('Name is required', 'error')
    if (!editPriceOnRequest && (!editPrice || isNaN(Number(editPrice)))) {
      return showFeedback('Valid price is required', 'error')
    }

    const result = await api.updateMenuItem(editingItem.name, {
      name: editName.trim(),
      price: editPriceOnRequest ? 0 : Number(editPrice),
      category: editCategory,
      priceOnRequest: editPriceOnRequest
    })

    if (result.success) {
      showFeedback('Item updated successfully')
      setEditingItem(null)
      loadMenu()
    } else {
      showFeedback(result.message || 'Failed to update item', 'error')
    }
  }

  // Add handlers
  const handleAddItem = async () => {
    if (!newName.trim()) return showFeedback('Name is required', 'error')
    if (!newPriceOnRequest && (!newPrice || isNaN(Number(newPrice)))) {
      return showFeedback('Valid price is required', 'error')
    }

    const result = await api.addMenuItem({
      name: newName.trim(),
      price: newPriceOnRequest ? 0 : Number(newPrice),
      category: newCategory,
      priceOnRequest: newPriceOnRequest
    })

    if (result.success) {
      showFeedback('Item added successfully')
      setShowAddModal(false)
      setNewName('')
      setNewPrice('')
      setNewCategory('coffee')
      setNewPriceOnRequest(false)
      loadMenu()
    } else {
      showFeedback(result.message || 'Failed to add item', 'error')
    }
  }

  // Delete handlers
  const handleDelete = async (itemName) => {
    const result = await api.deleteMenuItem(itemName)
    if (result.success) {
      showFeedback('Item deleted successfully')
      setDeleteConfirm(null)
      loadMenu()
    } else {
      showFeedback(result.message || 'Failed to delete item', 'error')
    }
  }

  if (loading) return <div style={S.loading}>Loading menu...</div>

  return (
    <div style={S.container}>
      {/* Feedback Toast */}
      {feedback && (
        <div style={{ ...S.toast, background: feedback.type === 'error' ? '#dc2626' : '#16a34a' }}>
          {feedback.message}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <h3 style={S.title}>🍽️ Menu Management</h3>
        <button onClick={() => setShowAddModal(true)} style={S.addBtn}>+ Add Item</button>
      </div>

      {/* Filters */}
      <div style={S.filters}>
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={S.searchInput}
        />
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={S.categorySelect}
        >
          <option value="all">All Categories</option>
          {MENU_CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div style={S.stats}>
        <span>Total: {menuItems.length} items</span>
        <span>Showing: {filteredItems.length} items</span>
      </div>

      {/* Menu Items */}
      {groupedItems.length === 0 ? (
        <p style={S.empty}>No items found</p>
      ) : (
        groupedItems.map(category => (
          <div key={category.id} style={S.categorySection}>
            <h4 style={S.categoryTitle}>{category.icon} {category.name}</h4>
            <div style={S.itemsList}>
              {category.items.map(item => (
                <div key={item.name} style={S.itemRow}>
                  <div style={S.itemInfo}>
                    <span style={S.itemName}>{item.name}</span>
                    <span style={S.itemPrice}>
                      {item.priceOnRequest ? 'Price on Request' : `Rs. ${item.price}`}
                    </span>
                  </div>
                  <div style={S.itemActions}>
                    <button onClick={() => openEditModal(item)} style={S.editBtn}>✏️ Edit</button>
                    <button onClick={() => setDeleteConfirm(item.name)} style={S.deleteBtn}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div style={S.modalOverlay} onClick={() => setEditingItem(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Edit Item</h3>
            
            <label style={S.label}>Item Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={S.input}
            />

            <label style={S.label}>Category</label>
            <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={S.input}>
              {MENU_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>

            <label style={S.checkLabel}>
              <input
                type="checkbox"
                checked={editPriceOnRequest}
                onChange={e => setEditPriceOnRequest(e.target.checked)}
              />
              Price on Request
            </label>

            {!editPriceOnRequest && (
              <>
                <label style={S.label}>Price (Rs.)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  style={S.input}
                />
              </>
            )}

            <div style={S.modalActions}>
              <button onClick={() => setEditingItem(null)} style={S.cancelBtn}>Cancel</button>
              <button onClick={saveEdit} style={S.saveBtn}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={S.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Add New Item</h3>
            
            <label style={S.label}>Item Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g., Caramel Latte"
              style={S.input}
            />

            <label style={S.label}>Category</label>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={S.input}>
              {MENU_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>

            <label style={S.checkLabel}>
              <input
                type="checkbox"
                checked={newPriceOnRequest}
                onChange={e => setNewPriceOnRequest(e.target.checked)}
              />
              Price on Request
            </label>

            {!newPriceOnRequest && (
              <>
                <label style={S.label}>Price (Rs.)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  placeholder="0"
                  style={S.input}
                />
              </>
            )}

            <div style={S.modalActions}>
              <button onClick={() => setShowAddModal(false)} style={S.cancelBtn}>Cancel</button>
              <button onClick={handleAddItem} style={S.saveBtn}>Add Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div style={S.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Delete Item?</h3>
            <p style={S.confirmText}>Are you sure you want to delete "{deleteConfirm}"?</p>
            <p style={S.confirmWarning}>This action cannot be undone.</p>
            <div style={S.modalActions}>
              <button onClick={() => setDeleteConfirm(null)} style={S.cancelBtn}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={S.dangerBtn}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  container: { padding: 10 },
  loading: { textAlign: 'center', padding: 40, color: '#888' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { margin: 0 },
  addBtn: { background: '#2d5a2d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' },
  filters: { display: 'flex', gap: 10, marginBottom: 15 },
  searchInput: { flex: 1, padding: 10, borderRadius: 8, border: '1px solid #444', background: '#2d2d2d', color: '#fff', fontSize: 14 },
  categorySelect: { padding: 10, borderRadius: 8, border: '1px solid #444', background: '#2d2d2d', color: '#fff', fontSize: 14, minWidth: 160 },
  stats: { display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 13, marginBottom: 15, padding: '0 5px' },
  empty: { textAlign: 'center', color: '#888', padding: 40 },
  categorySection: { marginBottom: 25 },
  categoryTitle: { color: '#4ade80', marginBottom: 10, fontSize: 16 },
  itemsList: { display: 'flex', flexDirection: 'column', gap: 8 },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2d2d2d', padding: '12px 15px', borderRadius: 8 },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: 4 },
  itemName: { fontWeight: '500' },
  itemPrice: { color: '#888', fontSize: 13 },
  itemActions: { display: 'flex', gap: 8 },
  editBtn: { background: '#3d4a5a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  deleteBtn: { background: '#5a3d3d', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1e1e1e', padding: 25, borderRadius: 12, width: '90%', maxWidth: 400 },
  modalTitle: { marginTop: 0, marginBottom: 20 },
  label: { display: 'block', color: '#888', fontSize: 13, marginBottom: 5, marginTop: 15 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 15, color: '#ccc', cursor: 'pointer' },
  input: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #444', background: '#2d2d2d', color: '#fff', fontSize: 14, boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: 10, marginTop: 25 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, border: '1px solid #444', background: 'transparent', color: '#fff', cursor: 'pointer' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#2d5a2d', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  dangerBtn: { flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  confirmText: { color: '#ccc', marginBottom: 10 },
  confirmWarning: { color: '#f87171', fontSize: 13 },
  toast: { position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: 8, color: '#fff', zIndex: 2000, fontWeight: '500' },
}

export default AdminMenuView