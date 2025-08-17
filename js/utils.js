// Utility functions for the Trading Dashboard

// Set moment.js locale to Russian
moment.locale('ru');

class Utils {
    // Format currency with proper symbols and colors
    static formatCurrency(value, currency = 'USDT') {
        const absValue = Math.abs(value);
        let formatted;
        
        if (absValue >= 1000000) {
            formatted = (absValue / 1000000).toFixed(2) + 'M';
        } else if (absValue >= 1000) {
            formatted = (absValue / 1000).toFixed(2) + 'K';
        } else {
            formatted = absValue.toFixed(2);
        }
        
        const sign = value >= 0 ? '+' : '-';
        return `${sign}${formatted} ${currency}`;
    }

    // Format percentage with proper signs and colors
    static formatPercent(value) {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    }

    // Format date for display
    static formatDate(dateString, format = 'DD MMM') {
        return moment(dateString).format(format);
    }

    // Format date with day of week
    static formatDateWithDay(dateString) {
        const date = moment(dateString);
        return {
            day: date.format('dd').toUpperCase(),
            date: date.format('DD MMM')
        };
    }

    // Get profit/loss class name
    static getProfitClass(value) {
        return value >= 0 ? 'profit' : 'loss';
    }

    // Get profit/loss icon
    static getProfitIcon(value) {
        return value >= 0 ? 'bi-arrow-up' : 'bi-arrow-down';
    }

    // Debounce function for performance
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Show toast notification
    static showToast(message, type = 'error') {
        const toast = document.getElementById('errorToast');
        const toastBody = toast.querySelector('.toast-body');
        const toastHeader = toast.querySelector('.toast-header');
        
        toastBody.textContent = message;
        
        // Update header based on type
        if (type === 'success') {
            toastHeader.className = 'toast-header bg-success text-white';
            toastHeader.querySelector('strong').textContent = 'Успех';
            toastHeader.querySelector('i').className = 'bi bi-check-circle me-2';
        } else {
            toastHeader.className = 'toast-header bg-danger text-white';
            toastHeader.querySelector('strong').textContent = 'Ошибка';
            toastHeader.querySelector('i').className = 'bi bi-exclamation-triangle me-2';
        }
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    // Show/hide loading overlay
    static showLoading(show = true, message = 'Обработка данных...') {
        const overlay = document.getElementById('loadingOverlay');
        const messageEl = overlay.querySelector('p');
        
        if (show) {
            messageEl.textContent = message;
            overlay.classList.remove('d-none');
        } else {
            overlay.classList.add('d-none');
        }
    }

    // Generate random color for charts
    static generateColor(index) {
        const colors = [
            '#007BFF', '#00C851', '#FF3547', '#FFA726',
            '#AB47BC', '#26C6DA', '#FFEE58', '#FF7043',
            '#66BB6A', '#42A5F5', '#EC407A', '#9CCC65'
        ];
        return colors[index % colors.length];
    }

    // Calculate date range
    static getDateRange(period, customStart = null, customEnd = null) {
        const now = moment();
        let start, end;

        switch (period) {
            case 'week':
                start = now.clone().subtract(7, 'days');
                end = now.clone();
                break;
            case 'month':
                start = now.clone().subtract(30, 'days');
                end = now.clone();
                break;
            case 'custom':
                start = customStart ? moment(customStart) : now.clone().subtract(30, 'days');
                end = customEnd ? moment(customEnd) : now.clone();
                break;
            default:
                start = now.clone().subtract(7, 'days');
                end = now.clone();
        }

        return {
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD'),
            display: `${start.format('DD MMM')} - ${end.format('DD MMM YYYY')}`
        };
    }

    // Validate file type
    static validateFileType(file) {
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        
        const hasValidType = allowedTypes.includes(file.type);
        const hasValidExtension = allowedExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext)
        );
        
        return hasValidType || hasValidExtension;
    }

    // Validate file size (max 10MB)
    static validateFileSize(file, maxSizeMB = 10) {
        const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
        return file.size <= maxSize;
    }

    // Parse CSV text to array of objects
    static parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV файл должен содержать заголовки и данные');
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index].trim();
                });
                data.push(row);
            }
        }

        return data;
    }

    // Calculate win rate from trades (more accurate calculation)
    static calculateWinRate(trades) {
        if (!trades || trades.length === 0) return 0;
        
        // Group trades by pairs to calculate proper win rate
        const pairTrades = {};
        trades.forEach(trade => {
            const pair = trade.Pairs || 'UNKNOWN';
            if (!pairTrades[pair]) {
                pairTrades[pair] = { buys: [], sells: [] };
            }
            if (trade.Side === 'Buy') {
                pairTrades[pair].buys.push(trade);
            } else if (trade.Side === 'Sell') {
                pairTrades[pair].sells.push(trade);
            }
        });
        
        let profitableOperations = 0;
        let totalOperations = 0;
        
        // Calculate win rate based on completed buy-sell cycles
        Object.values(pairTrades).forEach(pair => {
            const completedCycles = Math.min(pair.buys.length, pair.sells.length);
            totalOperations += completedCycles;
            
            // Simple approach: count sells as profitable if they have positive net value
            pair.sells.forEach(sell => {
                const total = parseFloat(sell.Total) || 0;
                const fee = parseFloat(sell.Fee) || 0;
                if ((total - fee) > 0) {
                    profitableOperations++;
                }
            });
        });
        
        return totalOperations > 0 ? (profitableOperations / trades.length) * 100 : 0;
    }

    // Group trades by date
    static groupTradesByDate(trades) {
        const grouped = {};
        
        trades.forEach(trade => {
            const date = moment(trade.Time).format('YYYY-MM-DD');
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(trade);
        });
        
        return grouped;
    }

    // Calculate clean profit by trading pairs
    // Simple approach: Total Sell - Total Buy - Fees = Net Profit
    static calculatePairProfit(trades) {
        console.log('Calculating pair profit for', trades.length, 'trades');
        
        // Group trades by pair
        const pairData = {};
        
        trades.forEach(trade => {
            const pair = trade.Pairs || 'UNKNOWN';
            const total = parseFloat(trade.Total) || 0;
            const fee = parseFloat(trade.Fee) || 0;
            const amount = parseFloat(trade['Executed Amount']) || 0;
            const price = parseFloat(trade['Filled Price']) || 0;
            const side = trade.Side;
            const time = trade.Time;
            
            if (!pairData[pair]) {
                pairData[pair] = {
                    pair: pair,
                    trades: [],
                    totalBuyAmount: 0,
                    totalBuyValue: 0,
                    totalSellAmount: 0,
                    totalSellValue: 0,
                    totalFees: 0,
                    currentPosition: {
                        amount: 0,
                        cost: 0,
                        avgPrice: 0
                    }
                };
            }
            
            // Add trade to history
            pairData[pair].trades.push({
                time: time,
                side: side,
                amount: amount,
                price: price,
                total: total,
                fee: fee
            });
            
            // Update totals
            pairData[pair].totalFees += fee;
            
            if (side === 'Buy') {
                pairData[pair].totalBuyAmount += amount;
                pairData[pair].totalBuyValue += total;
                
                // Update current position
                const current = pairData[pair].currentPosition;
                const newAmount = current.amount + amount;
                const newCost = current.cost + total;
                
                current.amount = newAmount;
                current.cost = newCost;
                current.avgPrice = newCost / newAmount;
                
                console.log(`${pair} BUY: ${amount} @ ${price} = ${total}`);
                console.log(`  Position: ${current.amount} @ ${current.avgPrice.toFixed(6)} = ${current.cost.toFixed(2)}`);
                
            } else if (side === 'Sell') {
                pairData[pair].totalSellAmount += amount;
                pairData[pair].totalSellValue += total;
                
                console.log(`${pair} SELL: ${amount} @ ${price} = ${total}`);
                
                // Update position
                const current = pairData[pair].currentPosition;
                if (current.amount > 0) {
                    current.amount -= amount;
                    if (current.amount <= 0) {
                        current.amount = 0;
                        current.cost = 0;
                        current.avgPrice = 0;
                        console.log(`  Position fully closed`);
                    } else {
                        current.cost = current.amount * current.avgPrice;
                        console.log(`  New position: ${current.amount} @ ${current.avgPrice.toFixed(6)} = ${current.cost.toFixed(2)}`);
                    }
                } else {
                    console.log(`  No position to close`);
                }
            }
        });
        
        // Calculate final statistics with simple formula
        Object.keys(pairData).forEach(pairKey => {
            const pair = pairData[pairKey];
            
            // Simple profit calculation: Total Sell - Total Buy - Fees
            pair.netProfit = pair.totalSellValue - pair.totalBuyValue - pair.totalFees;
            
            // Calculate profit percentage based on total buy value
            if (pair.totalBuyValue > 0) {
                pair.profitPercentage = (pair.netProfit / pair.totalBuyValue) * 100;
            } else {
                pair.profitPercentage = 0;
            }
            
            // Calculate trade count
            pair.tradeCount = pair.trades.length;
            pair.buyCount = pair.trades.filter(t => t.side === 'Buy').length;
            pair.sellCount = pair.trades.filter(t => t.side === 'Sell').length;
            
            console.log(`${pair.pair} FINAL:`, {
                buyValue: pair.totalBuyValue.toFixed(2),
                sellValue: pair.totalSellValue.toFixed(2),
                fees: pair.totalFees.toFixed(2),
                netProfit: pair.netProfit.toFixed(2),
                profitPercentage: pair.profitPercentage.toFixed(2) + '%',
                currentPosition: pair.currentPosition.amount.toFixed(6)
            });
        });
        
        return pairData;
    }

    // Calculate monthly P&L statistics from trades
    // New approach: calculate profit by month and by trading pair
    static calculateMonthlyStats(trades) {
        console.log('Calculating monthly stats for', trades.length, 'trades');
        
        // Group trades by month
        const monthlyTrades = {};
        
        trades.forEach(trade => {
            const time = trade.Time;
            
            if (!time) {
                console.warn('Trade missing time:', trade);
                return;
            }
            
            // Parse date and get month key (YYYY-MM)
            const date = moment(time);
            if (!date.isValid()) {
                console.warn('Invalid date:', time);
                return;
            }
            
            const monthKey = date.format('YYYY-MM');
            const monthName = date.format('MMMM YYYY');
            
            if (!monthlyTrades[monthKey]) {
                monthlyTrades[monthKey] = {
                    monthKey: monthKey,
                    monthName: monthName,
                    trades: []
                };
            }
            
            monthlyTrades[monthKey].trades.push(trade);
        });
        
        // Calculate profit for each month using the same logic as pair profit
        const monthlyData = {};
        
        Object.keys(monthlyTrades).forEach(monthKey => {
            const monthTrades = monthlyTrades[monthKey].trades;
            const monthName = monthlyTrades[monthKey].monthName;
            
            console.log(`\n=== Processing month: ${monthName} ===`);
            console.log(`Trades in month: ${monthTrades.length}`);
            
            // Use the same pair profit calculation logic for this month's trades
            const pairData = this.calculatePairProfit(monthTrades);
            
            // Aggregate data for the month
            let totalBuyValue = 0;
            let totalSellValue = 0;
            let totalFees = 0;
            let totalProfit = 0;
            let tradeCount = 0;
            const pairs = {};
            
            Object.values(pairData).forEach(pair => {
                totalBuyValue += pair.totalBuyValue;
                totalSellValue += pair.totalSellValue;
                totalFees += pair.totalFees;
                totalProfit += pair.netProfit; // Use netProfit for total
                tradeCount += pair.tradeCount;
                
                pairs[pair.pair] = {
                    pair: pair.pair,
                    buyValue: pair.totalBuyValue,
                    sellValue: pair.totalSellValue,
                    fees: pair.totalFees,
                    profit: pair.netProfit, // Use netProfit for profit
                    buyCount: pair.buyCount,
                    sellCount: pair.sellCount
                };
            });
            
            monthlyData[monthKey] = {
                monthKey: monthKey,
                monthName: monthName,
                pairs: pairs,
                totalBuyValue: totalBuyValue,
                totalSellValue: totalSellValue,
                totalFees: totalFees,
                totalProfit: totalProfit,
                tradeCount: tradeCount
            };
            
            console.log(`Month ${monthName} summary:`, {
                buyValue: totalBuyValue.toFixed(2),
                sellValue: totalSellValue.toFixed(2),
                fees: totalFees.toFixed(2),
                profit: totalProfit.toFixed(2),
                pairs: Object.keys(pairs).length
            });
        });
        
        return monthlyData;
    }

    // Calculate daily statistics from trades with proper P&L tracking for grid trading
    // This function tracks positions across days and calculates only realized profits
    static calculateDailyStats(trades, options = {}) {
        const dailyStats = {};
        const groupedTrades = this.groupTradesByDate(trades);
        
        // Track positions across all days with detailed logging
        const globalPositions = {};
        
        Object.keys(groupedTrades).forEach(date => {
            const dayTrades = groupedTrades[date];
            
            // Group trades by trading pairs to calculate P&L correctly
            const pairStats = {};
            let totalVolume = 0;
            let totalFees = 0;
            let buyCount = 0;
            let sellCount = 0;
            
            // Track positions for each pair
            const positions = {};
            
            console.log(`\n=== Processing date: ${date} ===`);
            console.log(`Total trades for this day: ${dayTrades.length}`);
            
            dayTrades.forEach((trade, tradeIndex) => {
                const pair = trade.Pairs || 'UNKNOWN';
                const total = parseFloat(trade.Total) || 0;
                const fee = parseFloat(trade.Fee) || 0;
                const amount = parseFloat(trade['Executed Amount']) || 0;
                const price = parseFloat(trade['Filled Price']) || 0;
                
                totalVolume += total;
                totalFees += fee;
                
                if (!pairStats[pair]) {
                    pairStats[pair] = {
                        buyAmount: 0,
                        sellAmount: 0,
                        buyValue: 0,
                        sellValue: 0,
                        fees: 0,
                        realizedPnL: 0
                    };
                }
                
                if (!positions[pair]) {
                    positions[pair] = {
                        totalAmount: 0,
                        totalCost: 0,
                        averagePrice: 0
                    };
                }
                
                if (!globalPositions[pair]) {
                    globalPositions[pair] = {
                        totalAmount: 0,
                        totalCost: 0,
                        averagePrice: 0,
                        trades: [] // Track all trades for this pair
                    };
                }
                
                console.log(`\nTrade ${tradeIndex + 1}: ${trade.Side} ${amount} ${pair} @ ${price} = ${total}`);
                
                if (trade.Side === 'Buy') {
                    buyCount++;
                    pairStats[pair].buyAmount += amount;
                    pairStats[pair].buyValue += total;
                    
                    // Update global position
                    const oldAmount = globalPositions[pair].totalAmount;
                    const oldCost = globalPositions[pair].totalCost;
                    
                    globalPositions[pair].totalAmount += amount;
                    globalPositions[pair].totalCost += total;
                    globalPositions[pair].averagePrice = globalPositions[pair].totalCost / globalPositions[pair].totalAmount;
                    
                    // Add trade to history
                    globalPositions[pair].trades.push({
                        type: 'buy',
                        amount: amount,
                        price: price,
                        total: total,
                        fee: fee,
                        date: date
                    });
                    
                    console.log(`  BUY: ${pair}`);
                    console.log(`    Amount: ${oldAmount} + ${amount} = ${globalPositions[pair].totalAmount}`);
                    console.log(`    Cost: ${oldCost} + ${total} = ${globalPositions[pair].totalCost}`);
                    console.log(`    Avg Price: ${globalPositions[pair].averagePrice.toFixed(6)}`);
                    
                    // Update local position
                    positions[pair].totalAmount += amount;
                    positions[pair].totalCost += total;
                    positions[pair].averagePrice = positions[pair].totalCost / positions[pair].totalAmount;
                    
                } else if (trade.Side === 'Sell') {
                    sellCount++;
                    pairStats[pair].sellAmount += amount;
                    pairStats[pair].sellValue += total;
                    
                    console.log(`  SELL: ${pair}`);
                    console.log(`    Current position: ${globalPositions[pair].totalAmount} @ ${globalPositions[pair].averagePrice.toFixed(6)}`);
                    
                    // Calculate profit from this sell
                    if (globalPositions[pair].totalAmount > 0) {
                        const avgBuyPrice = globalPositions[pair].averagePrice;
                        const buyValue = amount * avgBuyPrice;
                        const realizedPnL = total - buyValue - fee;
                        
                        pairStats[pair].realizedPnL += realizedPnL;
                        
                        console.log(`    Sold: ${amount} @ ${price} = ${total}`);
                        console.log(`    Buy Value: ${amount} * ${avgBuyPrice.toFixed(6)} = ${buyValue.toFixed(2)}`);
                        console.log(`    Profit: ${total} - ${buyValue.toFixed(2)} - ${fee} = ${realizedPnL.toFixed(2)}`);
                        
                        // Update global position
                        const oldAmount = globalPositions[pair].totalAmount;
                        const oldCost = globalPositions[pair].totalCost;
                        
                        globalPositions[pair].totalAmount -= amount;
                        globalPositions[pair].totalCost -= (amount * avgBuyPrice);
                        
                        console.log(`    New position: ${globalPositions[pair].totalAmount} @ ${globalPositions[pair].averagePrice.toFixed(6)}`);
                        
                        if (globalPositions[pair].totalAmount <= 0) {
                            // Position fully closed
                            console.log(`    Position fully closed for ${pair}`);
                            globalPositions[pair].totalAmount = 0;
                            globalPositions[pair].totalCost = 0;
                            globalPositions[pair].averagePrice = 0;
                        } else {
                            // Recalculate average price
                            globalPositions[pair].averagePrice = globalPositions[pair].totalCost / globalPositions[pair].totalAmount;
                        }
                        
                        // Add trade to history
                        globalPositions[pair].trades.push({
                            type: 'sell',
                            amount: amount,
                            price: price,
                            total: total,
                            fee: fee,
                            date: date,
                            profit: realizedPnL
                        });
                        
                    } else {
                        console.log(`    WARNING: Selling ${amount} ${pair} but no position exists!`);
                    }
                    
                    // Update local position
                    positions[pair].totalAmount -= amount;
                    if (positions[pair].totalAmount <= 0) {
                        positions[pair].totalAmount = 0;
                        positions[pair].totalCost = 0;
                        positions[pair].averagePrice = 0;
                    } else {
                        positions[pair].totalCost = positions[pair].totalAmount * globalPositions[pair].averagePrice;
                    }
                }
                
                pairStats[pair].fees += fee;
            });
            
            // Calculate total realized P&L for the day (only from sells)
            let totalRealizedPnL = 0;
            Object.values(pairStats).forEach(pairStat => {
                totalRealizedPnL += pairStat.realizedPnL;
            });
            
            // Only show profit from sells, ignore accumulation losses
            const totalProfit = totalRealizedPnL;
            
            console.log(`\nDay Summary: ${date}`);
            console.log(`  Total Profit: ${totalProfit.toFixed(2)}`);
            console.log(`  Buy Count: ${buyCount}, Sell Count: ${sellCount}`);
            
            // Calculate win rate based on profitable sells
            const sellTrades = dayTrades.filter(trade => trade.Side === 'Sell');
            let profitableSells = 0;
            
            sellTrades.forEach(trade => {
                const pair = trade.Pairs || 'UNKNOWN';
                const pairStat = pairStats[pair];
                if (pairStat && pairStat.realizedPnL > 0) {
                    profitableSells++;
                }
            });
            
            const winRate = sellTrades.length > 0 ? (profitableSells / sellTrades.length) * 100 : 100;
            
            dailyStats[date] = {
                date: date,
                profit: totalProfit,
                volume: totalVolume,
                fees: totalFees,
                winRate: winRate,
                buyCount: buyCount,
                sellCount: sellCount,
                totalTrades: dayTrades.length,
                trades: dayTrades,
                pairStats: pairStats,
                positions: positions,
                globalPositions: { ...globalPositions }
            };
        });
        
        // Log final position summary
        console.log('\n=== Final Position Summary ===');
        Object.keys(globalPositions).forEach(pair => {
            const pos = globalPositions[pair];
            if (pos.totalAmount > 0) {
                console.log(`${pair}: ${pos.totalAmount} @ ${pos.averagePrice.toFixed(6)} = ${pos.totalCost.toFixed(2)}`);
            }
        });
        
        return dailyStats;
    }

    // Export data to CSV
    static exportToCSV(data, filename = 'trading-data.csv') {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => row[header]).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // Animate number counting
    static animateNumber(element, start, end, duration = 1000) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = this.formatCurrency(current);
        }, 16);
    }

    // Smooth scroll to element
    static scrollToElement(elementId, offset = 0) {
        const element = document.getElementById(elementId);
        if (element) {
            const top = element.offsetTop - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    }

    // Check if element is in viewport
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}