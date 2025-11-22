# SelfCapture - Saç Ekimi Fotoğraf Uygulaması

React Native (Expo) ile geliştirilmiş saç ekimi öncesi fotoğraf çekme uygulaması.
çalıştırma: npx expo run:android

## Özellikler

- 📸 5 farklı açıdan otomatik fotoğraf çekimi
- 📱 Cihaz açısı sensörü ile doğru pozisyon kontrolü
- 🔐 Kullanıcı kayıt ve giriş sistemi
- 💾 MongoDB ile veri saklama
- 🎯 Gerçek zamanlı açı yönlendirmesi

## Kurulum

### 1. Frontend (Expo App)

```bash
# Bağımlılıkları yükle
npm install

# .env dosyası oluştur (opsiyonel - backend URL'i için)
cp .env.example .env

# Expo sunucusunu başlat
npm start
```

### 2. Backend API

```bash
# Server klasörüne git
cd server

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cp .env.example .env

# .env dosyasını düzenle:
# - MONGODB_URI: MongoDB bağlantı string'i
# - JWT_SECRET: Güvenli bir secret key
# - PORT: Server portu (varsayılan: 3000)

# MongoDB'yi başlat (local için)
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# Sunucuyu başlat
npm run dev
```

## MongoDB Kurulumu

### Seçenek 1: MongoDB Atlas (Önerilen - Cloud)

1. https://www.mongodb.com/cloud/atlas adresine gidin
2. Ücretsiz hesap oluşturun
3. Cluster oluşturun
4. Connection string'i alın ve `server/.env` dosyasına ekleyin

### Seçenek 2: Local MongoDB

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongod
```

**Windows:**
MongoDB Community Server'ı indirip kurun.

## Kullanım

1. Uygulamayı Expo Go ile açın
2. "Başla" butonuna tıklayın
3. Kayıt olun veya giriş yapın
4. Fotoğraf çekme adımlarını takip edin
5. Her adımda cihaz açısını doğru pozisyona getirin
6. Otomatik veya manuel fotoğraf çekin

## API Endpoints

### Auth
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi

### Photos
- `POST /api/photos/save` - Fotoğraf kaydetme (Auth gerekli)
- `GET /api/photos/all` - Tüm fotoğrafları getir (Auth gerekli)
- `DELETE /api/photos/:stepId` - Fotoğraf sil (Auth gerekli)

### Users
- `GET /api/users/me` - Mevcut kullanıcı bilgileri (Auth gerekli)

## Teknolojiler

- **Frontend:** React Native, Expo, TypeScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JWT
- **Storage:** AsyncStorage

## Notlar

- Backend API çalışmıyorsa fotoğraflar sadece local olarak saklanır
- MongoDB bağlantısı için internet bağlantısı gereklidir (Atlas kullanıyorsanız)
- Local MongoDB kullanıyorsanız MongoDB servisinin çalıştığından emin olun

