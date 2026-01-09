import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { MENU } from '../data/menu'

const HOURLY_WAGE = 70
const DAILY_RENT = 800

function AdminHistoryView({ completedBills }) {
  const [inventory, setInventory] = useState({ entries: [] })
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyView, setHistoryView] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [salesReport, setSalesReport] = useState(null)
  const [purchaseReport, setPurchaseReport] = useState(null)
  const [emailRecipients, setEmailRecipients] = useState([])
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [inv, ts] = await Promise.all([api.getInventory(), api.getTimesheets()])
    setInventory(inv); setTimesheets(ts); setLoading(false)
  }

  const loadEmailRecipients = async () => {
    const data = await api.getEmailRecipients()
    setEmailRecipients(data.recipients || [])
  }

  const addEmailRecipient = async () => {
    if (!newEmail || !newEmail.includes('@')) return
    const result = await api.addEmailRecipient(newEmail)
    if (result.success !== false) {
      setEmailRecipients(result.recipients || [])
      setNewEmail('')
    }
  }

  const deleteEmailRecipient = async (email) => {
    const result = await api.deleteEmailRecipient(email)
    if (result.success !== false) {
      setEmailRecipients(result.recipients || [])
    }
  }

  const fmtTime = ts => new Date(ts).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = ts => new Date(ts).toLocaleDateString('en-NP', { month: 'short', day: 'numeric', year: 'numeric' })
  const fmtQty = (q, u) => u ? `${q} ${u}` : q

  const getDateBills = () => selectedDate ? completedBills.filter(b => new Date(b.timestamp).toISOString().split('T')[0] === selectedDate) : []
  const getDateInv = () => selectedDate ? inventory.entries.filter(e => e.date === selectedDate) : []
  const getDateTS = () => selectedDate ? timesheets.filter(e => new Date(e.clockIn).toISOString().split('T')[0] === selectedDate) : []

  const toggleItem = (n) => { setSelectedItems(p => p.includes(n) ? p.filter(i => i !== n) : [...p, n]); setSalesReport(null); setPurchaseReport(null) }

  // Get unique inventory items from history (case-insensitive grouping)
  const getUniqueInventoryItems = () => {
    const itemMap = {}
    inventory.entries.forEach(e => {
      const key = e.item.toLowerCase().trim()
      if (!itemMap[key]) {
        itemMap[key] = e.item // Keep original casing of first occurrence
      }
    })
    return Object.values(itemMap).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  }

  const genReport = () => {
    if (!selectedItems.length || !dateFrom || !dateTo) return
    const from = new Date(dateFrom), to = new Date(dateTo); to.setHours(23, 59, 59, 999)
    const bills = completedBills.filter(b => { const d = new Date(b.timestamp); return d >= from && d <= to })
    const rpt = {}
    selectedItems.forEach(n => { rpt[n] = { qty: 0, rev: 0, daily: {} } })
    bills.forEach(b => {
      const dt = new Date(b.timestamp).toISOString().split('T')[0]
      b.items.forEach(i => {
        if (selectedItems.includes(i.name)) {
          rpt[i.name].qty++; rpt[i.name].rev += i.price
          if (!rpt[i.name].daily[dt]) rpt[i.name].daily[dt] = { qty: 0, rev: 0 }
          rpt[i.name].daily[dt].qty++; rpt[i.name].daily[dt].rev += i.price
        }
      })
    })
    setSalesReport({ items: rpt, totQty: Object.values(rpt).reduce((s, r) => s + r.qty, 0), totRev: Object.values(rpt).reduce((s, r) => s + r.rev, 0), dateFrom, dateTo })
  }

  const genPurchaseReport = () => {
    if (!selectedItems.length || !dateFrom || !dateTo) return
    const from = new Date(dateFrom), to = new Date(dateTo); to.setHours(23, 59, 59, 999)
    
    // Filter inventory entries by date range
    const entries = inventory.entries.filter(e => {
      const d = e.timestamp ? new Date(e.timestamp) : new Date(e.date)
      return d >= from && d <= to
    })
    
    const rpt = {}
    // Initialize report for selected items (case-insensitive matching)
    selectedItems.forEach(n => { rpt[n] = { qty: 0, cost: 0, unit: null, daily: {} } })
    
    entries.forEach(e => {
      const dt = e.date || new Date(e.timestamp).toISOString().split('T')[0]
      // Find matching selected item (case-insensitive)
      const matchedItem = selectedItems.find(s => s.toLowerCase() === e.item.toLowerCase())
      if (matchedItem) {
        rpt[matchedItem].qty += e.quantity || 0
        rpt[matchedItem].cost += e.totalPrice || 0
        if (e.unit && !rpt[matchedItem].unit) rpt[matchedItem].unit = e.unit
        
        if (!rpt[matchedItem].daily[dt]) rpt[matchedItem].daily[dt] = { qty: 0, cost: 0 }
        rpt[matchedItem].daily[dt].qty += e.quantity || 0
        rpt[matchedItem].daily[dt].cost += e.totalPrice || 0
      }
    })
    
    setPurchaseReport({ 
      items: rpt, 
      totQty: Object.values(rpt).reduce((s, r) => s + r.qty, 0), 
      totCost: Object.values(rpt).reduce((s, r) => s + r.cost, 0), 
      dateFrom, 
      dateTo 
    })
  }

  const getSummary = () => {
    const bills = getDateBills(), inv = getDateInv(), ts = getDateTS()
    const sold = {}
    bills.forEach(b => b.items.forEach(i => {
      if (sold[i.name]) { sold[i.name].qty++; sold[i.name].tot += i.price }
      else sold[i.name] = { name: i.name, qty: 1, tot: i.price }
    }))
    const soldList = Object.values(sold).sort((a, b) => b.tot - a.tot)
    const totIn = soldList.reduce((s, i) => s + i.tot, 0)
    const invTot = inv.reduce((s, e) => s + (e.totalPrice || 0), 0)
    const wages = ts.map(e => ({ name: e.userName, hrs: e.hoursWorked || 0, wage: Math.round((e.hoursWorked || 0) * HOURLY_WAGE) }))
    const wageTot = wages.reduce((s, w) => s + w.wage, 0)
    return { soldList, totIn, inv, invTot, wages, wageTot, rent: DAILY_RENT, totOut: invTot + wageTot + DAILY_RENT, net: totIn - (invTot + wageTot + DAILY_RENT) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <div style={S.card}>
      <h3>📅 History</h3>

      {/* Main Menu - This shows when historyView is null */}
      {!historyView && (
        <div style={S.histTabs}>
          <button onClick={() => setHistoryView('daily')} style={S.histTabBtn}>
            📊 Daily Summary
          </button>
          <button onClick={() => setHistoryView('itemSales')} style={S.histTabBtn}>
            📈 Monitor Item Sales
          </button>
          <button onClick={() => setHistoryView('itemPurchase')} style={S.histTabBtn}>
            🛒 Monitor Item Purchase
          </button>
          <button onClick={() => { setHistoryView('emailRecipients'); loadEmailRecipients() }} style={S.histTabBtn}>
            ✉️ Daily Summary Emails
          </button>
        </div>
      )}

      {/* Daily Summary Navigation */}
      {historyView === 'daily' && (
        <>
          <button onClick={() => setHistoryView(null)} style={S.backLink}>← Back</button>
          <div style={S.dateSec}>
            <label>Select Date:</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={S.datePick} max={new Date().toISOString().split('T')[0]} />
          </div>
          {selectedDate ? (
            <div style={S.histOpts}>
              <button onClick={() => setHistoryView('summary')} style={S.histOptBtn}>📊 Total In/Out Summary</button>
              <button onClick={() => setHistoryView('sales')} style={S.histOptBtn}>🧾 Sales Bills <span style={S.optCount}>{getDateBills().length}</span></button>
              <button onClick={() => setHistoryView('inventory')} style={S.histOptBtn}>📦 Inventory <span style={S.optCount}>{getDateInv().length}</span></button>
              <button onClick={() => setHistoryView('staff')} style={S.histOptBtn}>👥 Staff Hours <span style={S.optCount}>{getDateTS().length}</span></button>
            </div>
          ) : <p style={S.empty}>Select a date to view history</p>}
        </>
      )}

      {/* Item Sales Monitor */}
      {historyView === 'itemSales' && (
        <div>
          <button onClick={() => { setHistoryView(null); setSelectedItems([]); setDateFrom(''); setDateTo(''); setSalesReport(null) }} style={S.backLink}>← Back</button>
          <h4 style={{ marginBottom: 15 }}>📈 Monitor Item Sales</h4>

          <div style={S.dateRange}>
            <div style={S.dateInp}>
              <label>From:</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setSalesReport(null) }} style={S.datePick} max={new Date().toISOString().split('T')[0]} />
            </div>
            <div style={S.dateInp}>
              <label>To:</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setSalesReport(null) }} style={S.datePick} max={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div style={S.itemSec}>
            <label style={S.secLbl}>Select Items to Monitor:</label>
            <div style={S.itemGrid}>
              {MENU.map(item => (
                <button 
                  key={item.name} 
                  onClick={() => toggleItem(item.name)} 
                  style={{ 
                    ...S.itemBtn, 
                    background: selectedItems.includes(item.name) ? '#2d5a2d' : '#3d3d3d', 
                    borderColor: selectedItems.includes(item.name) ? '#4ade80' : '#555' 
                  }}
                >
                  {selectedItems.includes(item.name) && <span style={{ color: '#4ade80' }}>✓ </span>}
                  {item.name}
                </button>
              ))}
            </div>
            {selectedItems.length > 0 && (
              <div style={S.selCount}>
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                <button onClick={() => setSelectedItems([])} style={S.clearBtn}>Clear</button>
              </div>
            )}
          </div>

          <button 
            onClick={genReport} 
            disabled={!selectedItems.length || !dateFrom || !dateTo} 
            style={{ ...S.genBtn, opacity: !selectedItems.length || !dateFrom || !dateTo ? 0.5 : 1 }}
          >
            📊 Generate Report
          </button>

          {salesReport && (
            <div style={S.rptSec}>
              <div style={S.rptHdr}>
                <h4 style={{ margin: 0 }}>Sales Report</h4>
                <span style={S.rptRange}>{fmtDate(salesReport.dateFrom)} - {fmtDate(salesReport.dateTo)}</span>
              </div>
              <div style={S.rptSum}>
                <div style={S.rptBox}><span style={S.rptLbl}>Total Quantity</span><span style={S.rptVal}>{salesReport.totQty}</span></div>
                <div style={S.rptBox}><span style={S.rptLbl}>Total Revenue</span><span style={{ ...S.rptVal, color: '#4ade80' }}>Rs. {salesReport.totRev.toLocaleString()}</span></div>
              </div>
              <div style={S.rptItems}>
                {Object.entries(salesReport.items).map(([name, data]) => (
                  <div key={name} style={S.rptItem}>
                    <div style={S.rptItemHdr}>
                      <span style={S.rptItemName}>{name}</span>
                      <div style={S.rptItemStats}>
                        <span style={S.rptItemQty}>×{data.qty}</span>
                        <span style={S.rptItemRev}>Rs. {data.rev.toLocaleString()}</span>
                      </div>
                    </div>
                    {Object.keys(data.daily).length > 0 && (
                      <div style={S.dailyBrk}>
                        {Object.entries(data.daily).sort(([a], [b]) => a.localeCompare(b)).map(([dt, dd]) => (
                          <div key={dt} style={S.dailyRow}>
                            <span style={S.dailyDt}>{fmtDate(dt)}</span>
                            <span style={S.dailyQty}>×{dd.qty}</span>
                            <span style={S.dailyRev}>Rs. {dd.rev.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {salesReport.totQty === 0 && <p style={S.empty}>No sales found for selected items in this date range.</p>}
            </div>
          )}
        </div>
      )}

      {/* Item Purchase Monitor */}
      {historyView === 'itemPurchase' && (
        <div>
          <button onClick={() => { setHistoryView(null); setSelectedItems([]); setDateFrom(''); setDateTo(''); setPurchaseReport(null) }} style={S.backLink}>← Back</button>
          <h4 style={{ marginBottom: 15 }}>🛒 Monitor Item Purchase</h4>

          <div style={S.dateRange}>
            <div style={S.dateInp}>
              <label>From:</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPurchaseReport(null) }} style={S.datePick} max={new Date().toISOString().split('T')[0]} />
            </div>
            <div style={S.dateInp}>
              <label>To:</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPurchaseReport(null) }} style={S.datePick} max={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div style={S.itemSec}>
            <label style={S.secLbl}>Select Items to Monitor:</label>
            {getUniqueInventoryItems().length === 0 ? (
              <p style={S.empty}>No inventory items found. Add inventory entries first.</p>
            ) : (
              <div style={S.itemGrid}>
                {getUniqueInventoryItems().map(item => (
                  <button 
                    key={item} 
                    onClick={() => toggleItem(item)} 
                    style={{ 
                      ...S.itemBtn, 
                      background: selectedItems.includes(item) ? '#2d4a6d' : '#3d3d3d', 
                      borderColor: selectedItems.includes(item) ? '#60a5fa' : '#555' 
                    }}
                  >
                    {selectedItems.includes(item) && <span style={{ color: '#60a5fa' }}>✓ </span>}
                    {item}
                  </button>
                ))}
              </div>
            )}
            {selectedItems.length > 0 && (
              <div style={S.selCount}>
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                <button onClick={() => setSelectedItems([])} style={S.clearBtn}>Clear</button>
              </div>
            )}
          </div>

          <button 
            onClick={genPurchaseReport} 
            disabled={!selectedItems.length || !dateFrom || !dateTo} 
            style={{ ...S.genBtn, opacity: !selectedItems.length || !dateFrom || !dateTo ? 0.5 : 1, background: '#2d4a6d' }}
          >
            📊 Generate Report
          </button>

          {purchaseReport && (
            <div style={S.rptSec}>
              <div style={S.rptHdr}>
                <h4 style={{ margin: 0 }}>Purchase Report</h4>
                <span style={S.rptRange}>{fmtDate(purchaseReport.dateFrom)} - {fmtDate(purchaseReport.dateTo)}</span>
              </div>
              <div style={S.rptSum}>
                <div style={S.rptBox}><span style={S.rptLbl}>Total Entries</span><span style={S.rptVal}>{Object.values(purchaseReport.items).filter(r => r.qty > 0).length}</span></div>
                <div style={S.rptBox}><span style={S.rptLbl}>Total Cost</span><span style={{ ...S.rptVal, color: '#f87171' }}>Rs. {purchaseReport.totCost.toLocaleString()}</span></div>
              </div>
              <div style={S.rptItems}>
                {Object.entries(purchaseReport.items).map(([name, data]) => (
                  <div key={name} style={S.rptItem}>
                    <div style={S.rptItemHdr}>
                      <span style={S.rptItemName}>{name}</span>
                      <div style={S.rptItemStats}>
                        <span style={S.rptItemQty}>{data.qty}{data.unit ? ` ${data.unit}` : ''}</span>
                        <span style={{ ...S.rptItemRev, color: '#f87171' }}>Rs. {data.cost.toLocaleString()}</span>
                      </div>
                    </div>
                    {Object.keys(data.daily).length > 0 && (
                      <div style={S.dailyBrk}>
                        {Object.entries(data.daily).sort(([a], [b]) => a.localeCompare(b)).map(([dt, dd]) => (
                          <div key={dt} style={S.dailyRow}>
                            <span style={S.dailyDt}>{fmtDate(dt)}</span>
                            <span style={S.dailyQty}>{dd.qty}{data.unit ? ` ${data.unit}` : ''}</span>
                            <span style={{ ...S.dailyRev, color: '#f87171' }}>Rs. {dd.cost.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {purchaseReport.totCost === 0 && <p style={S.empty}>No purchases found for selected items in this date range.</p>}
            </div>
          )}
        </div>
      )}

      {/* Summary View */}
      {historyView === 'summary' && (
        <div>
          <button onClick={() => setHistoryView('daily')} style={S.backLink}>← Back</button>
          <h4>📊 Daily Summary - {fmtDate(selectedDate)}</h4>
          {(() => { const s = getSummary(); return (
            <div>
              <div style={{ ...S.netBan, background: s.net >= 0 ? '#1e3d1e' : '#3d1e1e', borderColor: s.net >= 0 ? '#2d5a2d' : '#5a2d2d' }}>
                <span style={S.netLbl}>{s.net >= 0 ? '📈 Net Profit' : '📉 Net Loss'}</span>
                <span style={{ ...S.netAmt, color: s.net >= 0 ? '#4ade80' : '#f87171' }}>Rs. {Math.abs(s.net).toLocaleString()}</span>
              </div>
              <div style={S.sumCols}>
                <div style={S.sumCol}>
                  <div style={S.colHdr}><span>💰</span> MONEY IN</div>
                  <div style={S.colBody}>
                    <div style={S.secTitle}>Sales</div>
                    {s.soldList.length === 0 ? <p style={S.emptySmall}>No sales</p> : s.soldList.map((i, x) => <div key={x} style={S.sumItem}><span>{i.name} <span style={{ color: '#888' }}>×{i.qty}</span></span><span style={{ color: '#4ade80' }}>Rs. {i.tot.toLocaleString()}</span></div>)}
                  </div>
                  <div style={S.colTot}><span>Total In</span><span style={{ color: '#4ade80' }}>Rs. {s.totIn.toLocaleString()}</span></div>
                </div>
                <div style={S.sumCol}>
                  <div style={{ ...S.colHdr, background: '#3d1e1e' }}><span>💸</span> MONEY OUT</div>
                  <div style={S.colBody}>
                    <div style={S.secTitle}>Inventory</div>
                    {s.inv.length === 0 ? <p style={S.emptySmall}>No inventory</p> : s.inv.map((e, x) => <div key={x} style={S.sumItem}><span>{e.item} <span style={{ color: '#888' }}>×{fmtQty(e.quantity, e.unit)}</span></span><span style={{ color: '#f87171' }}>Rs. {(e.totalPrice || 0).toLocaleString()}</span></div>)}
                    <div style={S.subRow}><span>Subtotal</span><span>Rs. {s.invTot.toLocaleString()}</span></div>
                    <div style={{ ...S.secTitle, marginTop: 15 }}>Staff Wages</div>
                    {s.wages.length === 0 ? <p style={S.emptySmall}>No staff</p> : s.wages.map((w, x) => <div key={x} style={S.sumItem}><span>{w.name} <span style={{ color: '#888' }}>{w.hrs.toFixed(1)}h</span></span><span style={{ color: '#f87171' }}>Rs. {w.wage.toLocaleString()}</span></div>)}
                    <div style={S.subRow}><span>Subtotal</span><span>Rs. {s.wageTot.toLocaleString()}</span></div>
                    <div style={{ ...S.secTitle, marginTop: 15 }}>Fixed Costs</div>
                    <div style={S.sumItem}><span>Daily Rent</span><span style={{ color: '#f87171' }}>Rs. {s.rent.toLocaleString()}</span></div>
                  </div>
                  <div style={{ ...S.colTot, background: '#3d1e1e' }}><span>Total Out</span><span style={{ color: '#f87171' }}>Rs. {s.totOut.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          )})()}
        </div>
      )}

      {/* Sales View */}
      {historyView === 'sales' && (
        <div>
          <button onClick={() => setHistoryView('daily')} style={S.backLink}>← Back</button>
          <h4>🧾 Sales Bills - {fmtDate(selectedDate)}</h4>
          {getDateBills().length === 0 ? <p style={S.empty}>No sales</p> : <>
            <div style={S.statsRow}>
              <div style={S.statBox}><span style={S.statLbl}>Bills</span><span style={S.statVal}>{getDateBills().length}</span></div>
              <div style={S.statBox}><span style={S.statLbl}>Total</span><span style={S.statVal}>Rs. {getDateBills().reduce((s, b) => s + b.total, 0).toLocaleString()}</span></div>
            </div>
            {getDateBills().map(b => (
              <div key={b.id} style={S.billItem}>
                <div style={S.billHdr}><span style={{ fontWeight: 'bold' }}>{b.table}{b.customerName && `, ${b.customerName}`}</span><span style={{ color: '#888' }}>{fmtTime(b.timestamp)}</span></div>
                <div style={S.billTags}>{b.items.slice(0,4).map((i,x) => <span key={x} style={S.billTag}>{i.name}</span>)}{b.items.length > 4 && <span style={S.billTag}>+{b.items.length-4}</span>}</div>
                <div style={S.billFoot}><span style={{ color: '#888' }}>{b.paymentMode}</span><span style={{ fontWeight: 'bold' }}>Rs. {b.total}</span></div>
              </div>
            ))}
          </>}
        </div>
      )}

      {/* Inventory View */}
      {historyView === 'inventory' && (
        <div>
          <button onClick={() => setHistoryView('daily')} style={S.backLink}>← Back</button>
          <h4>📦 Inventory - {fmtDate(selectedDate)}</h4>
          {getDateInv().length === 0 ? <p style={S.empty}>No inventory</p> : <>
            <div style={S.statsRow}>
              <div style={S.statBox}><span style={S.statLbl}>Entries</span><span style={S.statVal}>{getDateInv().length}</span></div>
              <div style={S.statBox}><span style={S.statLbl}>Total</span><span style={S.statVal}>Rs. {getDateInv().reduce((s,e) => s+(e.totalPrice||0), 0).toLocaleString()}</span></div>
            </div>
            {getDateInv().map(e => (
              <div key={e.id} style={S.invItem}>
                <div><span style={{ fontWeight: 'bold' }}>{e.item}</span> <span style={{ color: '#888' }}>×{fmtQty(e.quantity, e.unit)}</span></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 'bold' }}>Rs. {e.totalPrice?.toLocaleString()}</div><div style={{ color: '#888', fontSize: 12 }}>{e.entryUser}</div></div>
              </div>
            ))}
          </>}
        </div>
      )}

      {/* Staff View */}
      {historyView === 'staff' && (
        <div>
          <button onClick={() => setHistoryView('daily')} style={S.backLink}>← Back</button>
          <h4>👥 Staff Hours - {fmtDate(selectedDate)}</h4>
          {getDateTS().length === 0 ? <p style={S.empty}>No staff hours</p> : <>
            <div style={S.statsRow}>
              <div style={S.statBox}><span style={S.statLbl}>Entries</span><span style={S.statVal}>{getDateTS().length}</span></div>
              <div style={S.statBox}><span style={S.statLbl}>Total Hours</span><span style={S.statVal}>{getDateTS().reduce((s,e) => s+(e.hoursWorked||0), 0).toFixed(1)}h</span></div>
            </div>
            {getDateTS().map(e => (
              <div key={e.id} style={S.invItem}>
                <div><span style={{ fontWeight: 'bold' }}>{e.userName}</span></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 'bold' }}>{(e.hoursWorked || 0).toFixed(1)}h</div><div style={{ color: '#888', fontSize: 12 }}>{fmtTime(e.clockIn)} - {e.clockOut ? fmtTime(e.clockOut) : 'Active'}</div></div>
              </div>
            ))}
          </>}
        </div>
      )}

      {/* Email Recipients View */}
      {historyView === 'emailRecipients' && (
        <div>
          <button onClick={() => setHistoryView(null)} style={S.backLink}>← Back</button>
          <h4>✉️ Daily Summary Email Recipients</h4>
          <p style={{ color: '#888', marginBottom: 15 }}>These emails will receive daily summary when a day is ended.</p>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input 
              type="email" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              placeholder="Add email address" 
              style={{ ...S.datePick, flex: 1 }}
            />
            <button onClick={addEmailRecipient} style={{ ...S.genBtn, padding: '10px 20px' }}>Add</button>
          </div>

          {emailRecipients.length === 0 ? (
            <p style={S.empty}>No email recipients configured</p>
          ) : (
            <div>
              {emailRecipients.map((email, idx) => (
                <div key={idx} style={{ ...S.invItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{email}</span>
                  <button onClick={() => deleteEmailRecipient(email)} style={{ background: '#5a2d2d', border: 'none', color: '#f87171', padding: '5px 10px', borderRadius: 5, cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const S = {
  card: { background: '#2d2d2d', borderRadius: 12, padding: 20 },
  histTabs: { display: 'flex', flexDirection: 'column', gap: 10 },
  histTabBtn: { background: '#3d3d3d', border: '1px solid #555', borderRadius: 8, padding: 15, color: '#fff', fontSize: 16, cursor: 'pointer', textAlign: 'left' },
  backLink: { background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', marginBottom: 15, padding: 0, fontSize: 14 },
  dateSec: { marginBottom: 20 },
  datePick: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #555', background: '#1e1e1e', color: '#fff', marginTop: 5 },
  histOpts: { display: 'flex', flexDirection: 'column', gap: 10 },
  histOptBtn: { background: '#3d3d3d', border: '1px solid #555', borderRadius: 8, padding: 12, color: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  optCount: { background: '#555', padding: '2px 8px', borderRadius: 10, fontSize: 12 },
  empty: { color: '#888', textAlign: 'center', padding: 20 },
  emptySmall: { color: '#666', fontSize: 12, margin: '5px 0' },
  dateRange: { display: 'flex', gap: 15, marginBottom: 20 },
  dateInp: { flex: 1 },
  itemSec: { marginBottom: 20 },
  secLbl: { display: 'block', marginBottom: 10, color: '#888' },
  itemGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  itemBtn: { padding: '8px 12px', borderRadius: 6, border: '1px solid #555', color: '#fff', cursor: 'pointer', fontSize: 13 },
  selCount: { marginTop: 10, color: '#888', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  clearBtn: { background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' },
  genBtn: { width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#2d5a2d', color: '#fff', fontSize: 16, cursor: 'pointer' },
  rptSec: { marginTop: 20, background: '#1e1e1e', borderRadius: 8, padding: 15 },
  rptHdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  rptRange: { color: '#888', fontSize: 12 },
  rptSum: { display: 'flex', gap: 15, marginBottom: 15 },
  rptBox: { flex: 1, background: '#2d2d2d', padding: 12, borderRadius: 8, textAlign: 'center' },
  rptLbl: { display: 'block', color: '#888', fontSize: 12, marginBottom: 5 },
  rptVal: { fontSize: 18, fontWeight: 'bold' },
  rptItems: { display: 'flex', flexDirection: 'column', gap: 10 },
  rptItem: { background: '#2d2d2d', borderRadius: 8, padding: 12 },
  rptItemHdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  rptItemName: { fontWeight: 'bold' },
  rptItemStats: { display: 'flex', gap: 15, alignItems: 'center' },
  rptItemQty: { color: '#888' },
  rptItemRev: { fontWeight: 'bold', color: '#4ade80' },
  dailyBrk: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #444' },
  dailyRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 },
  dailyDt: { color: '#888' },
  dailyQty: { color: '#888' },
  dailyRev: { color: '#4ade80' },
  netBan: { padding: 20, borderRadius: 8, border: '1px solid', textAlign: 'center', marginBottom: 20 },
  netLbl: { display: 'block', marginBottom: 5 },
  netAmt: { fontSize: 28, fontWeight: 'bold' },
  sumCols: { display: 'flex', gap: 15 },
  sumCol: { flex: 1, background: '#1e1e1e', borderRadius: 8, overflow: 'hidden' },
  colHdr: { background: '#1e3d1e', padding: 10, fontWeight: 'bold', display: 'flex', gap: 8, alignItems: 'center' },
  colBody: { padding: 10 },
  colTot: { background: '#1e3d1e', padding: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' },
  secTitle: { color: '#888', fontSize: 12, marginBottom: 5, textTransform: 'uppercase' },
  sumItem: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 },
  subRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #333', marginTop: 5, color: '#888', fontSize: 12 },
  statsRow: { display: 'flex', gap: 15, marginBottom: 15 },
  statBox: { flex: 1, background: '#1e1e1e', padding: 12, borderRadius: 8, textAlign: 'center' },
  statLbl: { display: 'block', color: '#888', fontSize: 12 },
  statVal: { fontSize: 20, fontWeight: 'bold' },
  billItem: { background: '#1e1e1e', borderRadius: 8, padding: 12, marginBottom: 10 },
  billHdr: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  billTags: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  billTag: { background: '#333', padding: '2px 8px', borderRadius: 4, fontSize: 12 },
  billFoot: { display: 'flex', justifyContent: 'space-between' },
  invItem: { background: '#1e1e1e', borderRadius: 8, padding: 12, marginBottom: 10, display: 'flex', justifyContent: 'space-between' },
}

export default AdminHistoryView