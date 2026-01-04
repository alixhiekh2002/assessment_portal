export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ message: "No role" });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}
