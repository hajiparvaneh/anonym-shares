// db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const environment = process.env.NODE_ENV || 'development';
        const mongoURI = process.env.MONGODB_URI;
        const dbName = process.env.DB_NAME || 'anonymous-sharing';

        if (!mongoURI) {
            throw new Error('MongoDB connection string is not defined in environment variables');
        }

        // Environment-specific configurations
        const environmentConfig = {
            development: {
                maxPoolSize: 10,
                minPoolSize: 2,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            },
            staging: {
                maxPoolSize: 20,
                minPoolSize: 5,
                connectTimeoutMS: 15000,
                socketTimeoutMS: 45000,
            },
            production: {
                maxPoolSize: 50,
                minPoolSize: 10,
                connectTimeoutMS: 20000,
                socketTimeoutMS: 60000,
            }
        };

        const envConfig = environmentConfig[environment] || environmentConfig.development;

        // Configure connection options
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: dbName,
            ...envConfig,
            retryWrites: true,
            retryReads: true,
            serverSelectionTimeoutMS: 15000,
            heartbeatFrequencyMS: 10000,
            // Additional production safeguards
            autoIndex: environment === 'production' ? false : true,
            maxConnecting: environment === 'production' ? 10 : 5,
        };

        // Connect to MongoDB
        await mongoose.connect(mongoURI, options);

        console.log(`MongoDB Connected (${environment} environment)`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            // In production, you might want to notify your error tracking service
            if (environment === 'production') {
                // Error reporting service call would go here
                console.error('Critical database error:', err);
            }
        });

        mongoose.connection.on('disconnected', () => {
            console.warn(`MongoDB disconnected (${environment} environment). Attempting to reconnect...`);
        });

        mongoose.connection.on('reconnected', () => {
            console.log(`MongoDB reconnected successfully (${environment} environment)`);
        });

        // Graceful shutdown handling
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error during MongoDB connection closure:', err);
                process.exit(1);
            }
        });

    } catch (err) {
        console.error('Database connection error:', err.message);
        // In production, you might want to retry connection before exiting
        if (environment === 'production') {
            console.error('Critical database connection failure. Retrying in 5 seconds...');
            setTimeout(() => {
                connectDB();
            }, 5000);
        } else {
            process.exit(1);
        }
    }
};

module.exports = connectDB;