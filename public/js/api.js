// Centralized API Client & Token Management

const API_BASE = '/api';

const TokenService = {
  get: () => localStorage.getItem('sms_auth_token'),
  set: (token) => localStorage.setItem('sms_auth_token', token),
  clear: () => localStorage.removeItem('sms_auth_token'),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('sms_user_data'));
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('sms_user_data', JSON.stringify(user)),
  clearUser: () => localStorage.removeItem('sms_user_data')
};

async function apiRequest(endpoint, options = {}) {
  const token = TokenService.get();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      if (data.message && data.message.includes('expired') || data.message.includes('denied')) {
        // Expired or unauthorized
        TokenService.clear();
        TokenService.clearUser();
        showAuthScreen();
      }
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error on [${endpoint}]:`, error);
    throw error;
  }
}

// Toast Notifications
function showToast(message, type = 'primary') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'danger') icon = 'fa-circle-exclamation';
  if (type === 'warning') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
