const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

const router = express.Router();

const JWT_SECRET = config.JWT_SECRET || 'your-secret-key-change-this';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body;

    // Validation
    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json({
        message: 'Tüm alanlar gereklidir',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Şifre en az 6 karakter olmalıdır',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        message: 'Bu telefon numarası ile kayıtlı bir kullanıcı zaten var',
      });
    }

    // Create user
    const user = new User({
      firstName,
      lastName,
      phone,
      password,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Kayıt başarılı',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      message: 'Kayıt sırasında bir hata oluştu',
      error: error.message,
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validation
    if (!phone || !password) {
      return res.status(400).json({
        message: 'Telefon numarası ve şifre gereklidir',
      });
    }

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({
        message: 'Telefon numarası veya şifre hatalı',
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Telefon numarası veya şifre hatalı',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Giriş sırasında bir hata oluştu',
      error: error.message,
    });
  }
});

module.exports = router;

