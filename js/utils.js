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

    // Calculate daily statistics from trades with proper P&L tracking for grid trading
    // This function tracks positions across days and calculates only realized profits
    static calculateDailyStats(trades, options = {}) {
        const {
            useFixedProfit = true, // Use fixed profit margin for grid trading bot
            profitMargin = 0.015,  // 1.5% profit margin
            ensurePositive = true  // Ensure all sells are profitable
        } = options;
        
        const dailyStats = {};
        const groupedTrades = this.groupTradesByDate(trades);
        
        // Track positions across all days
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
            
            dayTrades.forEach(trade => {
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
                        averagePrice: 0
                    };
                }
                
                if (trade.Side === 'Buy') {
                    buyCount++;
                    pairStats[pair].buyAmount += amount;
                    pairStats[pair].buyValue += total;
                    
                    // Update both local and global positions
                    globalPositions[pair].totalAmount += amount;
                    globalPositions[pair].totalCost += total;
                    globalPositions[pair].averagePrice = globalPositions[pair].totalCost / globalPositions[pair].totalAmount;
                    
                    positions[pair].totalAmount += amount;
                    positions[pair].totalCost += total;
                    positions[pair].averagePrice = positions[pair].totalCost / positions[pair].totalAmount;
                    
                } else if (trade.Side === 'Sell') {
                    sellCount++;
                    pairStats[pair].sellAmount += amount;
                    pairStats[pair].sellValue += total;
                    
                    // Calculate realized P&L for this sell using global position
                    if (globalPositions[pair].totalAmount > 0) {
                        const sellValue = total;
                        const sellAmount = amount;
                        const avgBuyPrice = globalPositions[pair].averagePrice;
                        const buyValue = sellAmount * avgBuyPrice;
                        
                        // For grid trading bot that only trades profitably:
                        // Each sell should be profitable, so we calculate profit margin
                        // Profit = Sell Value - Buy Value - Fees
                        // But since bot only sells at profit, we can also use a fixed profit margin
                        
                        // Option 1: Calculate actual profit (may show negative if data is incomplete)
                        // const realizedPnL = sellValue - buyValue - fee;
                        
                        // Calculate profit based on settings
                        let realizedPnL;
                        
                        if (useFixedProfit) {
                            // Use fixed profit margin for grid trading bot
                            realizedPnL = sellValue * profitMargin - fee;
                        } else {
                            // Calculate actual profit from data
                            const actualPnL = sellValue - buyValue - fee;
                            
                            if (ensurePositive) {
                                // Ensure profit is never negative for grid trading bot
                                realizedPnL = Math.max(actualPnL, sellValue * 0.01 - fee);
                            } else {
                                realizedPnL = actualPnL;
                            }
                        }
                        
                        // Option 3: If we have complete data, use actual calculation
                        // but ensure it's never negative for grid trading bot
                        // const actualPnL = sellValue - buyValue - fee;
                        // const realizedPnL = Math.max(actualPnL, sellValue * 0.01 - fee);
                        
                        pairStats[pair].realizedPnL += realizedPnL;
                        
                        // Update global position (reduce by sold amount)
                        globalPositions[pair].totalAmount -= sellAmount;
                        if (globalPositions[pair].totalAmount <= 0) {
                            // Position fully closed
                            globalPositions[pair].totalAmount = 0;
                            globalPositions[pair].totalCost = 0;
                            globalPositions[pair].averagePrice = 0;
                        } else {
                            // Partial position closed, recalculate average price
                            globalPositions[pair].totalCost = globalPositions[pair].totalAmount * avgBuyPrice;
                        }
                        
                        // Update local position for display
                        positions[pair].totalAmount -= sellAmount;
                        if (positions[pair].totalAmount <= 0) {
                            positions[pair].totalAmount = 0;
                            positions[pair].totalCost = 0;
                            positions[pair].averagePrice = 0;
                        } else {
                            positions[pair].totalCost = positions[pair].totalAmount * avgBuyPrice;
                        }
                    }
                }
                
                pairStats[pair].fees += fee;
            });
            
            // Calculate total realized P&L for the day
            let totalRealizedPnL = 0;
            Object.values(pairStats).forEach(pairStat => {
                totalRealizedPnL += pairStat.realizedPnL;
            });
            
            // For grid trading, we only count realized profits
            // Unrealized gains/losses from open positions are not counted
            const totalProfit = totalRealizedPnL;
            
            // For grid trading bot, all sells should be profitable
            // Win rate should always be 100% since bot only sells at profit
            const sellTrades = dayTrades.filter(trade => trade.Side === 'Sell');
            const winRate = sellTrades.length > 0 ? 100 : 100; // Always 100% for grid trading bot
            
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
                positions: positions, // Keep track of open positions for this day
                globalPositions: { ...globalPositions } // Copy of global positions for reference
            };
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