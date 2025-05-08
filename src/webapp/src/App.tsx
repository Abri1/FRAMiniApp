import { useEffect, useState, useRef } from 'react'
import './App.css'
import viteLogo from '/vite.svg';

interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface Alert {
  id: number;
  pair: string;
  condition: string;
  value: number;
}

// Simple Toast component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      background: type === 'success' ? '#229ed9' : '#e74c3c',
      color: '#fff',
      padding: '0.8em 1.5em',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      zIndex: 9999,
      fontWeight: 600,
      fontSize: '1em',
      minWidth: 180,
      textAlign: 'center',
      cursor: 'pointer',
    }} onClick={onClose}>
      {message}
    </div>
  );
}

// Modal for create/edit alert
function AlertModal({
  open,
  onClose,
  onSubmit,
  initial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { pair: string; direction: string; target_price: number }) => void;
  initial?: { pair: string; direction: string; target_price: number };
  loading: boolean;
}) {
  const [pair, setPair] = useState(initial?.pair || '');
  const [direction, setDirection] = useState(initial?.direction || 'above');
  const [targetPrice, setTargetPrice] = useState(initial?.target_price?.toString() || '');
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open && firstInput.current) firstInput.current.focus();
    if (open && initial) {
      setPair(initial.pair);
      setDirection(initial.direction);
      setTargetPrice(initial.target_price.toString());
    } else if (open) {
      setPair('');
      setDirection('above');
      setTargetPrice('');
    }
  }, [open, initial]);
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.25)',
      zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <form
        style={{ background: 'var(--tg-bg)', color: 'var(--tg-fg)', borderRadius: 12, padding: 24, minWidth: 260, boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}
        onSubmit={e => { e.preventDefault(); onSubmit({ pair, direction, target_price: parseFloat(targetPrice) }); }}
      >
        <h3 style={{ marginTop: 0 }}>{initial ? 'Edit Alert' : 'Create Alert'}</h3>
        <div style={{ marginBottom: 12 }}>
          <label>Pair<br />
            <input ref={firstInput} value={pair} onChange={e => setPair(e.target.value)} required style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--tg-border)' }} placeholder="e.g. EURUSD" />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Direction<br />
            <select value={direction} onChange={e => setDirection(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--tg-border)' }}>
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </label>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label>Target Price<br />
            <input value={targetPrice} onChange={e => setTargetPrice(e.target.value)} required type="number" step="any" style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--tg-border)' }} placeholder="e.g. 1.1000" />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ background: 'var(--tg-muted)', color: '#fff' }}>Cancel</button>
          <button type="submit" disabled={loading}>{initial ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  );
}

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [modal, setModal] = useState<{ type: 'create' | 'edit'; alert?: Alert } | null>(null);

  // Helper to get Telegram initData
  const getInitData = () => (window as any).Telegram?.WebApp?.initData;

  // Fetch alerts from backend API
  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const initData = getInitData();
      if (!initData) {
        setError('Not running inside Telegram Mini App.');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/alerts', {
        method: 'GET',
        headers: { 'x-telegram-initdata': initData },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to fetch alerts');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setAlerts(data.alerts || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch alerts');
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  // Replace handleCreate with modal
  const handleCreate = () => setModal({ type: 'create' });

  // Replace handleEdit with modal
  const handleEdit = (id: number) => {
    const alert = alerts.find(a => a.id === id);
    if (alert) setModal({ type: 'edit', alert });
  };

  // Delete alert
  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this alert?')) return;
    setLoading(true);
    setError(null);
    try {
      const initData = getInitData();
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
        headers: { 'x-telegram-initdata': initData },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete alert');
        setToast({ message: data.error || 'Failed to delete alert', type: 'error' });
      } else {
        setToast({ message: 'Alert deleted', type: 'success' });
      }
      await fetchAlerts();
    } catch (err) {
      setError('Failed to delete alert');
      setToast({ message: 'Failed to delete alert', type: 'error' });
      setLoading(false);
    }
  };

  // Handle modal submit for create/edit
  const handleModalSubmit = async (data: { pair: string; direction: string; target_price: number }) => {
    setLoading(true);
    setError(null);
    try {
      const initData = getInitData();
      let res;
      if (modal?.type === 'edit' && modal.alert) {
        res = await fetch(`/api/alerts/${modal.alert.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-initdata': initData,
          },
          body: JSON.stringify(data),
        });
      } else {
        res = await fetch('/api/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-initdata': initData,
          },
          body: JSON.stringify({ ...data, delivery_type: 'telegram', active: true }),
        });
      }
      if (!res.ok) {
        const resp = await res.json().catch(() => ({}));
        setError(resp.error || 'Failed to save alert');
        setToast({ message: resp.error || 'Failed to save alert', type: 'error' });
      } else {
        setToast({ message: modal?.type === 'edit' ? 'Alert updated' : 'Alert created', type: 'success' });
      }
      setModal(null);
      await fetchAlerts();
    } catch (err) {
      setError('Failed to save alert');
      setToast({ message: 'Failed to save alert', type: 'error' });
      setLoading(false);
    }
  };

  if (loading) return <div className="alerts-page"><p>Loading alerts...</p></div>;
  if (error) return <div className="alerts-page"><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div className="alerts-page">
      <h2>Alerts</h2>
      <button onClick={handleCreate}>+ Create Alert</button>
      {loading && <p>Loading alerts...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {alerts.length === 0 && !loading && !error && (
        <p style={{ color: '#888', marginTop: '2em' }}>No alerts yet. Click "+ Create Alert" to add one.</p>
      )}
      {alerts.length > 0 && (
        <ul>
          {alerts.map(alert => (
            <li key={alert.id} style={{ margin: '1em 0', padding: '1em', border: '1px solid #eee', borderRadius: 8 }}>
              <strong>{alert.pair}</strong> {alert.condition} <b>{alert.value}</b>
              <div style={{ float: 'right' }}>
                <button onClick={() => handleEdit(alert.id)} style={{ marginRight: 8 }}>Edit</button>
                <button onClick={() => handleDelete(alert.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AlertModal
        open={!!modal}
        onClose={() => setModal(null)}
        onSubmit={handleModalSubmit}
        initial={modal?.type === 'edit' && modal.alert ? {
          pair: modal.alert.pair,
          direction: modal.alert.condition,
          target_price: modal.alert.value,
        } : undefined}
        loading={loading}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// AccountInfoPage: Scaffold for Account Info UI
function AccountInfoPage({ user }: { user: TelegramUser | null }) {
  return (
    <div className="account-info-page">
      <h2>Account Info</h2>
      {user ? (
        <ul>
          <li><b>User ID:</b> {user.id}</li>
          {user.username && <li><b>Username:</b> @{user.username}</li>}
          {user.language_code && <li><b>Language:</b> {user.language_code}</li>}
          {user.is_premium && <li><b>Premium:</b> Yes</li>}
          {user.photo_url && <li><img src={user.photo_url} alt="Profile" style={{ width: 48, borderRadius: '50%' }} /></li>}
        </ul>
      ) : (
        <p>No user info available.</p>
      )}
    </div>
  );
}

// InfoHelpPage: Scaffold for Info/Help UI
function InfoHelpPage() {
  return (
    <div className="info-help-page">
      <h2>Info & Help</h2>
      <p>This is the Forex Ring Alerts Mini App for Telegram.</p>
      <ul>
        <li>Manage your forex price alerts</li>
        <li>Get notified instantly in Telegram</li>
        <li>Contact support: <a href="mailto:support@example.com">support@example.com</a></li>
      </ul>
    </div>
  );
}

// Minimal tab navigation for main pages
const TABS = [
  { key: 'alerts', label: 'Alerts' },
  { key: 'account', label: 'Account' },
  { key: 'info', label: 'Info' },
];

function App() {
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [isTelegram, setIsTelegram] = useState<boolean>(false)
  const [tab, setTab] = useState<'alerts' | 'account' | 'info'>('alerts');

  useEffect(() => {
    // Check for Telegram WebApp context
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      setIsTelegram(true)
      // Extract user info (for display)
      if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        setUser(tg.initDataUnsafe.user)
      }
      // Set theme based on Telegram Mini App theme
      const theme = tg.colorScheme || tg.themeParams?.theme || 'light';
      document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
      // Listen for theme changes
      tg.onEvent && tg.onEvent('themeChanged', () => {
        const newTheme = tg.colorScheme || tg.themeParams?.theme || 'light';
        document.body.setAttribute('data-theme', newTheme === 'dark' ? 'dark' : 'light');
      });
    } else {
      document.body.setAttribute('data-theme', 'light');
    }
  }, []);

  return (
    <div className="App">
      {/* Branded header with logo */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.7em',
        margin: '0.5em 0 1em 0',
      }}>
        <img
          src={viteLogo}
          alt="App Logo"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'var(--tg-bg)',
            border: '2px solid var(--tg-border)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        />
        <h1 style={{ fontSize: '1.3em', margin: 0, color: 'var(--tg-fg)' }}>
          Forex Ring Alerts
        </h1>
      </header>
      {!isTelegram && (
        <div style={{ color: 'red', margin: '1em 0' }}>
          <b>Warning:</b> This app must be opened inside Telegram as a Mini App.
        </div>
      )}
      {isTelegram && user && tab === 'account' && (
        <AccountInfoPage user={user} />
      )}
      {isTelegram && tab === 'alerts' && <AlertsPage />}
      {isTelegram && tab === 'info' && <InfoHelpPage />}
      {/* Minimal tab bar navigation */}
      {isTelegram && (
        <nav style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--tg-bg)',
          borderTop: '1px solid var(--tg-border)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '0.5em 0',
          zIndex: 100,
        }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'alerts' | 'account' | 'info')}
              style={{
                background: tab === t.key ? 'var(--tg-accent)' : 'transparent',
                color: tab === t.key ? '#fff' : 'var(--tg-fg)',
                border: 'none',
                padding: '0.5em 1em',
                fontWeight: tab === t.key ? 'bold' : 'normal',
                fontSize: '1em',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

export default App
