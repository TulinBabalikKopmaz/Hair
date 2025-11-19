# SelfCapture Backend API

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
cd server
npm install
```

2. `config.js` dosyasını düzenleyin:
```javascript
// server/config.js dosyasını açın ve MongoDB connection string'i ekleyin
MONGODB_URI: 'mongodb://localhost:27017/hair-capture', // veya MongoDB Atlas connection string
```

**Not:** `config.js` dosyası `.gitignore`'da olduğu için Git'e commit edilmez (güvenlik için).

3. MongoDB'yi başlatın (MongoDB yüklü değilse):
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# MongoDB Compass veya MongoDB Community Server kullanın
```

4. Sunucuyu başlatın:
```bash
# Development (nodemon ile)
npm run dev

# Production
npm start
```

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

### Analysis
- `POST /api/analysis/face-orientation` - Base64 görsel üzerinden Haar cascade ile yüz yönünü (sol / sağ / front) belirler. Gövde örneği:
  ```json
  {
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
  }
  ```
  Yanıt başarı durumunda `orientation`, `confidence`, `landmarks` ve `metrics` alanlarını içerir.

## Python & OpenCV bağımlılığı

Yüz analizi için Python 3 ve `opencv-python` paketine ihtiyaç vardır. Analiz servisi varsayılan olarak `python3` komutunu çağırır. Kurulum için:

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install opencv-python
```

Sunucuyu başlatmadan önce sanal ortamı aktive ettiğinizden emin olun ya da global ortamda `opencv-python` bulunsun.

## MongoDB Kurulumu

### MongoDB Atlas (Cloud - Önerilen)
1. https://www.mongodb.com/cloud/atlas adresine gidin
2. Ücretsiz hesap oluşturun
3. Cluster oluşturun
4. Connection string'i alın ve `config.js` dosyasındaki `MONGODB_URI` alanına ekleyin

### Local MongoDB
- macOS: `brew install mongodb-community`
- Linux: `sudo apt-get install mongodb`
- Windows: MongoDB Community Server indirin

