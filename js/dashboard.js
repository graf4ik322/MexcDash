// Dashboard class for managing UI and data visualization

class Dashboard {
    constructor() {
        this.dataParser = new DataParser();
        this.currentPeriod = 'week';
        this.currentFilter = 'all';
        this.currentSort = 'date';
        this.dailyData = null;
        this.filteredData = null;
        this.charts = {
            profit: null,
            winRate: null
        };
        
        this.initializeEventListeners();
    }

    // Initialize event listeners
    initializeEventListeners() {
        // File upload
        document.getElementById('loadDataBtn').addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput.files.length > 0) {
                this.loadData(fileInput.files[0]);
            } else {
                Utils.showToast('Пожалуйста, выберите файл', 'error');
            }
        });

        // Period switching
        document.querySelectorAll('[data-period]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.target.dataset.period;
                this.switchPeriod(period);
            });
        });

        // Custom period
        document.getElementById('applyPeriod').addEventListener('click', () => {
            this.applyCustomPeriod();
        });

        // Filters
        document.getElementById('positionFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.updateDashboard();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.updateDashboard();
        });

        // Export
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Show only profit days toggle
        document.getElementById('showOnlyProfitDays').addEventListener('change', (e) => {
            this.updateDashboard();
        });



        // File input change
        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                document.getElementById('loadDataBtn').textContent = 'Загрузить';
            }
        });
    }



    // Load data from file
    async loadData(file) {
        try {
            const result = await this.dataParser.parseFile(file);
            this.dailyData = result.daily;
            this.updateDashboard();
            this.showDashboard();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // Show dashboard and hide welcome screen
    showDashboard() {
        document.getElementById('welcomeScreen').classList.add('d-none');
        document.getElementById('dashboard').classList.remove('d-none');
    }

    // Switch period
    switchPeriod(period) {
        this.currentPeriod = period;
        
        // Update button states
        document.querySelectorAll('[data-period]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-period="${period}"]`).classList.add('active');
        
        // Show/hide custom period controls
        const customPeriod = document.getElementById('customPeriod');
        if (period === 'custom') {
            customPeriod.style.display = 'flex';
        } else {
            customPeriod.style.display = 'none';
            this.updateDashboard();
        }
    }

    // Apply custom period
    applyCustomPeriod() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            Utils.showToast('Пожалуйста, выберите даты начала и окончания', 'error');
            return;
        }
        
        if (moment(startDate).isAfter(moment(endDate))) {
            Utils.showToast('Дата начала не может быть позже даты окончания', 'error');
            return;
        }
        
        this.updateDashboard();
    }

    // Update dashboard with current filters
    updateDashboard() {
        if (!this.dailyData) return;
        
        this.filteredData = this.getFilteredData();
        this.renderCards();
        this.renderSummary();
        this.updateCharts();
    }

    // Get filtered data based on current settings
    getFilteredData() {
        if (!this.dailyData) return {};
        
        let filtered = { ...this.dailyData };
        
        // Apply date range filter
        if (this.currentPeriod === 'custom') {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            if (startDate && endDate) {
                filtered = this.dataParser.filterByDateRange(startDate, endDate);
            }
        } else {
            const dateRange = Utils.getDateRange(this.currentPeriod);
            filtered = this.dataParser.filterByDateRange(dateRange.start, dateRange.end);
        }
        
        // Apply position filter
        if (this.currentFilter !== 'all') {
            Object.keys(filtered).forEach(date => {
                const dayData = filtered[date];
                const filteredTrades = dayData.trades.filter(trade => {
                    if (this.currentFilter === 'buy') return trade.Side === 'Buy';
                    if (this.currentFilter === 'sell') return trade.Side === 'Sell';
                    return true;
                });
                
                if (filteredTrades.length > 0) {
                    filtered[date] = {
                        ...dayData,
                        trades: filteredTrades
                    };
                    // Recalculate stats for filtered trades
                    filtered[date] = this.recalculateDayStats(filtered[date]);
                } else {
                    delete filtered[date];
                }
            });
        }
        
        return filtered;
    }

    // Recalculate day statistics for filtered trades
    recalculateDayStats(dayData) {
        const trades = dayData.trades;
        let totalProfit = 0;
        let totalVolume = 0;
        let totalFees = 0;
        let buyCount = 0;
        let sellCount = 0;
        
        trades.forEach(trade => {
            const total = parseFloat(trade.Total) || 0;
            const fee = parseFloat(trade.Fee) || 0;
            
            totalVolume += total;
            totalFees += fee;
            
            if (trade.Side === 'Buy') {
                buyCount++;
                totalProfit -= (total + fee);
            } else if (trade.Side === 'Sell') {
                sellCount++;
                totalProfit += (total - fee);
            }
        });
        
        const winRate = Utils.calculateWinRate(trades);
        
        return {
            ...dayData,
            profit: totalProfit,
            volume: totalVolume,
            fees: totalFees,
            winRate: winRate,
            buyCount: buyCount,
            sellCount: sellCount,
            totalTrades: trades.length
        };
    }

    // Render daily cards
    renderCards() {
        const container = document.getElementById('dailyCards');
        container.innerHTML = '';
        
        if (!this.filteredData || Object.keys(this.filteredData).length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        Нет данных для отображения в выбранном периоде
                    </div>
                </div>
            `;
            return;
        }
        
        const sortedDates = this.getSortedDates();
        
        // For grid trading, optionally filter to show only days with sells (completed operations)
        const showOnlyProfitDays = document.getElementById('showOnlyProfitDays').checked;
        const daysToShow = sortedDates.filter(date => {
            const dayData = this.filteredData[date];
            if (showOnlyProfitDays) {
                return dayData.sellCount > 0; // Show only days with sales
            }
            return true; // Show all days
        });
        
        if (daysToShow.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning">
                        <i class="bi bi-info-circle me-2"></i>
                        Нет завершенных операций (продаж) в выбранном периоде
                    </div>
                </div>
            `;
            return;
        }
        
        daysToShow.forEach(date => {
            const dayData = this.filteredData[date];
            const card = this.createDailyCard(dayData);
            container.appendChild(card);
        });
    }

    // Get count of open positions for a day
    getOpenPositionsCount(dayData) {
        if (!dayData.globalPositions) return 0;
        
        let openPositionsCount = 0;
        Object.values(dayData.globalPositions).forEach(position => {
            if (position.totalAmount > 0) {
                openPositionsCount++;
            }
        });
        return openPositionsCount;
    }

    // Get summary of open positions across all data
    getOpenPositionsSummary() {
        if (!this.filteredData) return { totalOpen: 0, totalValue: 0 };
        
        const dates = Object.keys(this.filteredData).sort();
        if (dates.length === 0) return { totalOpen: 0, totalValue: 0 };
        
        // Get the latest day's global positions
        const latestDay = this.filteredData[dates[dates.length - 1]];
        if (!latestDay.globalPositions) return { totalOpen: 0, totalValue: 0 };
        
        let totalOpen = 0;
        let totalValue = 0;
        
        Object.values(latestDay.globalPositions).forEach(position => {
            if (position.totalAmount > 0) {
                totalOpen++;
                totalValue += position.totalCost;
            }
        });
        
                return { totalOpen, totalValue };
    }

    // Get sorted dates based on current sort setting
    getSortedDates() {
        const dates = Object.keys(this.filteredData);
        
        return dates.sort((a, b) => {
            switch (this.currentSort) {
                case 'profit':
                    return this.filteredData[b].profit - this.filteredData[a].profit;
                case 'volume':
                    return this.filteredData[b].volume - this.filteredData[a].volume;
                case 'date':
                default:
                    return moment(b).valueOf() - moment(a).valueOf();
            }
        });
    }

    // Create daily card element
    createDailyCard(dayData) {
        const col = document.createElement('div');
        col.className = 'col-lg-3 col-md-4 col-sm-6';
        
        const profitClass = Utils.getProfitClass(dayData.profit);
        const profitIcon = Utils.getProfitIcon(dayData.profit);
        const dateInfo = Utils.formatDateWithDay(dayData.date);
        const profitPercent = dayData.volume > 0 ? (dayData.profit / dayData.volume) * 100 : 0;
        
        col.innerHTML = `
            <div class="daily-card ${profitClass} fade-in">
                <div class="daily-card-header">
                    <div class="daily-card-date">
                        <div class="text-muted">${dateInfo.day}</div>
                        <div class="text-secondary fw-semibold">${dateInfo.date}</div>
                    </div>
                    <div class="daily-card-status ${profitClass}"></div>
                </div>
                
                <div class="daily-card-profit ${profitClass} mb-2">
                    <span class="fs-4 fw-bold">${Utils.formatCurrency(dayData.profit)}</span>
                </div>
                
                <div class="daily-card-percent ${profitClass} mb-3">
                    <i class="bi ${profitIcon} me-1"></i>
                    <span class="fw-semibold">${Utils.formatPercent(profitPercent)}</span>
                    <small class="text-muted ms-2">ROI</small>
                </div>
                
                <div class="row g-2 mb-3">
                    <div class="col-4">
                        <div class="text-center">
                            <div class="text-muted small">Всего</div>
                            <div class="fw-bold text-primary">${dayData.totalTrades}</div>
                        </div>
                    </div>
                                            <div class="col-4">
                            <div class="text-center">
                                <div class="text-muted small">Покупки</div>
                                <div class="fw-bold text-info">${dayData.buyCount}</div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="text-center">
                                <div class="text-muted small">Продажи</div>
                                <div class="fw-bold text-success">${dayData.sellCount}</div>
                            </div>
                        </div>
                </div>
                
                <div class="row g-2">
                    <div class="col-4">
                        <div class="text-center">
                            <div class="text-muted small">Win Rate</div>
                            <div class="fw-bold ${dayData.winRate >= 50 ? 'text-success' : 'text-danger'}">${dayData.winRate.toFixed(0)}%</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="text-center">
                            <div class="text-muted small">Объем</div>
                            <div class="fw-semibold small">${Utils.formatCurrency(dayData.volume)}</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="text-center">
                            <div class="text-muted small">Комиссии</div>
                            <div class="fw-semibold small text-warning">${Utils.formatCurrency(dayData.fees)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="daily-card-progress">
                    <div class="daily-card-progress-bar ${profitClass}" 
                         style="width: ${Math.min(Math.abs(profitPercent), 100)}%"></div>
                </div>
                
                <div class="daily-card-tooltip">
                    <div class="row g-2">
                        <div class="col-6">
                            <div class="text-center">
                                <div class="tooltip-label">Торговых пар</div>
                                <div class="tooltip-value text-info">${Object.keys(dayData.pairStats || {}).length}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="text-center">
                                <div class="tooltip-label">Прибыль на продажу</div>
                                <div class="tooltip-value text-secondary">${dayData.sellCount > 0 ? Utils.formatCurrency(dayData.profit / dayData.sellCount) : '$0.00'}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="text-center">
                                <div class="tooltip-label">Валовая прибыль</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="text-center">
                                <div class="tooltip-label">Открытые позиции</div>
                                <div class="tooltip-value text-warning">${this.getOpenPositionsCount(dayData)}</div>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="text-center">
                                <div class="tooltip-label">Реализованная прибыль</div>
                                <div class="tooltip-value ${Utils.getProfitClass(dayData.profit)}">${Utils.formatCurrency(dayData.profit)}</div>
                            </div>
                        </div>
                                <div class="tooltip-value ${profitClass}">${Utils.formatCurrency(dayData.profit)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="text-center">
                                <div class="tooltip-label">Чистая прибыль</div>
                                <div class="tooltip-value ${Utils.getProfitClass(dayData.profit - dayData.fees)} fw-bold">
                                    ${Utils.formatCurrency(dayData.profit - dayData.fees)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return col;
    }

    // Render summary panel
    renderSummary() {
        if (!this.filteredData) return;
        
        const dates = Object.keys(this.filteredData);
        const totalProfit = Object.values(this.filteredData).reduce((sum, day) => sum + day.profit, 0);
        const totalTrades = Object.values(this.filteredData).reduce((sum, day) => sum + day.totalTrades, 0);
        const totalFees = Object.values(this.filteredData).reduce((sum, day) => sum + day.fees, 0);
        const profitableDays = Object.values(this.filteredData).filter(day => day.profit > 0).length;
        const overallWinRate = dates.length > 0 ? (profitableDays / dates.length) * 100 : 0;
        
        // Update period display
        let periodDisplay;
        if (this.currentPeriod === 'custom') {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            if (startDate && endDate) {
                periodDisplay = `${Utils.formatDate(startDate)} - ${Utils.formatDate(endDate)}`;
            } else {
                periodDisplay = 'Произвольный период';
            }
        } else {
            const dateRange = Utils.getDateRange(this.currentPeriod);
            periodDisplay = dateRange.display;
        }
        
        // Update summary elements
        document.getElementById('currentPeriod').textContent = periodDisplay;
        
        const totalProfitEl = document.getElementById('totalProfit');
        totalProfitEl.textContent = Utils.formatCurrency(totalProfit);
        totalProfitEl.className = `fw-bold fs-4 ${Utils.getProfitClass(totalProfit)}`;
        
        document.getElementById('tradingDays').textContent = dates.length;
        document.getElementById('overallWinRate').textContent = `${overallWinRate.toFixed(1)}%`;
        document.getElementById('totalTrades').textContent = totalTrades.toLocaleString();
        document.getElementById('totalFees').textContent = Utils.formatCurrency(totalFees);
        
        // Calculate and display open positions info
        const openPositionsInfo = this.getOpenPositionsSummary();
        if (openPositionsInfo.totalOpen > 0) {
            document.getElementById('openPositionsInfo').innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <strong>Открытые позиции:</strong> ${openPositionsInfo.totalOpen} пар на сумму ${Utils.formatCurrency(openPositionsInfo.totalValue)}
                </div>
            `;
            document.getElementById('openPositionsInfo').classList.remove('d-none');
        } else {
            document.getElementById('openPositionsInfo').classList.add('d-none');
        }
    }

    // Update charts
    updateCharts() {
        this.updateProfitChart();
        this.updateWinRateChart();
    }

    // Update profit chart
    updateProfitChart() {
        const ctx = document.getElementById('profitChart').getContext('2d');
        
        if (this.charts.profit) {
            this.charts.profit.destroy();
        }
        
        if (!this.filteredData || Object.keys(this.filteredData).length === 0) {
            return;
        }
        
        const sortedDates = Object.keys(this.filteredData).sort();
        const cumulativeData = [];
        let cumulative = 0;
        
        const labels = sortedDates.map(date => Utils.formatDate(date));
        const data = sortedDates.map(date => {
            cumulative += this.filteredData[date].profit;
            return cumulative;
        });
        
        this.charts.profit = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Кумулятивная прибыль',
                    data: data,
                    borderColor: '#007BFF',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#b0b0b0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#b0b0b0',
                            callback: function(value) {
                                return Utils.formatCurrency(value);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 6
                    }
                }
            }
        });
    }

    // Update win rate chart
    updateWinRateChart() {
        const ctx = document.getElementById('winRateChart').getContext('2d');
        
        if (this.charts.winRate) {
            this.charts.winRate.destroy();
        }
        
        if (!this.filteredData || Object.keys(this.filteredData).length === 0) {
            return;
        }
        
        const profitableDays = Object.values(this.filteredData).filter(day => day.profit > 0).length;
        const totalDays = Object.keys(this.filteredData).length;
        const winRate = totalDays > 0 ? (profitableDays / totalDays) * 100 : 0;
        const lossRate = 100 - winRate;
        
        this.charts.winRate = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Прибыльные дни', 'Убыточные дни'],
                datasets: [{
                    data: [winRate, lossRate],
                    backgroundColor: ['#00C851', '#FF3547'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    // Export filtered data
    exportData() {
        if (!this.filteredData) {
            Utils.showToast('Нет данных для экспорта', 'error');
            return;
        }
        
        const exportData = [];
        Object.keys(this.filteredData).forEach(date => {
            const dayData = this.filteredData[date];
            exportData.push({
                Date: date,
                Profit: dayData.profit.toFixed(2),
                Volume: dayData.volume.toFixed(2),
                Fees: dayData.fees.toFixed(2),
                WinRate: dayData.winRate.toFixed(2),
                TotalTrades: dayData.totalTrades,
                BuyTrades: dayData.buyCount,
                SellTrades: dayData.sellCount
            });
        });
        
        const filename = `trading-summary-${moment().format('YYYY-MM-DD')}.csv`;
        Utils.exportToCSV(exportData, filename);
        Utils.showToast('Данные экспортированы', 'success');
    }

    // Get current data for external access
    getCurrentData() {
        return this.filteredData;
    }

    // Refresh dashboard
    refresh() {
        this.updateDashboard();
    }
}