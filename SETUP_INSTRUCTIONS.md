# 🚀 MEXC API Dashboard - Setup Instructions

## 📋 **Обзор решений CORS проблемы**

### **Проблема:**
- Браузеры блокируют прямые запросы к `api.mexc.com`
- CORS (Cross-Origin Resource Sharing) ограничения
- Безопасность браузера

### **Решения:**

## 🔧 **Решение 1: Прокси-сервер (Рекомендуется)**

### **Преимущества:**
- ✅ **Полная функциональность** - все API возможности
- ✅ **Безопасность** - API ключи на сервере
- ✅ **Производительность** - кэширование и оптимизация
- ✅ **Масштабируемость** - легко расширять

### **Установка и запуск:**

#### **1. Установка зависимостей:**
```bash
npm install
```

#### **2. Запуск сервера:**
```bash
npm start
```

#### **3. Открыть в браузере:**
```
http://localhost:3000
```

### **Структура файлов:**
```
📁 MEXC Dashboard/
├── 📄 proxy_server.js          # Прокси-сервер
├── 📄 package.json             # Зависимости
├── 📄 api_dashboard_no_cors.html  # Веб-интерфейс
├── 📄 index.html               # Основное приложение
├── 📄 test_simple.html         # Тестовая страница
└── 📄 API_README.md            # Документация
```

## 🌐 **Решение 2: Публичный прокси (Альтернатива)**

### **Если не хотите устанавливать Node.js:**

#### **Вариант A: Использовать публичный CORS прокси:**
```javascript
// В api_dashboard.html заменить URL на:
const url = `https://cors-anywhere.herokuapp.com/https://api.mexc.com${endpoint}?${queryString}&signature=${signature}`;
```

#### **Вариант B: Использовать Cloudflare Workers:**
```javascript
// Создать Cloudflare Worker с CORS headers
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('Access-Control-Allow-Origin', '*')
  return newResponse
}
```

## 🔧 **Решение 3: Browser Extension (Для разработки)**

### **Установить CORS расширение:**
1. **Chrome:** "CORS Unblock" или "Allow CORS"
2. **Firefox:** "CORS Everywhere"
3. **Включить** расширение для `api.mexc.com`

### **Ограничения:**
- ⚠️ **Только для разработки**
- ⚠️ **Небезопасно для продакшена**
- ⚠️ **Работает только локально**

## 🚀 **Быстрый старт (Рекомендуемый способ)**

### **Шаг 1: Установка Node.js**
```bash
# Проверить версию Node.js
node --version  # Должно быть 14+ или 16+

# Если не установлен, скачать с nodejs.org
```

### **Шаг 2: Клонирование и установка**
```bash
# Перейти в папку проекта
cd /path/to/mexc-dashboard

# Установить зависимости
npm install
```

### **Шаг 3: Запуск**
```bash
# Запустить сервер
npm start

# Или в режиме разработки (автоперезагрузка)
npm run dev
```

### **Шаг 4: Настройка API**
1. Открыть `http://localhost:3000`
2. Создать API ключи на MEXC
3. Ввести ключи в форму
4. Нажать "Load Profit Data"

## 🔑 **Создание API ключей на MEXC**

### **Пошаговая инструкция:**

#### **1. Войти в аккаунт MEXC**
- Перейти на [mexc.com](https://mexc.com)
- Войти в аккаунт

#### **2. Перейти в API Management**
- Нажать на аватар
- Выбрать "API Management"
- Нажать "Create API Key"

#### **3. Настройка прав доступа**
- ✅ **Enable Reading** - включить
- ❌ **Enable Spot & Margin Trading** - выключить
- ❌ **Enable Futures Trading** - выключить
- ❌ **Enable Withdrawals** - выключить

#### **4. Безопасность**
- **IP Whitelist:** Добавить ваш IP адрес
- **Note:** Добавить описание (например "Profit Dashboard")
- **2FA:** Подтвердить через 2FA

#### **5. Сохранение ключей**
- **API Key:** Скопировать и сохранить
- **Secret Key:** Скопировать и сохранить
- ⚠️ **Важно:** Secret Key показывается только один раз!

## 🔒 **Безопасность**

### **Рекомендации:**
1. **Только права на чтение** - никаких торговых операций
2. **IP ограничения** - привяжите к вашему IP
3. **Временные ключи** - регулярно обновляйте
4. **Не делитесь ключами** - держите в секрете
5. **Мониторинг** - следите за использованием

### **Хранение ключей:**
```javascript
// Безопасное хранение (только для разработки)
localStorage.setItem('mexc_api_key', apiKey);
localStorage.setItem('mexc_secret_key', secretKey);

// Для продакшена используйте серверное хранение
```

## 🐛 **Устранение неполадок**

### **Ошибка: "Server Offline"**
```bash
# Проверить, запущен ли сервер
ps aux | grep node

# Перезапустить сервер
npm start

# Проверить порт 3000
netstat -tulpn | grep :3000
```

### **Ошибка: "API Error: 401"**
- Проверить правильность API ключей
- Убедиться, что включены права на чтение
- Проверить IP ограничения

### **Ошибка: "API Error: 429"**
- Превышен лимит запросов
- Подождать 1 минуту
- Уменьшить количество запросов

### **Ошибка: "CORS Error"**
- Убедиться, что сервер запущен
- Проверить URL: `http://localhost:3000`
- Очистить кэш браузера

## 📊 **Тестирование**

### **1. Проверка сервера:**
```bash
curl http://localhost:3000/health
# Должен вернуть: {"status":"OK","timestamp":"..."}
```

### **2. Проверка API:**
```bash
curl -X POST http://localhost:3000/api/mexc/proxy \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"test","secretKey":"test","endpoint":"/api/v3/account","params":{}}'
```

### **3. Тестовая страница:**
- Открыть `test_simple.html`
- Загрузить ваш XLSX файл
- Сравнить результаты с API

## 🚀 **Следующие шаги**

### **1. Интеграция с основным приложением:**
- Заменить парсинг файлов на API
- Добавить автоматическое обновление
- Реализовать уведомления

### **2. Расширенная функциональность:**
- Экспорт данных в Excel
- Email отчеты
- Telegram бот

### **3. Продакшен развертывание:**
- VPS или облачный сервер
- SSL сертификат
- Домен и DNS
- Мониторинг и логирование

## 📞 **Поддержка**

### **Полезные ссылки:**
- [MEXC API Documentation](https://mexcdevelop.github.io/apidocs/spot_v3_en/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)

### **Отладка:**
```bash
# Включить подробное логирование
DEBUG=* npm start

# Проверить логи
tail -f logs/app.log
```

---

## ✅ **Готово!**

Теперь у вас есть полнофункциональный API дашборд без проблем с CORS! 

**Следующий шаг:** Запустите `npm start` и откройте `http://localhost:3000` 🎯