const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    apis: ['./routes/*'],
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: '1MNoticias',
            version: '1.0.0',
            description: 'API 1MNoticias',
        },
    },
};

const openapiSpecification = swaggerJsdoc(options);

module.exports = openapiSpecification;
