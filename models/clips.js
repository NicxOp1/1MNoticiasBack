const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    link: {type: String, required: true}, // Añadido el campo "link"
});

const Clip = mongoose.model('Clip', schema, 'clips'); // Cambiado el nombre del modelo a "Clip"

module.exports = Clip;