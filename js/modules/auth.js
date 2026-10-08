/**
 * MediCore Authentication Module
 * Demo-based authentication, session management, and route protection
 */

const AuthModule = {
  DEMO_EMAIL: 'admin@medicore.com',
  DEMO_PASSWORD: 'admin123',
  SESSION_KEY: 'medicore_auth_session',

  init() {
    this.attachEvents();
    this.checkInitialAuthState();
  },

  /**
   * Check if current user session exists
   */
  isAuthenticated() {
    try {
      const session = localStorage.getItem(this.SESSION_KEY);
      if (!session) return false;
      const parsed = JSON.parse(session);
      return parsed && parsed.email === this.DEMO_EMAIL;
    } catch (e) {
      return false;
    }
  },

  getSession() {
    try {
      const session = localStorage.getItem(this.SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Check authentication on page load and enforce page protection
   */
  checkInitialAuthState() {
    const loginScreen = document.getElementById('login-screen');
    const appShell = document.querySelector('.app-shell');

    if (this.isAuthenticated()) {
      if (loginScreen) loginScreen.classList.add('hidden');
      if (appShell) appShell.style.display = 'flex';
    } else {
      if (loginScreen) loginScreen.classList.remove('hidden');
      if (appShell) appShell.style.display = 'none';
    }
  },

  attachEvents() {
    // 1. Login Form Submit
    const form = document.getElementById('form-login');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLoginSubmit();
      });
    }

    // 2. Quick Fill Demo Credentials button
    const btnFill = document.getElementById('btn-fill-demo-creds');
    if (btnFill) {
      btnFill.addEventListener('click', (e) => {
        e.preventDefault();
        this.fillDemoCredentials();
      });
    }

    // 3. Password visibility toggle
    const btnTogglePwd = document.getElementById('btn-toggle-password-visibility');
    const pwdInput = document.getElementById('login-input-password');
    if (btnTogglePwd && pwdInput) {
      btnTogglePwd.addEventListener('click', () => {
        const isPassword = pwdInput.type === 'password';
        pwdInput.type = isPassword ? 'text' : 'password';
        btnTogglePwd.innerHTML = isPassword 
          ? '<i class="fa-solid fa-eye-slash"></i>' 
          : '<i class="fa-solid fa-eye"></i>';
      });
    }

    // 4. Sidebar Logout button
    const btnSidebarLogout = document.getElementById('btn-sidebar-logout');
    if (btnSidebarLogout) {
      btnSidebarLogout.addEventListener('click', () => {
        this.confirmAndLogout();
      });
    }

    // 5. Header Logout button
    const btnHeaderLogout = document.getElementById('btn-header-logout');
    if (btnHeaderLogout) {
      btnHeaderLogout.addEventListener('click', () => {
        this.confirmAndLogout();
      });
    }
  },

  fillDemoCredentials() {
    const emailInput = document.getElementById('login-input-email');
    const pwdInput = document.getElementById('login-input-password');
    const errorEl = document.getElementById('login-error-message');

    if (emailInput) emailInput.value = this.DEMO_EMAIL;
    if (pwdInput) pwdInput.value = this.DEMO_PASSWORD;
    if (errorEl) errorEl.style.display = 'none';

    toast.info('Demo credentials pre-filled. Click Sign In to proceed.', 'Quick Fill');
    
    // Focus submit button
    const submitBtn = document.getElementById('btn-login-submit');
    if (submitBtn) submitBtn.focus();
  },

  handleLoginSubmit() {
    const emailInput = document.getElementById('login-input-email');
    const pwdInput = document.getElementById('login-input-password');
    const rememberCheckbox = document.getElementById('login-remember-me');
    const errorAlert = document.getElementById('login-error-message');
    const errorText = document.getElementById('login-error-text');
    const submitBtn = document.getElementById('btn-login-submit');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = pwdInput ? pwdInput.value : '';

    // Validate demo credentials
    if (email === this.DEMO_EMAIL && password === this.DEMO_PASSWORD) {
      // Hide error alert
      if (errorAlert) errorAlert.style.display = 'none';

      // Visual button feedback
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Authenticating...';
        submitBtn.disabled = true;
      }

      setTimeout(() => {
        // Save session in localStorage
        const session = {
          email: this.DEMO_EMAIL,
          name: 'Pharm. Arjun M.',
          role: 'Licensed Incharge',
          branch: 'Indiranagar Main Branch',
          remember: rememberCheckbox ? rememberCheckbox.checked : true,
          token: 'demo-session-' + Date.now(),
          loggedInAt: new Date().toISOString()
        };

        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

        // Hide login, show app
        const loginScreen = document.getElementById('login-screen');
        const appShell = document.querySelector('.app-shell');

        if (loginScreen) loginScreen.classList.add('hidden');
        if (appShell) appShell.style.display = 'flex';

        // Reset submit button
        if (submitBtn) {
          submitBtn.innerHTML = '<span>Sign In to Dispensary</span> <i class="fa-solid fa-arrow-right"></i>';
          submitBtn.disabled = false;
        }

        // Navigate to dashboard and refresh statistics
        App.navigateTo('dashboard');
        toast.success('Welcome back, Arjun M. Session verified.', 'Access Granted');
      }, 400);

    } else {
      // Show error feedback
      if (errorAlert && errorText) {
        errorAlert.style.display = 'flex';
        errorText.textContent = 'Invalid credentials. Please use admin@medicore.com and admin123.';
      }
      toast.error('Invalid credentials. Check email and password.', 'Sign In Failed');
    }
  },

  async confirmAndLogout() {
    const confirmed = await modal.confirm({
      title: 'Sign Out of MediCore',
      message: 'Are you sure you want to end your current pharmacist dispensary session?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      danger: true,
      icon: 'fa-arrow-right-from-bracket'
    });

    if (confirmed) {
      this.logout();
    }
  },

  logout() {
    // Close any active modal dialogs
    if (typeof modal !== 'undefined' && typeof modal.closeAll === 'function') {
      modal.closeAll();
    }

    // Clear session from localStorage
    localStorage.removeItem(this.SESSION_KEY);

    // Reset hash
    if (window.location.hash) {
      window.location.hash = '';
    }

    // Hide app shell, show login screen
    const loginScreen = document.getElementById('login-screen');
    const appShell = document.querySelector('.app-shell');

    if (appShell) appShell.style.display = 'none';
    if (loginScreen) {
      loginScreen.classList.remove('hidden');
      const pwdInput = document.getElementById('login-input-password');
      if (pwdInput) pwdInput.value = '';
    }

    toast.info('You have safely signed out of the dispensary terminal.', 'Logged Out');
  }
};
