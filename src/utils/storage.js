const STORAGE_KEYS = {
  COMPLETED_BILLS: 'blackbird_completed_bills',
  OPEN_TABS: 'blackbird_open_tabs',
}

export const storage = {
  // Completed Bills
  getCompletedBills: () => {
    const data = localStorage.getItem(STORAGE_KEYS.COMPLETED_BILLS)
    return data ? JSON.parse(data) : []
  },

  saveCompletedBills: (bills) => {
    localStorage.setItem(STORAGE_KEYS.COMPLETED_BILLS, JSON.stringify(bills))
  },

  // Open Tabs
  getOpenTabs: () => {
    const data = localStorage.getItem(STORAGE_KEYS.OPEN_TABS)
    return data ? JSON.parse(data) : {}
  },

  saveOpenTabs: (tabs) => {
    localStorage.setItem(STORAGE_KEYS.OPEN_TABS, JSON.stringify(tabs))
  },

  // Clear all (for testing)
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEYS.COMPLETED_BILLS)
    localStorage.removeItem(STORAGE_KEYS.OPEN_TABS)
  },
}