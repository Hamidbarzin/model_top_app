const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_KEY = process.env.ACCESS_KEY || 'barzin2025';
const DB_FILE = path.join(__dirname, 'database.sqlite');

// Log environment variables for debugging
console.log('Environment check:');
console.log('PORT:', PORT);
console.log('ACCESS_KEY:', ACCESS_KEY ? 'Set' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize SQLite database
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        console.log('Initializing database at:', DB_FILE);
        
        const db = new sqlite3.Database(DB_FILE, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                console.error('Database file path:', DB_FILE);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database successfully');
        });

        // Create canvas table if it doesn't exist
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS canvas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_name TEXT DEFAULT 'Topping Courier',
                customer_segments TEXT DEFAULT '',
                value_propositions TEXT DEFAULT '',
                channels TEXT DEFAULT '',
                customer_relationships TEXT DEFAULT '',
                revenue_streams TEXT DEFAULT '',
                key_resources TEXT DEFAULT '',
                key_activities TEXT DEFAULT '',
                key_partners TEXT DEFAULT '',
                cost_structure TEXT DEFAULT '',
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        db.run(createTableQuery, (err) => {
            if (err) {
                console.error('Error creating table:', err);
                reject(err);
                return;
            }
            console.log('Canvas table created/verified');

            // Check if there's any data, if not insert initial record
            db.get('SELECT COUNT(*) as count FROM canvas', (err, row) => {
                if (err) {
                    console.error('Error checking data:', err);
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    // Insert initial data
                    const insertQuery = `
                        INSERT INTO canvas (
                            company_name, customer_segments, value_propositions, 
                            channels, customer_relationships, revenue_streams,
                            key_resources, key_activities, key_partners, cost_structure
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    db.run(insertQuery, [
                        'Topping Courier', '', '', '', '', '', '', '', '', ''
                    ], (err) => {
                        if (err) {
                            console.error('Error inserting initial data:', err);
                            reject(err);
                            return;
                        }
                        console.log('Initial data inserted');
                        resolve(db);
                    });
                } else {
                    console.log('Database already has data');
                    resolve(db);
                }
            });
        });
    });
}

// Authentication middleware
function authenticate(req, res, next) {
    const authKey = req.headers['x-access-key'] || req.body.accessKey;
    
    if (authKey === ACCESS_KEY) {
        next();
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'دسترسی غیرمجاز - رمز عبور اشتباه است' 
        });
    }
}

// Routes

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { accessKey } = req.body;
    
    if (accessKey === ACCESS_KEY) {
        res.json({ 
            success: true, 
            message: 'ورود موفقیت‌آمیز',
            accessKey: ACCESS_KEY 
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'رمز عبور اشتباه است' 
        });
    }
});

// Save data endpoint
app.post('/api/save', authenticate, (req, res) => {
    const db = new sqlite3.Database(DB_FILE);
    const data = req.body;
    
    const updateQuery = `
        UPDATE canvas SET 
            company_name = ?,
            customer_segments = ?,
            value_propositions = ?,
            channels = ?,
            customer_relationships = ?,
            revenue_streams = ?,
            key_resources = ?,
            key_activities = ?,
            key_partners = ?,
            cost_structure = ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = 1
    `;
    
    db.run(updateQuery, [
        data.companyName || 'Topping Courier',
        data.customerSegments || '',
        data.valuePropositions || '',
        data.channels || '',
        data.customerRelationships || '',
        data.revenueStreams || '',
        data.keyResources || '',
        data.keyActivities || '',
        data.keyPartners || '',
        data.costStructure || ''
    ], function(err) {
        if (err) {
            console.error('Save error:', err);
            res.status(500).json({ 
                success: false, 
                message: 'خطا در ذخیره داده‌ها' 
            });
            return;
        }
        
        res.json({ 
            success: true, 
            message: 'داده‌ها با موفقیت ذخیره شد',
            lastSaved: new Date().toISOString()
        });
        
        db.close();
    });
});

// Load data endpoint
app.get('/api/load', authenticate, (req, res) => {
    const db = new sqlite3.Database(DB_FILE);
    
    const selectQuery = 'SELECT * FROM canvas WHERE id = 1';
    
    db.get(selectQuery, (err, row) => {
        if (err) {
            console.error('Load error:', err);
            res.status(500).json({ 
                success: false, 
                message: 'خطا در بارگذاری داده‌ها' 
            });
            return;
        }
        
        if (!row) {
            res.status(404).json({ 
                success: false, 
                message: 'داده‌ای یافت نشد' 
            });
            return;
        }
        
        // Convert database row to expected format
        const data = {
            companyName: row.company_name,
            customerSegments: row.customer_segments,
            valuePropositions: row.value_propositions,
            channels: row.channels,
            customerRelationships: row.customer_relationships,
            revenueStreams: row.revenue_streams,
            keyResources: row.key_resources,
            keyActivities: row.key_activities,
            keyPartners: row.key_partners,
            costStructure: row.cost_structure,
            lastSaved: row.last_updated,
            version: '3.0'
        };
        
        res.json({ 
            success: true, 
            data: data 
        });
        
        db.close();
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'سرور فعال است',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'خطای داخلی سرور' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'صفحه مورد نظر یافت نشد' 
    });
});

// Start server
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log(`🚀 سرور روی پورت ${PORT} اجرا شد`);
            console.log(`🔑 رمز دسترسی: ${ACCESS_KEY}`);
            console.log(`📁 فایل دیتابیس: ${DB_FILE}`);
            console.log(`🌐 آدرس: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

startServer();
