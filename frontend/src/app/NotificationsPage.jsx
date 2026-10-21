import { useEffect, useState } from 'react';
import { api } from './api.js';

export function NotificationsPage({ user, workspace, onNavigate }) {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
  const [typeFilter, setTypeFilter] = useState('ALL');

  async function loadAlerts() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      const res = await api(`/alerts?${params.toString()}`);
      setAlerts(res.data?.alerts || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, typeFilter]);

  async function markAsRead(id) {
    try {
      await api(`/alerts/${id}/read`, { method: 'PATCH' });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'READ', readAt: new Date().toISOString() } : a)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  }

  async function markAllAsRead() {
    try {
      await api('/alerts/read-all', { method: 'PATCH' });
      setAlerts((prev) => prev.map((a) => ({ ...a, status: 'READ', readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }

  function handleDestination(alert) {
    if (!onNavigate) return;
    if (alert.entityType === 'VeterinaryCase' || alert.entityType === 'TreatmentRequest') {
      onNavigate('veterinary-care');
    } else if (
      alert.entityType === 'DailyFarmEligibilityEvaluation' ||
      alert.entityType === 'DailyMilkCollectionClearance'
    ) {
      onNavigate('daily-clearance');
    } else if (alert.entityType === 'MilkEligibilityCheck') {
      onNavigate('core-engine');
    }
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Notifications</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
            Operational alerts, veterinary requests, and milk eligibility updates
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#f9fafb',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          padding: '0.75rem',
          background: '#f9fafb',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'UNREAD', 'READ'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === st ? '#2563eb' : '#ffffff',
                color: statusFilter === st ? '#ffffff' : '#374151',
                boxShadow: statusFilter === st ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {st === 'ALL' ? 'All' : st === 'UNREAD' ? `Unread (${unreadCount})` : 'Read'}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: '#ffffff',
            fontSize: '0.85rem',
          }}
        >
          <option value="ALL">All Categories</option>
          <option value="NEW_TREATMENT_REQUEST">Treatment Requests</option>
          <option value="TREATMENT_REQUEST_ACCEPTED">Accepted Requests</option>
          <option value="NEW_CASE_MESSAGE">Case Messages</option>
          <option value="DAILY_ELIGIBILITY_READY">Daily Milk Clearances</option>
          <option value="ANIMAL_ELIGIBLE_FOR_MILK">Animal Eligibility</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', borderRadius: '6px', background: '#fef2f2', color: '#991b1b', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading && <p>Loading notifications…</p>}

      {!loading && alerts.length === 0 && (
        <article className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No notifications found</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {statusFilter === 'UNREAD'
              ? 'You have caught up with all your notifications!'
              : 'No operational alerts match the selected criteria.'}
          </p>
        </article>
      )}

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {alerts.map((alert) => {
          const isUnread = alert.status === 'UNREAD';
          return (
            <article
              key={alert.id}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                borderLeft: isUnread ? '4px solid #2563eb' : '4px solid transparent',
                background: isUnread ? '#f8fafc' : '#ffffff',
                padding: '1rem',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  {isUnread && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#2563eb',
                        display: 'inline-block',
                      }}
                      title="Unread notification"
                    />
                  )}
                  <strong style={{ fontSize: '0.95rem', color: isUnread ? '#0f172a' : '#475569' }}>
                    {alert.title}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      background: '#f1f5f9',
                      color: '#475569',
                      fontWeight: 500,
                    }}
                  >
                    {alert.type?.replaceAll('_', ' ')}
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0 0.5rem 0', color: '#334155', fontSize: '0.9rem' }}>
                  {alert.message}
                </p>
                <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                  {new Date(alert.createdAt).toLocaleString()}
                </small>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => handleDestination(alert)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    View Details →
                  </button>
                )}
                {isUnread && (
                  <button
                    type="button"
                    onClick={() => markAsRead(alert.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#e2e8f0',
                      color: '#334155',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
