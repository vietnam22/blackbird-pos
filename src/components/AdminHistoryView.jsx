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

  const toggleItem = (n) => { setSelectedItems(p => p.includes(n) ? p.filter(i => i !== n) : [...p, n]); setSalesReport(null) }

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
          {getDateTS().length === 0 ? <p style={S.empty}>No shifts</p> : <>
            <div style={S.statsRow}>
              <div style={S.statBox}><span style={S.statLbl}>Shifts</span><span style={S.statVal}>{getDateTS().length}</span></div>
              <div style={S.statBox}><span style={S.statLbl}>Hours</span><span style={S.statVal}>{getDateTS().reduce((s,e) => s+(e.hoursWorked||0), 0).toFixed(1)}h</span></div>
            </div>
            {getDateTS().map(e => (
              <div key={e.id} style={S.staffItem}>
                <span style={{ fontWeight: 'bold' }}>{e.userName}</span>
                <span style={{ color: '#888' }}>{fmtTime(e.clockIn)} - {e.clockOut ? fmtTime(e.clockOut) : 'Active'}</span>
                <span style={{ fontWeight: 'bold' }}>{e.hoursWorked?.toFixed(1) || '-'}h {e.autoClockOut && <span style={S.autoTag}>Auto</span>}</span>
              </div>
            ))}
          </>}
        </div>
      )}

      {/* Email Recipients View */}
      {historyView === 'emailRecipients' && (
        <div>
          <button onClick={() => setHistoryView(null)} style={S.backLink}>← Back</button>
          <h4>✉️ Daily Summary Emails</h4>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>
            These emails receive daily summary when the day starts and ends.
          </p>
          
          <div style={S.emailInputRow}>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Enter email address"
              style={S.emailInput}
              onKeyDown={e => e.key === 'Enter' && addEmailRecipient()}
            />
            <button onClick={addEmailRecipient} style={S.addEmailBtn}>Add</button>
          </div>

          {emailRecipients.length === 0 ? (
            <p style={S.empty}>No email recipients configured</p>
          ) : (
            <div style={S.emailList}>
              {emailRecipients.map(email => (
                <div key={email} style={S.emailItem}>
                  <span style={S.emailText}>{email}</span>
                  <button onClick={() => deleteEmailRecipient(email)} style={S.deleteEmailBtn}>✕</button>
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
  card: { background: '#2a2a2a', borderRadius: 12, padding: 20 },
  backLink: { background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, marginBottom: 15, padding: 0 },
  histTabs: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15 },
  histTabBtn: { padding: '15px 20px', background: '#333', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 16, cursor: 'pointer', textAlign: 'left' },
  dateSec: { display: 'flex', alignItems: 'center', gap: 15, marginTop: 15, marginBottom: 20 },
  datePick: { padding: '10px 15px', border: '1px solid #555', borderRadius: 8, background: '#333', color: '#fff', fontSize: 16, cursor: 'pointer', width: '100%', marginTop: 5, boxSizing: 'border-box' },
  histOpts: { display: 'flex', flexDirection: 'column', gap: 10 },
  histOptBtn: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#333', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 16, cursor: 'pointer' },
  optCount: { background: '#444', padding: '4px 10px', borderRadius: 12, fontSize: 13, color: '#aaa' },
  empty: { color: '#666', textAlign: 'center', padding: 30 },
  emptySmall: { color: '#666', fontSize: 13, padding: '10px 0', margin: 0 },
  dateRange: { display: 'flex', gap: 15, marginBottom: 20 },
  dateInp: { flex: 1 },
  itemSec: { marginBottom: 20 },
  secLbl: { display: 'block', color: '#888', fontSize: 12, textTransform: 'uppercase', marginBottom: 10 },
  itemGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 },
  itemBtn: { padding: '10px 12px', border: '2px solid #555', borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer', textAlign: 'left' },
  selCount: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, color: '#888', fontSize: 13 },
  clearBtn: { background: '#444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  genBtn: { width: '100%', padding: 15, background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' },
  rptSec: { marginTop: 20, background: '#333', borderRadius: 12, overflow: 'hidden' },
  rptHdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#2d4a3e' },
  rptRange: { color: '#aaa', fontSize: 13 },
  rptSum: { display: 'flex', gap: 10, padding: 15 },
  rptBox: { flex: 1, background: '#2a2a2a', padding: 15, borderRadius: 8, textAlign: 'center' },
  rptLbl: { display: 'block', color: '#888', fontSize: 12, marginBottom: 5 },
  rptVal: { fontSize: 20, fontWeight: 'bold' },
  rptItems: { padding: '0 15px 15px' },
  rptItem: { background: '#2a2a2a', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  rptItemHdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px' },
  rptItemName: { fontWeight: 'bold', fontSize: 16 },
  rptItemStats: { display: 'flex', gap: 15, alignItems: 'center' },
  rptItemQty: { color: '#888' },
  rptItemRev: { color: '#4ade80', fontWeight: 'bold' },
  dailyBrk: { background: '#383838', padding: '10px 15px' },
  dailyRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 },
  dailyDt: { color: '#888', flex: 1 },
  dailyQty: { color: '#aaa', marginRight: 15 },
  dailyRev: { color: '#4ade80', minWidth: 80, textAlign: 'right' },
  netBan: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 12, border: '2px solid', marginBottom: 20, marginTop: 15 },
  netLbl: { fontSize: 18, fontWeight: 'bold' },
  netAmt: { fontSize: 28, fontWeight: 'bold' },
  sumCols: { display: 'flex', gap: 15, flexWrap: 'wrap' },
  sumCol: { flex: 1, minWidth: 280, background: '#333', borderRadius: 12, overflow: 'hidden' },
  colHdr: { background: '#1e3d1e', padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 'bold', fontSize: 14 },
  colBody: { padding: 15, maxHeight: 350, overflowY: 'auto' },
  colTot: { background: '#1e3d1e', padding: 15, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' },
  secTitle: { color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, borderBottom: '1px solid #444', paddingBottom: 5 },
  sumItem: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 },
  subRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#888', marginTop: 10, paddingTop: 10, borderTop: '1px dashed #444' },
  statsRow: { display: 'flex', gap: 15, marginBottom: 20, marginTop: 15 },
  statBox: { flex: 1, background: '#333', padding: 15, borderRadius: 8, textAlign: 'center' },
  statLbl: { display: 'block', color: '#888', fontSize: 12, marginBottom: 5 },
  statVal: { fontSize: 20, fontWeight: 'bold' },
  billItem: { background: '#333', padding: 15, borderRadius: 8, marginBottom: 10 },
  billHdr: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  billTags: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  billTag: { background: '#444', padding: '3px 8px', borderRadius: 4, fontSize: 12 },
  billFoot: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #444', paddingTop: 10 },
  invItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333', padding: '12px 15px', borderRadius: 8, marginBottom: 8 },
  staffItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333', padding: '12px 15px', borderRadius: 8, marginBottom: 8 },
  autoTag: { background: '#5a4a2d', color: '#fbbf24', padding: '2px 6px', borderRadius: 4, fontSize: 10, marginLeft: 5 },
  emailInputRow: { display: 'flex', gap: 10, marginBottom: 20 },
  emailInput: { flex: 1, padding: '12px 15px', border: '1px solid #555', borderRadius: 8, background: '#333', color: '#fff', fontSize: 16 },
  addEmailBtn: { padding: '12px 20px', background: '#2d5a2d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 'bold' },
  emailList: { display: 'flex', flexDirection: 'column', gap: 8 },
  emailItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333', padding: '12px 15px', borderRadius: 8 },
  emailText: { color: '#fff', fontSize: 15 },
  deleteEmailBtn: { background: '#5a2d2d', color: '#f87171', border: 'none', width: 32, height: 32, borderRadius: 6, cursor: 'pointer', fontSize: 16 },
}

export default AdminHistoryView