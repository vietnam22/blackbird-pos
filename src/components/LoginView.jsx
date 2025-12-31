import { useState, useEffect, useRef } from 'react'

function LoginView({ onLogin, dayStatus }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const isDayActive = dayStatus?.currentDay !== null

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handlePinChange = (value) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 4)
    setPin(cleaned)
    setError('')
  }

  const handlePinClick = (digit) => {
    if (pin.length < 4) {
      handlePinChange(pin + digit)
    }
  }

  const handleClear = () => {
    setPin('')
    setError('')
    inputRef.current?.focus()
  }

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('Enter 4-digit PIN')
      return
    }
    
    const success = await onLogin(pin)
    if (!success) {
      setError('Invalid PIN')
      setPin('')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>🐦‍⬛ Blackbird</h1>
        
        <div style={styles.statusBadge(isDayActive)}>
          {isDayActive ? '🟢 Shop Open' : '🔴 Shop Closed'}
        </div>

        {/* Hidden input for keyboard entry */}
        <input
          ref={inputRef}
          type="password"
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.hiddenInput}
          autoFocus
          maxLength={4}
        />

        {/* Visual PIN display */}
        <div style={styles.pinDisplay} onClick={() => inputRef.current?.focus()}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={styles.pinDot(pin.length > i)}>
              {pin.length > i ? '●' : '○'}
            </div>
          ))}
        </div>

        <p style={styles.hint}>Type PIN or tap keypad</p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '→'].map(key => (
            <button
              key={key}
              onClick={() => {
                if (key === 'C') handleClear()
                else if (key === '→') handleSubmit()
                else handlePinClick(String(key))
              }}
              style={{
                ...styles.key,
                ...(key === 'C' ? styles.clearKey : {}),
                ...(key === '→' ? styles.enterKey : {}),
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a1a',
  },
  loginBox: {
    background: '#2a2a2a',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
    minWidth: '320px',
  },
  title: {
    marginBottom: '10px',
  },
  statusBadge: (isActive) => ({
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    marginBottom: '30px',
    background: isActive ? '#1e3d1e' : '#3d1e1e',
    color: isActive ? '#4ade80' : '#f87171',
  }),
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
  },
  pinDisplay: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '10px',
    cursor: 'pointer',
  },
  pinDot: (filled) => ({
    fontSize: '24px',
    color: filled ? '#fff' : '#555',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  hint: {
    color: '#666',
    fontSize: '12px',
    marginBottom: '15px',
  },
  error: {
    color: '#f87171',
    marginBottom: '15px',
    fontSize: '14px',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    maxWidth: '240px',
    margin: '0 auto',
  },
  key: {
    padding: '20px',
    fontSize: '20px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    background: '#3d3d3d',
    color: '#fff',
    cursor: 'pointer',
  },
  clearKey: {
    background: '#5a3d3d',
  },
  enterKey: {
    background: '#3d5a3d',
  },
}

export default LoginView