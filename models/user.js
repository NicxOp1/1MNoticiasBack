const mongoose = require('mongoose');

/**
 * @swagger
 *  components:
 *    schemas:
 *      Usuario:
 *        type: object
 *        required:
 *          - nombre
 *          - apellido
 *          - password
 *        properties:
 *          created_at:
 *            type: string
 *            format: date-time
 *            description: The date the user was created.
 *          updated_at:
 *            type: string
 *            format: date-time
 *            description: The date the user was updated.
 *          nombre:
 *            type: string
 *            description: The name of the user.
 *          apellido:
 *            type: string
 *            description: The surname of the user.
 *          password:
 *            type: string
 *            description: The password of the user.
 *          role:
 *            type: string
 *            description: The role of the user or admin.
 *        example:
 *           nombre: Juan
 *           apellido: Perez
 *           password: miContraseñaSegura
 *          role: admin
 */
const schema = new mongoose.Schema({
    created_at: {type: Date, required: false},
    updated_at: {type: Date, required: false},
    nombre: {type: String, required: true},
    apellido: {type: String, required: true},
    password: {type: String, required: true},
    role: {type: String, required: true},
});

const Usuario = mongoose.model('Usuario', schema, 'usuarios');

module.exports = Usuario;
