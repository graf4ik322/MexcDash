// Dashboard class for managing UI and data visualization

class Dashboard {
    constructor() {
        this.dataParser = new DataParser();
        this.pairData = null;
        this.charts = {};
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadData(e.target.files[0]);
            }
        });

        // Sort options
        document.getElementById('sortProfit').addEventListener('change', () => this.updatePairCards());
        document.getElementById('sortName').addEventListener('change', () => this.updatePairCards());
    }

    async loadData(file) {
        try {
            Utils.showLoading(true);
            console.log('Loading file:', file.name);
            
            const result = await this.dataParser.parseFile(file);
            console.log('File loaded successfully:', result);
            
            this.pairData = result.pairs;
            console.log('Pair data set:', this.pairData);
            console.log('Number of pairs:', Object.keys(this.pairData).length);
            
            this.updateDashboard();
            this.showDashboard();
            
            console.log('Dashboard updated successfully');
        } catch (error) {
            console.error('Error loading data:', error);
            Utils.showToast('Ошибка загрузки файла: ' + error.message, 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    showDashboard() {
        document.getElementById('emptyState').classList.add('d-none');
        document.getElementById('dashboardContent').classList.remove('d-none');
    }

    updateDashboard() {
        if (!this.pairData) return;
        
        this.updateSummaryCards();
        this.updatePairCards();
        this.updateCharts();
    }

    updateSummaryCards() {
        const pairs = Object.values(this.pairData);
        
        // Calculate totals
        const totalProfit = pairs.reduce((sum, pair) => sum + pair.netProfit, 0);
        const totalTrades = pairs.reduce((sum, pair) => sum + pair.tradeCount, 0);
        const totalFees = pairs.reduce((sum, pair) => sum + pair.totalFees, 0);
        const totalPairs = pairs.length;

        // Update summary cards
        document.getElementById('totalProfit').textContent = Utils.formatCurrency(totalProfit);
        document.getElementById('totalPairs').textContent = totalPairs;
        document.getElementById('totalTrades').textContent = totalTrades;
        document.getElementById('totalFees').textContent = Utils.formatCurrency(totalFees);
    }

    updatePairCards() {
        const container = document.getElementById('pairCards');
        container.innerHTML = '';
        
        if (!this.pairData || Object.keys(this.pairData).length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        Нет данных по парам для отображения
                    </div>
                </div>
            `;
            return;
        }
        
        // Sort pairs based on selected option
        let sortedPairs;
        if (document.getElementById('sortProfit').checked) {
            sortedPairs = Object.values(this.pairData)
                .sort((a, b) => b.netProfit - a.netProfit);
        } else {
            sortedPairs = Object.values(this.pairData)
                .sort((a, b) => a.pair.localeCompare(b.pair));
        }
        
        sortedPairs.forEach(pairData => {
            const card = this.createPairCard(pairData);
            container.appendChild(card);
        });
    }

    createPairCard(pairData) {
        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 col-sm-12';
        
        const profitClass = Utils.getProfitClass(pairData.netProfit);
        
        col.innerHTML = `
            <div class="pair-card ${profitClass} fade-in">
                <div class="pair-card-header">
                    <div class="pair-card-title">
                        <h5 class="mb-0">${pairData.pair}</h5>
                        <div class="pair-subtitle">${pairData.tradeCount} сделок</div>
                    </div>
                    <div class="pair-card-status ${profitClass}"></div>
                </div>
                
                <div class="pair-card-profit ${profitClass} mb-4">
                    <div class="profit-amount">${Utils.formatCurrency(pairData.netProfit)}</div>
                    <div class="profit-percentage">${pairData.profitPercentage.toFixed(2)}%</div>
                </div>
                
                <div class="pair-card-stats mb-3">
                    <div class="row g-3">
                        <div class="col-6">
                            <div class="stat-item">
                                <div class="stat-label">Покупки</div>
                                <div class="stat-value text-info">${Utils.formatCurrency(pairData.totalBuyValue)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-item">
                                <div class="stat-label">Продажи</div>
                                <div class="stat-value text-success">${Utils.formatCurrency(pairData.totalSellValue)}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="pair-card-details">
                    <div class="row g-2">
                        <div class="col-4">
                            <div class="detail-item">
                                <div class="detail-label">Покупок</div>
                                <div class="detail-value">${pairData.buyCount}</div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="detail-item">
                                <div class="detail-label">Продаж</div>
                                <div class="detail-value">${pairData.sellCount}</div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="detail-item">
                                <div class="detail-label">Комиссии</div>
                                <div class="detail-value text-warning">${Utils.formatCurrency(pairData.totalFees)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return col;
    }

    updateCharts() {
        this.createProfitChart();
        this.createPieChart();
    }

    createProfitChart() {
        const ctx = document.getElementById('profitChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.profit) {
            this.charts.profit.destroy();
        }

        const pairs = Object.values(this.pairData)
            .filter(pair => pair.netProfit !== 0)
            .sort((a, b) => Math.abs(b.netProfit) - Math.abs(a.netProfit))
            .slice(0, 15);

        const labels = pairs.map(pair => pair.pair);
        const data = pairs.map(pair => pair.netProfit);
        const colors = pairs.map(pair => pair.netProfit >= 0 ? '#198754' : '#dc3545');

        this.charts.profit = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Прибыль (USDT)',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    createPieChart() {
        const ctx = document.getElementById('pieChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.pie) {
            this.charts.pie.destroy();
        }

        const pairs = Object.values(this.pairData)
            .filter(pair => pair.netProfit > 0)
            .sort((a, b) => b.netProfit - a.netProfit)
            .slice(0, 8);

        const labels = pairs.map(pair => pair.pair);
        const data = pairs.map(pair => pair.netProfit);

        this.charts.pie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#198754', '#20c997', '#0dcaf0', '#0d6efd',
                        '#6610f2', '#6f42c1', '#d63384', '#fd7e14'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});