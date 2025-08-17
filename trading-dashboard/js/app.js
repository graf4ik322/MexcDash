// Main application initialization

class TradingDashboardApp {
    constructor() {
        this.dashboard = null;
        this.initialized = false;
    }

    // Initialize the application
    init() {
        if (this.initialized) return;
        
        try {
            // Set up moment.js locale
            moment.locale('ru');
            
            // Initialize dashboard
            this.dashboard = new Dashboard();
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Set up keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Set up drag and drop for file upload
            this.setupDragAndDrop();
            
            // Set up responsive handling
            this.setupResponsiveHandling();
            
            this.initialized = true;
            console.log('Trading Dashboard initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Trading Dashboard:', error);
            Utils.showToast('Ошибка инициализации приложения', 'error');
        }
    }

    // Setup global error handling
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            Utils.showToast('Произошла неожиданная ошибка', 'error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            Utils.showToast('Ошибка обработки данных', 'error');
        });
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + O - Open file
            if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
                event.preventDefault();
                document.getElementById('fileInput').click();
            }
            
            // Ctrl/Cmd + E - Export data
            if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                event.preventDefault();
                if (this.dashboard && this.dashboard.getCurrentData()) {
                    this.dashboard.exportData();
                }
            }
            
            // Escape - Close any open modals or reset filters
            if (event.key === 'Escape') {
                this.resetToDefaults();
            }
            
            // Number keys 1-3 for period switching
            if (event.key >= '1' && event.key <= '3') {
                const periods = ['week', 'month', 'custom'];
                const period = periods[parseInt(event.key) - 1];
                if (period && this.dashboard) {
                    this.dashboard.switchPeriod(period);
                }
            }
        });
    }

    // Setup drag and drop functionality
    setupDragAndDrop() {
        const dropZone = document.body;
        const fileInput = document.getElementById('fileInput');
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            dropZone.classList.add('drag-over');
        }

        function unhighlight(e) {
            dropZone.classList.remove('drag-over');
        }

        // Handle dropped files
        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            if (files.length > 0) {
                const file = files[0];
                if (Utils.validateFileType(file)) {
                    fileInput.files = files;
                    this.dashboard.loadData(file);
                } else {
                    Utils.showToast('Пожалуйста, загрузите CSV или Excel файл', 'error');
                }
            }
        }, false);

        // Add CSS for drag over state
        const style = document.createElement('style');
        style.textContent = `
            .drag-over {
                background-color: rgba(0, 123, 255, 0.1) !important;
                border: 2px dashed var(--color-accent) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Setup responsive handling
    setupResponsiveHandling() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.dashboard) {
                    this.dashboard.updateCharts();
                }
            }, 250);
        });

        // Handle orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (this.dashboard) {
                    this.dashboard.refresh();
                }
            }, 500);
        });
    }

    // Reset to default state
    resetToDefaults() {
        if (this.dashboard) {
            // Reset filters
            document.getElementById('positionFilter').value = 'all';
            document.getElementById('sortBy').value = 'date';
            
            // Reset period to week
            this.dashboard.switchPeriod('week');
            
            // Refresh dashboard
            this.dashboard.refresh();
        }
    }

    // Load sample data for demonstration
    async loadSampleData() {
        try {
            // Check if we have the CSV file in the workspace
            const response = await fetch('../TradeHistory06_01_16.csv');
            if (response.ok) {
                const blob = await response.blob();
                const file = new File([blob], 'TradeHistory06_01_16.csv', { type: 'text/csv' });
                await this.dashboard.loadData(file);
                Utils.showToast('Демонстрационные данные загружены', 'success');
            }
        } catch (error) {
            console.log('Sample data not available:', error);
        }
    }

    // Public methods for external access
    getDashboard() {
        return this.dashboard;
    }

    isInitialized() {
        return this.initialized;
    }
}

// Global app instance
let app;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new TradingDashboardApp();
    app.init();
    
    // Add some helpful console messages
    console.log('🚀 Trading Dashboard готов к использованию!');
    console.log('💡 Горячие клавиши:');
    console.log('   Ctrl+O - Открыть файл');
    console.log('   Ctrl+E - Экспорт данных');
    console.log('   1-3 - Переключение периодов');
    console.log('   Esc - Сброс фильтров');
    
    // Try to load sample data if available
    // app.loadSampleData();
});

// Make app globally accessible for debugging
window.TradingDashboard = {
    app: () => app,
    version: '1.0.0',
    utils: Utils,
    resetData: () => {
        if (app && app.dashboard) {
            app.resetToDefaults();
        }
    }
};

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment if you want to add PWA capabilities
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered'))
        //     .catch(error => console.log('SW registration failed'));
    });
}