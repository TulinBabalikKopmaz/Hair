const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = config.MONGODB_URI || 'mongodb://localhost:27017/hair-capture';

if (!config.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI boş! Lütfen server/config.js dosyasına MongoDB connection string ekleyin.');
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB bağlantısı başarılı');
  })
  .catch((error) => {
    console.error('❌ MongoDB bağlantı hatası:', error);
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/users', require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = config.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
  console.log(`📱 API URL: http://localhost:${PORT}/api`);
});

