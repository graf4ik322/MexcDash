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

    // Calculate win rate from trades
    static calculateWinRate(trades) {
        if (!trades || trades.length === 0) return 0;
        
        const profitableTrades = trades.filter(trade => {
            const total = parseFloat(trade.Total) || 0;
            const fee = parseFloat(trade.Fee) || 0;
            return (total - fee) > 0;
        });
        
        return (profitableTrades.length / trades.length) * 100;
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

    // Calculate daily statistics from trades
    static calculateDailyStats(trades) {
        const dailyStats = {};
        const groupedTrades = this.groupTradesByDate(trades);
        
        Object.keys(groupedTrades).forEach(date => {
            const dayTrades = groupedTrades[date];
            
            let totalProfit = 0;
            let totalVolume = 0;
            let totalFees = 0;
            let buyCount = 0;
            let sellCount = 0;
            
            dayTrades.forEach(trade => {
                const total = parseFloat(trade.Total) || 0;
                const fee = parseFloat(trade.Fee) || 0;
                const amount = parseFloat(trade['Executed Amount']) || 0;
                
                totalVolume += total;
                totalFees += fee;
                
                if (trade.Side === 'Buy') {
                    buyCount++;
                    totalProfit -= (total + fee); // Cost for buying
                } else if (trade.Side === 'Sell') {
                    sellCount++;
                    totalProfit += (total - fee); // Revenue from selling
                }
            });
            
            const winRate = this.calculateWinRate(dayTrades);
            
            dailyStats[date] = {
                date: date,
                profit: totalProfit,
                volume: totalVolume,
                fees: totalFees,
                winRate: winRate,
                buyCount: buyCount,
                sellCount: sellCount,
                totalTrades: dayTrades.length,
                trades: dayTrades
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