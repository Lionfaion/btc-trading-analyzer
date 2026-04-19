// Authentication Middleware - JWT verification

/**
 * Verify JWT token from Authorization header
 * Adds user object to req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }

  const [scheme, token] = authHeader.split(' ');
  
  if (scheme !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Esquema de autenticación inválido'
    });
  }

  // In production, verify JWT with Supabase
  // For now, decode and validate basic structure
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
}

/**
 * Optional authentication - doesn't require token
 */
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    
    if (scheme === 'Bearer') {
      try {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        
        if (decoded.exp && decoded.exp >= Math.floor(Date.now() / 1000)) {
          req.user = {
            id: decoded.sub,
            email: decoded.email
          };
        }
      } catch (error) {
        // Silently ignore invalid tokens in optional auth
      }
    }
  }

  next();
}

module.exports = { authMiddleware, optionalAuthMiddleware };
