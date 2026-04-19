// Auth Routes Handler - Routes to correct auth endpoint based on path and method

module.exports = async (req, res) => {
  const path = req.url.split('?')[0];

  // Route to /api/auth/login
  if (path === '/api/auth/login') {
    const loginHandler = require('./login.js');
    return loginHandler(req, res);
  }

  // Route to /api/auth/signup
  if (path === '/api/auth/signup') {
    const signupHandler = require('./signup.js');
    return signupHandler(req, res);
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: 'Endpoint no encontrado'
  }));
};
