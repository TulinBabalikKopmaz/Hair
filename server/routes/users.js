const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

const router = express.Router();

const JWT_SECRET = config.JWT_SECRET || 'your-secret-key-change-this';

// Middleware to verify token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token bulunamadı' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Geçersiz token' });
  }
};

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        photos: user.photos,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Kullanıcı bilgileri alınırken bir hata oluştu',
      error: error.message,
    });
  }
});

module.exports = router;

