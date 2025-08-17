class MexcProfitCalculator {
    constructor(apiKey, secretKey) {
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.baseUrl = 'https://api.mexc.com';
    }

    // Генерация подписи для API запросов
    generateSignature(queryString) {
        const crypto = require('crypto');
        return crypto.createHmac('sha256', this.secretKey)
            .update(queryString)
            .digest('hex');
    }

    // Выполнение API запроса
    async makeRequest(endpoint, params = {}) {
        const queryString = Object.keys(params)
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        const signature = this.generateSignature(queryString);
        const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;
        
        const response = await fetch(url, {
            headers: {
                'X-MEXC-APIKEY': this.apiKey
            }
        });
        
        return await response.json();
    }

    // Получить историю сделок для пары
    async getTradeHistory(symbol, startTime = null, endTime = null, limit = 1000) {
        const params = { symbol, limit };
        
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;
        
        return await this.makeRequest('/api/v3/myTrades', params);
    }

    // Получить балансы аккаунта
    async getAccountInfo() {
        return await this.makeRequest('/api/v3/account');
    }

    // Рассчитать прибыль по паре
    async calculatePairProfit(symbol, startTime = null, endTime = null) {
        console.log(`Calculating profit for ${symbol}...`);
        
        // Получаем историю сделок
        const trades = await this.getTradeHistory(symbol, startTime, endTime);
        
        let totalBuyValue = 0;
        let totalSellValue = 0;
        let totalFees = 0;
        let totalBuyAmount = 0;
        let totalSellAmount = 0;
        
        trades.forEach(trade => {
            const price = parseFloat(trade.price);
            const quantity = parseFloat(trade.qty);
            const quoteQty = parseFloat(trade.quoteQty);
            const commission = parseFloat(trade.commission);
            const isBuyer = trade.isBuyer;
            
            if (isBuyer) {
                // Покупка
                totalBuyValue += quoteQty;
                totalBuyAmount += quantity;
            } else {
                // Продажа
                totalSellValue += quoteQty;
                totalSellAmount += quantity;
            }
            
            totalFees += commission;
        });
        
        // Рассчитываем чистую прибыль
        const netProfit = totalSellValue - totalBuyValue - totalFees;
        const profitPercentage = totalBuyValue > 0 ? (netProfit / totalBuyValue) * 100 : 0;
        
        return {
            symbol,
            totalBuyValue,
            totalSellValue,
            totalFees,
            totalBuyAmount,
            totalSellAmount,
            netProfit,
            profitPercentage,
            tradeCount: trades.length,
            buyCount: trades.filter(t => t.isBuyer).length,
            sellCount: trades.filter(t => !t.isBuyer).length
        };
    }

    // Рассчитать прибыль по всем парам
    async calculateAllPairsProfit(startTime = null, endTime = null) {
        // Получаем информацию об аккаунте
        const accountInfo = await this.getAccountInfo();
        
        // Фильтруем активы с ненулевым балансом
        const activeAssets = accountInfo.balances.filter(balance => {
            const free = parseFloat(balance.free);
            const locked = parseFloat(balance.locked);
            return (free + locked) > 0;
        });
        
        const results = {};
        
        // Рассчитываем прибыль для каждой активной пары
        for (const asset of activeAssets) {
            if (asset.asset === 'USDT') continue; // Пропускаем USDT
            
            const symbol = `${asset.asset}USDT`;
            
            try {
                const profit = await this.calculatePairProfit(symbol, startTime, endTime);
                if (profit.tradeCount > 0) {
                    results[symbol] = profit;
                }
            } catch (error) {
                console.log(`Error calculating profit for ${symbol}:`, error.message);
            }
        }
        
        return results;
    }

    // Получить сводку по прибыли
    async getProfitSummary(startTime = null, endTime = null) {
        const pairsProfit = await this.calculateAllPairsProfit(startTime, endTime);
        
        let totalProfit = 0;
        let totalFees = 0;
        let totalTrades = 0;
        let profitablePairs = 0;
        
        Object.values(pairsProfit).forEach(pair => {
            totalProfit += pair.netProfit;
            totalFees += pair.totalFees;
            totalTrades += pair.tradeCount;
            if (pair.netProfit > 0) profitablePairs++;
        });
        
        return {
            totalProfit,
            totalFees,
            totalTrades,
            totalPairs: Object.keys(pairsProfit).length,
            profitablePairs,
            pairsProfit
        };
    }
}

// Пример использования
async function example() {
    const calculator = new MexcProfitCalculator('YOUR_API_KEY', 'YOUR_SECRET_KEY');
    
    // Рассчитать прибыль за последний месяц
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const summary = await calculator.getProfitSummary(oneMonthAgo);
    
    console.log('Profit Summary:', summary);
    
    // Рассчитать прибыль для конкретной пары
    const hbarProfit = await calculator.calculatePairProfit('HBARUSDT', oneMonthAgo);
    console.log('HBAR Profit:', hbarProfit);
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MexcProfitCalculator;
}