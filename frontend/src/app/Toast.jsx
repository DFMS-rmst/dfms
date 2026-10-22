import { useEffect, useState } from 'react';
import { subscribeToast } from './toast.js';

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToast((toastItem) => {
      setToasts((prev) => [...prev, toastItem]);

      if (toastItem.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastItem.id));
        }, toastItem.duration);
      }
    });

    return unsubscribe;
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <aside
      className="dfms-toast-container"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        maxWidth: '420px',
        width: 'calc(100% - 2.5rem)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((item) => {
        const isSuccess = item.type === 'success';
        const isError = item.type === 'error';
        const isWarning = item.type === 'warning';

        const borderColor = isSuccess
          ? '#10b981'
          : isError
            ? '#ef4444'
            : isWarning
              ? '#f59e0b'
              : '#3b82f6';
        const icon = isSuccess ? '✅' : isError ? '❌' : isWarning ? '⚠️' : 'ℹ️';

        return (
          <div
            key={item.id}
            className={`dfms-toast-item dfms-toast-${item.type}`}
            role="status"
            style={{
              pointerEvents: 'auto',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '0.85rem',
              border: '1px solid #e2e8f0',
              borderLeft: `5px solid ${borderColor}`,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              padding: '0.9rem 1.1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              animation: 'dfmsToastSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                fontSize: '1.2rem',
                lineHeight: 1,
                flexShrink: 0,
                marginTop: '0.1rem',
              }}
            >
              {icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: isSuccess
                    ? '#065f46'
                    : isError
                      ? '#991b1b'
                      : isWarning
                        ? '#92400e'
                        : '#1e40af',
                  marginBottom: '0.15rem',
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#334155',
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                }}
              >
                {item.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              aria-label="Close notification"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '0.2rem',
                lineHeight: 1,
                borderRadius: '0.4rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              ✕
            </button>
          </div>
        );
      })}
    </aside>
  );
}
