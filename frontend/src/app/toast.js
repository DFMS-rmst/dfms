// Singleton toast listener registry
const listeners = new Set();

function broadcastToast(toastItem) {
  listeners.forEach((fn) => {
    try {
      fn(toastItem);
    } catch (err) {
      console.error('Toast broadcast error:', err);
    }
  });
}

export const toast = {
  success: (message, options = {}) => {
    broadcastToast({
      id: Math.random().toString(36).substring(2, 9),
      type: 'success',
      message: typeof message === 'string' ? message : String(message),
      title: options.title || 'Success',
      duration: options.duration || 3500,
    });
  },
  error: (message, options = {}) => {
    broadcastToast({
      id: Math.random().toString(36).substring(2, 9),
      type: 'error',
      message: typeof message === 'string' ? message : String(message),
      title: options.title || 'Attention',
      duration: options.duration || 5000,
    });
  },
  info: (message, options = {}) => {
    broadcastToast({
      id: Math.random().toString(36).substring(2, 9),
      type: 'info',
      message: typeof message === 'string' ? message : String(message),
      title: options.title || 'Information',
      duration: options.duration || 3500,
    });
  },
  warning: (message, options = {}) => {
    broadcastToast({
      id: Math.random().toString(36).substring(2, 9),
      type: 'warning',
      message: typeof message === 'string' ? message : String(message),
      title: options.title || 'Notice',
      duration: options.duration || 4500,
    });
  },
};

export function subscribeToast(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
