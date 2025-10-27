const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    req.user = payload;
  } catch (e) {
    // ignore
  }
  return next();
}

function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
  return next();
}

module.exports = { authRequired, optionalAuth, adminOnly };
