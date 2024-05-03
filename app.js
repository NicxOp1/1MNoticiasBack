const express = require('express');
const bodyParser = require('body-parser');
const usuarioRoutes = require('./routes/user.js');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./services/swagger');
const cors = require('cors')


require('dotenv').config();

const app = express();

app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// Conexión a MongoDB
const uri = process.env.MONGODB_URI;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('You successfully connected to MongoDB!'))
  .catch(error => console.error('Error connecting to MongoDB: ', error.message));

// Middleware para parsear el cuerpo de las solicitudes HTTP
app.use(bodyParser.json());

// Rutas
app.use('/', usuarioRoutes);

// Iniciar el servidor
app.listen(process.env.PORT || 3000, () => console.log('Servidor corriendo en http://localhost:'+(process.env.PORT || 3000)));

module.exports = app;
