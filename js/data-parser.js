// DataParser class for handling file uploads and data processing

class DataParser {
    constructor() {
        this.rawData = null;
        this.processedData = null;
        this.dailyStats = null;
        this.supportedColumns = {
            pairs: ['Pairs', 'Pair', 'Symbol', 'Trading Pair', 'Market', 'Instrument', 'Asset', 'Currency Pair'],
            time: ['Time', 'Date', 'Timestamp', 'DateTime', 'Created Time', 'Trade Time', 'Execution Time', 'Order Time', 'Fill Time', 'Created', 'Trade Date'],
            side: ['Side', 'Type', 'Direction', 'Order Side', 'Trade Side', 'Buy/Sell', 'Order Type', 'Action'],
            price: ['Filled Price', 'Price', 'Fill Price', 'Executed Price', 'Trade Price', 'Execution Price', 'Order Price', 'Market Price', 'Last Price'],
            amount: ['Executed Amount', 'Amount', 'Quantity', 'Size', 'Trade Amount', 'Volume', 'Executed Quantity', 'Fill Amount', 'Order Amount'],
            total: ['Total', 'Value', 'Notional', 'Trade Value', 'Gross Amount', 'Net Amount', 'Order Value', 'Fill Value', 'Trade Total'],
            fee: ['Fee', 'Commission', 'Fees', 'Trading Fee', 'Transaction Fee', 'Order Fee', 'Fill Fee', 'Commission Fee'],
            role: ['Role', 'Maker/Taker', 'Type', 'Order Type']
        };
        
        // Exact mapping for the specific XLSX file headers
        this.exactHeaders = {
            'Pairs': 'Pairs',
            'Time': 'Time', 
            'Side': 'Side',
            'Filled Price': 'Filled Price',
            'Executed Amount': 'Executed Amount',
            'Total': 'Total',
            'Fee': 'Fee',
            'Role': 'Role'
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
                        throw new Error('Excel файл должен содержать данные');
                    }
                    
                    console.log('Raw Excel data structure:', jsonData.slice(0, 3));
                    
                    // The first row is empty, data starts from second row
                    // We need to use the known headers from the file structure
                    const headers = ['Pairs', 'Time', 'Side', 'Filled Price', 'Executed Amount', 'Total', 'Fee', 'Role'];
                    const dataRows = jsonData.slice(1); // Start from second row
                    
                    console.log('Using headers:', headers);
                    
                    const processedData = dataRows.map((row, index) => {
                        const obj = {};
                        headers.forEach((header, colIndex) => {
                            if (row[colIndex] !== undefined && row[colIndex] !== null && row[colIndex] !== '') {
                                obj[header] = row[colIndex];
                            } else {
                                obj[header] = '';
                            }
                        });
                        return obj;
                    }).filter(row => {
                        // Filter out completely empty rows
                        return Object.values(row).some(value => value !== '' && value !== null && value !== undefined);
                    });
                    
                    if (processedData.length === 0) {
                        throw new Error('Excel файл не содержит данных после обработки');
                    }
                    
                    console.log(`Excel файл успешно обработан: ${processedData.length} строк`);
                    console.log('Sample processed row:', processedData[0]);
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
        
        console.log('Found headers:', headers);

        // Check for required columns with more flexible matching
        const requiredMappings = ['time', 'side', 'total'];
        const missingColumns = [];
        const foundColumns = {};

        requiredMappings.forEach(mapping => {
            const found = this.supportedColumns[mapping].some(col => 
                headers.some(header => 
                    header.toLowerCase().includes(col.toLowerCase()) ||
                    col.toLowerCase().includes(header.toLowerCase())
                )
            );
            if (!found) {
                missingColumns.push(mapping);
            } else {
                foundColumns[mapping] = true;
            }
        });

        if (missingColumns.length > 0) {
            console.warn('Missing columns:', missingColumns);
            console.log('Available headers:', headers);
            console.log('Supported columns:', this.supportedColumns);
            
            // Show warning but don't block processing
            console.warn(`Предупреждение: отсутствуют некоторые колонки: ${missingColumns.join(', ')}`);
            console.warn('Система попытается обработать файл с доступными данными');
            
            // Try to find alternative columns
            missingColumns.forEach(missing => {
                console.log(`Ищем альтернативы для ${missing}:`);
                headers.forEach(header => {
                    if (header) {
                        console.log(`  ${header} -> возможное соответствие`);
                    }
                });
            });
        }

        // Validate data types in sample rows
        const sampleSize = Math.min(10, data.length);
        for (let i = 0; i < sampleSize; i++) {
            this.validateRow(data[i]);
        }
        
        console.log('Data validation completed successfully');
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
        
        // First, try exact header match for the specific XLSX file
        for (const header of headers) {
            if (this.exactHeaders[header]) {
                const mappedField = this.exactHeaders[header];
                if (this.supportedColumns[fieldType].includes(mappedField)) {
                    console.log(`Found exact header match for ${fieldType}: ${header}`);
                    return header;
                }
            }
        }
        
        // Then, try exact match (case insensitive)
        const possibleColumns = this.supportedColumns[fieldType] || [];
        for (const header of headers) {
            for (const possibleCol of possibleColumns) {
                if (header.toLowerCase() === possibleCol.toLowerCase()) {
                    console.log(`Found exact match for ${fieldType}: ${header}`);
                    return header;
                }
            }
        }
        
        // Then, try partial match
        for (const header of headers) {
            for (const possibleCol of possibleColumns) {
                if (header.toLowerCase().includes(possibleCol.toLowerCase()) ||
                    possibleCol.toLowerCase().includes(header.toLowerCase())) {
                    console.log(`Found partial match for ${fieldType}: ${header} -> ${possibleCol}`);
                    return header;
                }
            }
        }
        
        // For debugging, log what we found
        console.log(`No match found for ${fieldType}`);
        console.log(`  Looking for: ${possibleColumns.join(', ')}`);
        console.log(`  Available headers: ${headers.join(', ')}`);
        
        return null;
    }

    // Normalize data to standard format
    normalizeData(data) {
        console.log('Normalizing data, sample row:', data[0]);
        
        return data.map((row, index) => {
            const normalized = {};
            
            // Map all possible columns
            Object.keys(this.supportedColumns).forEach(fieldType => {
                const column = this.findColumnMapping(row, fieldType);
                if (column && row[column] !== undefined && row[column] !== null && row[column] !== '') {
                    let value = row[column];
                    
                    // Special handling for time/date fields from Excel
                    if (fieldType === 'time') {
                        value = this.normalizeDate(value);
                    }
                    
                    // Special handling for numeric fields
                    if (['price', 'amount', 'total', 'fee'].includes(fieldType)) {
                        value = this.normalizeNumber(value);
                    }
                    
                    // Special handling for side field
                    if (fieldType === 'side') {
                        value = this.normalizeSide(value);
                    }
                    
                    normalized[this.getStandardColumnName(fieldType)] = value;
                }
            });
            
            // Ensure required fields have default values
            if (!normalized.Time) {
                console.warn(`Row ${index + 1}: Missing time field`);
                normalized.Time = new Date().toISOString();
            }
            if (!normalized.Side) {
                console.warn(`Row ${index + 1}: Missing side field`);
                normalized.Side = 'Unknown';
            }
            if (!normalized.Total) {
                console.warn(`Row ${index + 1}: Missing total field`);
                normalized.Total = '0';
            }
            if (!normalized.Fee) {
                normalized.Fee = '0';
            }
            if (!normalized['Executed Amount']) {
                console.warn(`Row ${index + 1}: Missing amount field`);
                normalized['Executed Amount'] = '0';
            }
            if (!normalized['Filled Price']) {
                console.warn(`Row ${index + 1}: Missing price field`);
                normalized['Filled Price'] = '0';
            }
            
            return normalized;
        });
    }

    // Normalize number values
    normalizeNumber(value) {
        if (value === null || value === undefined || value === '') {
            return '0';
        }
        
        // Convert to string and clean up
        let strValue = value.toString().trim();
        
        // Remove currency symbols and commas
        strValue = strValue.replace(/[$,€£¥]/g, '');
        strValue = strValue.replace(/,/g, '');
        
        // Parse as float
        const numValue = parseFloat(strValue);
        return isNaN(numValue) ? '0' : numValue.toString();
    }

    // Normalize side values
    normalizeSide(value) {
        if (!value) return 'Unknown';
        
        const strValue = value.toString().toLowerCase().trim();
        
        if (strValue.includes('buy') || strValue.includes('покупка') || strValue === 'b') {
            return 'Buy';
        }
        if (strValue.includes('sell') || strValue.includes('продажа') || strValue === 's') {
            return 'Sell';
        }
        
        return 'Unknown';
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