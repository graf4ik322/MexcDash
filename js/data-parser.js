// DataParser class for handling file uploads and data processing

class DataParser {
    constructor() {
        this.rawData = null;
        this.processedData = null;
        this.dailyStats = null;
        this.supportedColumns = {
            pairs: ['Pairs', 'Pair', 'Symbol'],
            time: ['Time', 'Date', 'Timestamp', 'DateTime'],
            side: ['Side', 'Type', 'Direction'],
            price: ['Filled Price', 'Price', 'Fill Price', 'Executed Price'],
            amount: ['Executed Amount', 'Amount', 'Quantity', 'Size'],
            total: ['Total', 'Value', 'Notional'],
            fee: ['Fee', 'Commission', 'Fees'],
            role: ['Role', 'Maker/Taker', 'Type']
        };
    }

    // Main method to parse uploaded file
    async parseFile(file) {
        try {
            Utils.showLoading(true, 'Загрузка файла...');

            // Validate file
            this.validateFile(file);

            // Parse based on file type
            let data;
            if (file.name.toLowerCase().endsWith('.csv')) {
                data = await this.parseCSVFile(file);
            } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                data = await this.parseExcelFile(file);
            } else {
                throw new Error('Неподдерживаемый формат файла');
            }

            Utils.showLoading(true, 'Обработка данных...');

            // Validate and process data
            this.validateData(data);
            this.rawData = data;
            this.processedData = this.normalizeData(data);
            // Calculate daily stats with simple P&L tracking
            this.dailyStats = Utils.calculateDailyStats(this.processedData);
            
            // Store processed data for recalculation
            this.rawProcessedData = this.processedData;

            Utils.showLoading(false);
            Utils.showToast('Данные успешно загружены', 'success');

            return {
                raw: this.rawData,
                processed: this.processedData,
                daily: this.dailyStats
            };

        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast(error.message, 'error');
            throw error;
        }
    }

    // Validate uploaded file
    validateFile(file) {
        if (!Utils.validateFileType(file)) {
            throw new Error('Пожалуйста, загрузите CSV или Excel файл');
        }

        if (!Utils.validateFileSize(file, 10)) {
            throw new Error('Размер файла не должен превышать 10 МБ');
        }
    }

    // Parse CSV file
    async parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const data = this.parseCSVText(csvText);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Ошибка чтения файла'));
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    // Parse CSV text content
    parseCSVText(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV файл должен содержать заголовки и данные');
        }

        // Parse headers
        const headers = this.parseCSVLine(lines[0]);
        const data = [];

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                try {
                    const values = this.parseCSVLine(line);
                    if (values.length === headers.length) {
                        const row = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index];
                        });
                        data.push(row);
                    }
                } catch (error) {
                    console.warn(`Ошибка парсинга строки ${i + 1}: ${error.message}`);
                }
            }
        }

        if (data.length === 0) {
            throw new Error('Не удалось извлечь данные из CSV файла');
        }

        return data;
    }

    // Parse CSV line with proper comma handling
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    // Parse Excel file using SheetJS
    async parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    Utils.showLoading(true, 'Чтение Excel файла...');
                    
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        throw new Error('Excel файл не содержит листов');
                    }
                    
                    // Get first sheet
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    if (!worksheet) {
                        throw new Error(`Не удалось прочитать лист: ${sheetName}`);
                    }
                    
                    Utils.showLoading(true, 'Преобразование данных...');
                    
                    // Convert to JSON with options for better parsing
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        header: 1, // Use first row as headers
                        defval: '', // Default value for empty cells
                        raw: false  // Convert numbers to strings for consistency
                    });
                    
                    if (jsonData.length < 2) {
                        throw new Error('Excel файл должен содержать заголовки и данные');
                    }
                    
                    // Convert array format to object format
                    const headers = jsonData[0];
                    const dataRows = jsonData.slice(1);
                    
                    const processedData = dataRows.map((row, index) => {
                        const obj = {};
                        headers.forEach((header, colIndex) => {
                            if (header) { // Skip empty headers
                                obj[header] = row[colIndex] || '';
                            }
                        });
                        return obj;
                    }).filter(row => Object.keys(row).length > 0); // Remove empty rows
                    
                    if (processedData.length === 0) {
                        throw new Error('Excel файл не содержит данных после обработки');
                    }
                    
                    console.log(`Excel файл успешно обработан: ${processedData.length} строк`);
                    resolve(processedData);
                    
                } catch (error) {
                    console.error('Ошибка при обработке Excel файла:', error);
                    reject(new Error(`Ошибка чтения Excel файла: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Ошибка чтения файла'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // Validate data structure
    validateData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Файл не содержит данных');
        }

        const firstRow = data[0];
        const headers = Object.keys(firstRow);

        // Check for required columns
        const requiredMappings = ['time', 'side', 'total'];
        const missingColumns = [];

        requiredMappings.forEach(mapping => {
            const found = this.supportedColumns[mapping].some(col => 
                headers.some(header => 
                    header.toLowerCase().includes(col.toLowerCase()) ||
                    col.toLowerCase().includes(header.toLowerCase())
                )
            );
            if (!found) {
                missingColumns.push(mapping);
            }
        });

        if (missingColumns.length > 0) {
            throw new Error(`Отсутствуют обязательные колонки: ${missingColumns.join(', ')}`);
        }

        // Validate data types in sample rows
        const sampleSize = Math.min(10, data.length);
        for (let i = 0; i < sampleSize; i++) {
            this.validateRow(data[i]);
        }
    }

    // Validate individual row
    validateRow(row) {
        // Check if time field exists and is valid
        const timeField = this.findColumnMapping(row, 'time');
        if (timeField && row[timeField]) {
            const date = moment(row[timeField]);
            if (!date.isValid()) {
                console.warn('Неверный формат даты:', row[timeField]);
            }
        }

        // Check if numeric fields are valid
        const numericFields = ['total', 'amount', 'fee', 'price'];
        numericFields.forEach(field => {
            const column = this.findColumnMapping(row, field);
            if (column && row[column]) {
                const value = parseFloat(row[column]);
                if (isNaN(value)) {
                    console.warn(`Неверное числовое значение в ${column}:`, row[column]);
                }
            }
        });
    }

    // Find column mapping for a field
    findColumnMapping(row, fieldType) {
        const headers = Object.keys(row);
        const possibleColumns = this.supportedColumns[fieldType] || [];
        
        return headers.find(header => 
            possibleColumns.some(col => 
                header.toLowerCase().includes(col.toLowerCase()) ||
                col.toLowerCase().includes(header.toLowerCase())
            )
        );
    }

    // Normalize data to standard format
    normalizeData(data) {
        return data.map(row => {
            const normalized = {};
            
            // Map all possible columns
            Object.keys(this.supportedColumns).forEach(fieldType => {
                const column = this.findColumnMapping(row, fieldType);
                if (column && row[column] !== undefined) {
                    let value = row[column];
                    
                    // Special handling for time/date fields from Excel
                    if (fieldType === 'time') {
                        value = this.normalizeDate(value);
                    }
                    
                    normalized[this.getStandardColumnName(fieldType)] = value;
                }
            });
            
            // Ensure required fields have default values
            if (!normalized.Time) {
                normalized.Time = new Date().toISOString();
            }
            if (!normalized.Side) {
                normalized.Side = 'Unknown';
            }
            if (!normalized.Total) {
                normalized.Total = '0';
            }
            if (!normalized.Fee) {
                normalized.Fee = '0';
            }
            
            return normalized;
        });
    }

    // Normalize date from Excel format
    normalizeDate(value) {
        if (!value) return '';
        
        // If it's already a string, try to parse it
        if (typeof value === 'string') {
            // Try different date formats
            const dateFormats = [
                'YYYY-MM-DD HH:mm:ss',
                'DD.MM.YYYY HH:mm:ss',
                'MM/DD/YYYY HH:mm:ss',
                'YYYY-MM-DD',
                'DD.MM.YYYY',
                'MM/DD/YYYY'
            ];
            
            for (const format of dateFormats) {
                const parsed = moment(value, format, true);
                if (parsed.isValid()) {
                    return parsed.toISOString();
                }
            }
            
            // Try to parse as ISO string
            const isoParsed = moment(value);
            if (isoParsed.isValid()) {
                return isoParsed.toISOString();
            }
        }
        
        // If it's a number (Excel date serial number)
        if (typeof value === 'number') {
            // Excel dates are days since 1900-01-01
            const excelEpoch = new Date(1900, 0, 1);
            const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
            return date.toISOString();
        }
        
        // If it's a Date object
        if (value instanceof Date) {
            return value.toISOString();
        }
        
        console.warn('Не удалось распарсить дату:', value);
        return value.toString();
    }

    // Get standard column name for field type
    getStandardColumnName(fieldType) {
        const mapping = {
            pairs: 'Pairs',
            time: 'Time',
            side: 'Side',
            price: 'Filled Price',
            amount: 'Executed Amount',
            total: 'Total',
            fee: 'Fee',
            role: 'Role'
        };
        return mapping[fieldType] || fieldType;
    }

    // Get processed data
    getProcessedData() {
        return this.processedData;
    }

    // Get daily statistics
    getDailyStats() {
        return this.dailyStats;
    }

    // Get data summary
    getSummary() {
        if (!this.processedData || !this.dailyStats) {
            return null;
        }

        const dates = Object.keys(this.dailyStats).sort();
        const totalTrades = this.processedData.length;
        const totalProfit = Object.values(this.dailyStats).reduce((sum, day) => sum + day.profit, 0);
        const totalFees = Object.values(this.dailyStats).reduce((sum, day) => sum + day.fees, 0);
        const totalVolume = Object.values(this.dailyStats).reduce((sum, day) => sum + day.volume, 0);
        
        const profitableDays = Object.values(this.dailyStats).filter(day => day.profit > 0).length;
        const winRate = (profitableDays / dates.length) * 100;

        return {
            totalTrades,
            totalProfit,
            totalFees,
            totalVolume,
            tradingDays: dates.length,
            winRate,
            dateRange: {
                start: dates[0],
                end: dates[dates.length - 1]
            },
            bestDay: this.getBestDay(),
            worstDay: this.getWorstDay()
        };
    }

    // Get best trading day
    getBestDay() {
        if (!this.dailyStats) return null;
        
        const days = Object.values(this.dailyStats);
        return days.reduce((best, day) => 
            day.profit > best.profit ? day : best
        );
    }

    // Get worst trading day
    getWorstDay() {
        if (!this.dailyStats) return null;
        
        const days = Object.values(this.dailyStats);
        return days.reduce((worst, day) => 
            day.profit < worst.profit ? day : worst
        );
    }

    // Filter data by date range
    filterByDateRange(startDate, endDate) {
        if (!this.dailyStats) return {};
        
        const start = moment(startDate);
        const end = moment(endDate);
        const filtered = {};
        
        Object.keys(this.dailyStats).forEach(date => {
            const current = moment(date);
            if (current.isBetween(start, end, 'day', '[]')) {
                filtered[date] = this.dailyStats[date];
            }
        });
        
        return filtered;
    }

    // Filter data by trade type
    filterByTradeType(type) {
        if (!this.processedData) return [];
        
        if (type === 'all') return this.processedData;
        
        return this.processedData.filter(trade => 
            trade.Side && trade.Side.toLowerCase() === type.toLowerCase()
        );
    }
}