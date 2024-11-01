// config/environment.js
const getEnvironmentConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    
    const config = {
        development: {
            baseUrl: 'http://localhost:3000',
            allowedDomains: ['localhost', '127.0.0.1']
        },
        staging: {
            baseUrl: process.env.BASE_URL || 'https://stage1001.anonymshares.com',
            allowedDomains: [
                'stage1001.anonymshares.com',
                'stage1002.anonymshares.com',
                // Add other staging domains as needed
            ]
        },
        production: {
            baseUrl: 'https://www.anonymshares.com',
            allowedDomains: ['www.anonymshares.com', 'anonymshares.com']
        }
    };

    return config[env] || config.development;
};

module.exports = getEnvironmentConfig;