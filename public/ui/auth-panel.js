// Authentication Panel UI

class AuthPanel {
  constructor(containerId = 'auth-container') {
    this.containerId = containerId;
    this.currentUser = null;
    this.token = null;
    this.mode = 'login'; // login or signup
  }

  render() {
    const container = document.getElementById(this.containerId);

    if (this.currentUser) {
      return this.renderDashboard();
    }

    if (this.mode === 'login') {
      return this.renderLoginForm();
    } else {
      return this.renderSignupForm();
    }
  }

  renderLoginForm() {
    const container = document.getElementById(this.containerId);
    container.innerHTML = `
      <div class="auth-form login-form">
        <div class="auth-header">
          <h2>Acceso a Cuenta</h2>
          <p>Ingresa tus credenciales para comenzar</p>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label for="login-email">Email</label>
            <input type="email" id="login-email" name="email" required placeholder="tu@email.com">
          </div>

          <div class="form-group">
            <label for="login-password">Contraseña</label>
            <input type="password" id="login-password" name="password" required placeholder="••••••••">
          </div>

          <button type="submit" class="btn-primary btn-full">Acceder</button>
        </form>

        <div class="auth-footer">
          <p>¿No tienes cuenta? <a href="#" onclick="authPanel.switchToSignup(); return false;">Registrarse</a></p>
        </div>

        <div id="login-error" class="error-message" style="display:none;"></div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
  }

  renderSignupForm() {
    const container = document.getElementById(this.containerId);
    container.innerHTML = `
      <div class="auth-form signup-form">
        <div class="auth-header">
          <h2>Crear Cuenta</h2>
          <p>Únete a nuestra plataforma de trading</p>
        </div>

        <form id="signup-form">
          <div class="form-group">
            <label for="signup-email">Email</label>
            <input type="email" id="signup-email" name="email" required placeholder="tu@email.com">
          </div>

          <div class="form-group">
            <label for="signup-password">Contraseña</label>
            <input type="password" id="signup-password" name="password" required placeholder="••••••••">
            <small>Mínimo 6 caracteres</small>
          </div>

          <div class="form-group">
            <label for="signup-confirm">Confirmar Contraseña</label>
            <input type="password" id="signup-confirm" name="confirm" required placeholder="••••••••">
          </div>

          <button type="submit" class="btn-primary btn-full">Registrarse</button>
        </form>

        <div class="auth-footer">
          <p>¿Ya tienes cuenta? <a href="#" onclick="authPanel.switchToLogin(); return false;">Acceder</a></p>
        </div>

        <div id="signup-error" class="error-message" style="display:none;"></div>
      </div>
    `;

    document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
  }

  renderDashboard() {
    const container = document.getElementById(this.containerId);
    container.innerHTML = `
      <div class="user-panel">
        <div class="user-info">
          <div class="user-avatar">👤</div>
          <div class="user-details">
            <p class="user-email">${this.currentUser.email}</p>
            <p class="user-id">ID: ${this.currentUser.id.substring(0, 8)}...</p>
          </div>
        </div>
        <button onclick="authPanel.logout()" class="btn-secondary btn-sm">Cerrar Sesión</button>
      </div>
    `;
  }

  switchToLogin() {
    this.mode = 'login';
    this.render();
  }

  switchToSignup() {
    this.mode = 'signup';
    this.render();
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!data.success) {
        this.showError('login-error', data.error || 'Error al acceder');
        return;
      }

      this.currentUser = data.user;
      this.token = data.session.accessToken;
      localStorage.setItem('authToken', this.token);
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

      window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.currentUser }));
      this.render();
    } catch (error) {
      this.showError('login-error', 'Error de conexión');
      console.error('Login error:', error);
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    if (password !== confirm) {
      this.showError('signup-error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      this.showError('signup-error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!data.success) {
        this.showError('signup-error', data.error || 'Error al registrarse');
        return;
      }

      this.currentUser = data.user;
      this.token = data.session.accessToken;
      localStorage.setItem('authToken', this.token);
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

      window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.currentUser }));
      this.render();
    } catch (error) {
      this.showError('signup-error', 'Error de conexión');
      console.error('Signup error:', error);
    }
  }

  showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  logout() {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.mode = 'login';

    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    this.render();
  }

  loadFromStorage() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
      this.token = token;
      this.currentUser = JSON.parse(user);
      return true;
    }
    return false;
  }

  getAuthHeader() {
    if (this.token) {
      return { 'Authorization': `Bearer ${this.token}` };
    }
    return {};
  }
}

// Create global instance
const authPanel = new AuthPanel('auth-container');
