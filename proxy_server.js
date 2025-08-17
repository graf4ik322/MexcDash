const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// MEXC API Proxy
app.post('/api/mexc/*', async (req, res) => {
    try {
        const { apiKey, secretKey, endpoint, params } = req.body;
        
        if (!apiKey || !secretKey) {
            return res.status(400).json({ error: 'API Key and Secret Key required' });
        }

        // Add timestamp
        const timestamp = Date.now();
        const queryParams = { ...params, timestamp };
        
        // Create query string
        const queryString = Object.keys(queryParams)
            .map(key => `${key}=${queryParams[key]}`)
            .join('&');
        
        // Generate signature
        const signature = crypto.createHmac('sha256', secretKey)
            .update(queryString)
            .digest('hex');
        
        // Make request to MEXC
        const url = `https://api.mexc.com${endpoint}?${queryString}&signature=${signature}`;
        
        const response = await axios.get(url, {
            headers: {
                'X-MEXC-APIKEY': apiKey
            },
            timeout: 10000
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ 
            error: 'Proxy error', 
            details: error.message 
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
    console.log(`📊 MEXC API proxy: http://localhost:${PORT}/api/mexc/*`);
    console.log(`🌐 Static files: http://localhost:${PORT}/`);
});

module.exports = app;