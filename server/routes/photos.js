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
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

// Save photo
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { stepId, uri } = req.body;

    if (!stepId || !uri) {
      return res.status(400).json({
        message: 'stepId ve uri gereklidir',
      });
    }

    // Remove existing photo for this step if exists
    const user = req.user;
    user.photos = user.photos.filter((photo) => photo.stepId !== stepId);

    // Add new photo
    user.photos.push({
      stepId,
      uri,
    });

    await user.save();

    res.json({
      message: 'Fotoğraf kaydedildi',
      photos: user.photos,
    });
  } catch (error) {
    console.error('Save photo error:', error);
    res.status(500).json({
      message: 'Fotoğraf kaydedilirken bir hata oluştu',
      error: error.message,
    });
  }
});

// Get all photos for user
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      photos: user.photos,
    });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({
      message: 'Fotoğraflar alınırken bir hata oluştu',
      error: error.message,
    });
  }
});

// Delete photo
router.delete('/:stepId', authenticateToken, async (req, res) => {
  try {
    const { stepId } = req.params;
    const user = req.user;

    user.photos = user.photos.filter((photo) => photo.stepId !== stepId);
    await user.save();

    res.json({
      message: 'Fotoğraf silindi',
      photos: user.photos,
    });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({
      message: 'Fotoğraf silinirken bir hata oluştu',
      error: error.message,
    });
  }
});

module.exports = router;

