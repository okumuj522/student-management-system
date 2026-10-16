// Authentication handling & role-based UI control

let currentUser = null;

function initAuth() {
  const token = TokenService.get();
  const savedUser = TokenService.getUser();

  if (token && savedUser) {
    currentUser = savedUser;
    showAppLayout();
    applyRoleUI(currentUser.role);
    initApp();
  } else {
    showAuthScreen();
  }
}

function showAuthScreen() {
  document.getElementById('auth-container').classList.remove('hidden');
  document.getElementById('main-layout').classList.add('hidden');
}

function showAppLayout() {
  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('main-layout').classList.remove('hidden');

  if (currentUser) {
    // Populate user profile info in topbar and sidebar
    document.getElementById('sidebar-user-name').textContent = currentUser.full_name || currentUser.username;
    document.getElementById('sidebar-user-role').textContent = currentUser.role.toUpperCase();
    document.getElementById('topbar-name').textContent = currentUser.full_name || currentUser.username;

    const initials = (currentUser.full_name || currentUser.username)
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    document.getElementById('sidebar-user-avatar').textContent = initials;
    document.getElementById('topbar-avatar').textContent = initials;
  }
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  } else {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  }
}

function fillDemoCredentials(role) {
  switchAuthTab('login');
  const identifierInput = document.getElementById('login-identifier');
  const passwordInput = document.getElementById('login-password');

  if (role === 'admin') {
    identifierInput.value = 'admin@sms.edu';
    passwordInput.value = 'Ocholla@';
  } else if (role === 'teacher') {
    identifierInput.value = 'teacher@sms.edu';
    passwordInput.value = 'teacher123';
  } else if (role === 'student') {
    identifierInput.value = 'student@sms.edu';
    passwordInput.value = 'student123';
  }
  showToast(`Auto-filled ${role.toUpperCase()} credentials. Click 'Sign In' to enter!`, 'primary');
}

async function handleLogin(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('login-submit-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

  const identifier = document.getElementById('login-identifier').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });

    if (res.success) {
      TokenService.set(res.token);
      TokenService.setUser(res.user);
      currentUser = res.user;

      showToast(`Welcome back, ${res.user.full_name}!`, 'success');
      showAppLayout();
      applyRoleUI(res.user.role);
      initApp();
    }
  } catch (error) {
    showToast(error.message || 'Login failed. Please verify credentials.', 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('register-submit-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';

  const full_name = document.getElementById('reg-fullname').value;
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;

  try {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, username, email, password, role })
    });

    if (res.success) {
      TokenService.set(res.token);
      TokenService.setUser(res.user);
      currentUser = res.user;

      showToast('Registration successful! Welcome aboard.', 'success');
      showAppLayout();
      applyRoleUI(res.user.role);
      initApp();
    }
  } catch (error) {
    showToast(error.message || 'Registration failed.', 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

function handleLogout() {
  TokenService.clear();
  TokenService.clearUser();
  currentUser = null;
  showToast('Logged out successfully.', 'primary');
  showAuthScreen();
}

function applyRoleUI(role) {
  // Reset all role visibility
  document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll('.teacher-only').forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll('.student-only').forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll('.sidebar-fees-link').forEach(el => el.classList.remove('hidden'));

  if (role === 'admin') {
    // Admin sees everything except student-only personal views
    document.querySelectorAll('.student-only:not(.admin-only)').forEach(el => el.classList.add('hidden'));
  } else if (role === 'teacher') {
    // Teacher sees teacher actions, courses, students, attendance, grades
    document.querySelectorAll('.admin-only:not(.teacher-only)').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.student-only').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-fees-link').forEach(el => el.classList.add('hidden'));
  } else if (role === 'student') {
    // Student sees their courses, grades, personal fees, announcements
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.teacher-only').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-fees-link').forEach(el => el.classList.remove('hidden'));
  }
}
