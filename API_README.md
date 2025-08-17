# MEXC API Profit Calculator

## 🚀 **Преимущества API подхода**

### **✅ Точность данных:**
- **Реальные комиссии** - точные значения с биржи
- **Актуальные цены** - рыночные цены на момент сделки  
- **Полная история** - все сделки без пропусков
- **Временные метки** - точное время каждой сделки

### **✅ Автоматизация:**
- **Real-time обновления** - данные в реальном времени
- **Автоматический расчет** - без ручной загрузки файлов
- **Исторический анализ** - любой период времени
- **Множественные пары** - все пары одновременно

## 🔑 **Настройка API ключей**

### **1. Создание API ключей на MEXC:**
1. Войдите в аккаунт MEXC
2. Перейдите в **API Management**
3. Создайте новый API ключ
4. **Важно:** Включите только права на **чтение** (Read Only)
5. Сохраните **API Key** и **Secret Key**

### **2. Безопасность:**
- ✅ **Только чтение** - никаких торговых операций
- ✅ **IP ограничения** - привяжите к вашему IP
- ✅ **Временные ключи** - регулярно обновляйте

## 📊 **Доступные данные через API**

### **1. История сделок (`/api/v3/myTrades`)**
```javascript
{
  "symbol": "HBARUSDT",
  "id": 12345,
  "orderId": 67890,
  "price": "0.12345",
  "qty": "100.00000000",
  "quoteQty": "12.34500000",
  "commission": "0.01234500",
  "commissionAsset": "HBAR",
  "time": 1640995200000,
  "isBuyer": true,
  "isMaker": false
}
```

### **2. Информация об аккаунте (`/api/v3/account`)**
```javascript
{
  "makerCommission": 15,
  "takerCommission": 15,
  "buyerCommission": 0,
  "sellerCommission": 0,
  "canTrade": true,
  "canWithdraw": true,
  "canDeposit": true,
  "updateTime": 123456789,
  "accountType": "SPOT",
  "balances": [
    {
      "asset": "HBAR",
      "free": "100.00000000",
      "locked": "0.00000000"
    }
  ]
}
```

### **3. История ордеров (`/api/v3/allOrders`)**
```javascript
{
  "symbol": "HBARUSDT",
  "orderId": 67890,
  "price": "0.12345",
  "origQty": "100.00000000",
  "executedQty": "100.00000000",
  "cummulativeQuoteQty": "12.34500000",
  "status": "FILLED",
  "timeInForce": "GTC",
  "type": "LIMIT",
  "side": "BUY",
  "stopPrice": "0.00000000",
  "icebergQty": "0.00000000",
  "time": 1640995200000,
  "updateTime": 1640995200000,
  "isWorking": false
}
```

## 🧮 **Формула расчета прибыли**

### **Простая формула:**
```
Net Profit = Total Sell Value - Total Buy Value - Total Fees
```

### **Детальный расчет:**
```javascript
// Для каждой сделки:
if (isBuyer) {
    totalBuyValue += quoteQty;      // Сумма покупок
    totalBuyAmount += qty;          // Количество купленного
} else {
    totalSellValue += quoteQty;     // Сумма продаж
    totalSellAmount += qty;         // Количество проданного
}

totalFees += commission;            // Комиссии

// Итоговая прибыль:
netProfit = totalSellValue - totalBuyValue - totalFees;
profitPercentage = (netProfit / totalBuyValue) * 100;
```

## 🛠 **Использование**

### **1. Веб-интерфейс (`api_dashboard.html`):**
- Откройте файл в браузере
- Введите API ключи
- Выберите период
- Нажмите "Load Profit Data"

### **2. Программный доступ:**
```javascript
const calculator = new MexcProfitCalculator(apiKey, secretKey);

// Расчет прибыли за месяц
const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
const summary = await calculator.getProfitSummary(oneMonthAgo);

// Расчет прибыли для конкретной пары
const hbarProfit = await calculator.calculatePairProfit('HBARUSDT', oneMonthAgo);
```

## 📈 **Возможности анализа**

### **1. Временные периоды:**
- **День** - прибыль за день
- **Неделя** - прибыль за неделю  
- **Месяц** - прибыль за месяц
- **Квартал** - прибыль за квартал
- **Год** - прибыль за год
- **Произвольный** - любой период

### **2. Фильтрация:**
- **По парам** - конкретные торговые пары
- **По прибыльности** - только прибыльные/убыточные
- **По объему** - по количеству сделок
- **По комиссиям** - по размеру комиссий

### **3. Аналитика:**
- **Топ прибыльных пар** - лучшие результаты
- **Распределение прибыли** - графики и диаграммы
- **Тренды** - изменение прибыли во времени
- **Риск-анализ** - волатильность и риски

## 🔧 **Технические детали**

### **API лимиты:**
- **1200 запросов/минуту** для авторизованных пользователей
- **Максимум 1000 сделок** за один запрос
- **Автоматическая пагинация** для больших объемов

### **Обработка ошибок:**
```javascript
try {
    const data = await calculator.getTradeHistory('HBARUSDT');
} catch (error) {
    if (error.message.includes('429')) {
        // Превышен лимит запросов
        await new Promise(resolve => setTimeout(resolve, 60000));
    } else if (error.message.includes('401')) {
        // Неверные API ключи
        console.error('Invalid API credentials');
    }
}
```

### **Кэширование:**
- **Локальное кэширование** для уменьшения запросов
- **Временные метки** для обновления данных
- **Инкрементальные обновления** только новых данных

## 📱 **Мобильная версия**

### **Адаптивный дизайн:**
- **Bootstrap 5** - современный responsive дизайн
- **Touch-friendly** - оптимизация для мобильных
- **Offline поддержка** - работа без интернета
- **PWA** - Progressive Web App возможности

## 🔒 **Безопасность**

### **Рекомендации:**
1. **Никогда не делитесь** API ключами
2. **Используйте только права на чтение**
3. **Ограничьте IP адреса**
4. **Регулярно обновляйте ключи**
5. **Мониторьте использование**

### **Хранение ключей:**
```javascript
// Безопасное хранение в localStorage (только для разработки)
localStorage.setItem('mexc_api_key', apiKey);
localStorage.setItem('mexc_secret_key', secretKey);

// Для продакшена используйте серверное хранение
```

## 🚀 **Следующие шаги**

### **1. Интеграция с основным приложением:**
- Заменить парсинг файлов на API
- Добавить автоматическое обновление
- Реализовать уведомления

### **2. Расширенная аналитика:**
- Машинное обучение для прогнозирования
- Анализ паттернов торговли
- Оптимизация стратегий

### **3. Мобильное приложение:**
- React Native / Flutter
- Push уведомления
- Офлайн режим

## 📞 **Поддержка**

### **Полезные ссылки:**
- [MEXC API Documentation](https://mexcdevelop.github.io/apidocs/spot_v3_en/)
- [API Rate Limits](https://mexcdevelop.github.io/apidocs/spot_v3_en/#rate-limits)
- [Error Codes](https://mexcdevelop.github.io/apidocs/spot_v3_en/#error-codes)

### **Отладка:**
```javascript
// Включить подробное логирование
console.log('API Request:', endpoint, params);
console.log('API Response:', response);
console.log('Calculated Profit:', profit);
```