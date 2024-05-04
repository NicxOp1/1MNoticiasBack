const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/user.js');
const Post = require('../models/post.js'); // Asegúrate de que la ruta al archivo del modelo sea correcta

const router = express.Router();

// Middleware para validar los campos requeridos
function validateUserFields(req, res, next) {
    if (!req.body.nombre || !req.body.apellido || !req.body.password) {
        return res.status(400).json({
            success: false,
            message: 'Nombre, apellido and password are required'
        });
    }

    next();
}

function verifyAdminRole(req, res, next) {
    const token = req.headers['x-access-token'];
    if (!token) {
        return res.status(403).json({ success: false, message: 'No token provided.' });
    }

    jwt.verify(token, process.env.Token, (err, decoded) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to authenticate token.' });
        }

        // if everything good, save to request for use in other routes
        req.userId = decoded.id;
        req.userRole = decoded.role;

        if (req.userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Requires admin role!' });
        }

        next();
    });
}


// Crea un nuevo post
/**
 * @swagger
 * /:
 *   post:
 *     summary: Crea un nuevo post
 *     description: Añade un nuevo post a la base de datos con la información proporcionada.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     requestBody:
 *       description: Datos del post para crear un nuevo registro.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - date_created
 *               - date_created_gmt
 *               - taxonomies
 *             properties:
 *               title:
 *                 type: string
 *                 example: Título del post
 *               content:
 *                 type: string
 *                 example: Contenido del post
 *               date_created:
 *                 type: string
 *                 example: 2022-01-01
 *               date_created_gmt:
 *                 type: string
 *                 example: 2022-01-01T00:00:00Z
 *               taxonomies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [tag1, tag2]
 *               category:
 *                 type: string
 *                 example: Categoría del post
 *               createdBy:
 *                 type: string
 *                 example: Creador del post
 *     responses:
 *       201:
 *         description: Post creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/models/post.js'
 *       400:
 *         description: Datos inválidos proporcionados
 *       500:
 *         description: Error interno del servidor
 *
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         date_created:
 *           type: string
 *         date_created_gmt:
 *           type: string
 *         taxonomies:
 *           type: array
 *           items:
 *             type: string
 *         category:
 *           type: string
 *         createdBy:
 *           type: string
 */
router.post('/', verifyAdminRole, (req, res) => {
    const newPost = new Post(req.body);

    newPost.save()
        .then(() => res.json({ message: 'Post guardado correctamente' }))
        .catch(err => res.status(400).json({ error: err }));
});

// Obtiene todos los posteos
/**
 * @swagger
 * /post:
 *   get:
 *     summary: Obtiene todos los posteos
 *     description: Obtiene todos los posteos de la base de datos.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Posteos encontrados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find();
        res.json(posts);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the posts'
        });
    }
});

// Obtiene todos los posteos creados por un usuario
/**
 * @swagger
 * /post/user/{userId}:
 *   get:
 *     summary: Obtiene todos los posteos creados por un usuario
 *     description: Obtiene todos los posteos de la base de datos creados por un usuario específico.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Id del usuario para filtrar los posteos
 *         schema:
 *           type: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Posteos encontrados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const posts = await Post.find({ createdBy: req.params.userId });

        res.json(posts);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the posts'
        });
    }
});

// Obtiene un posteo por id
/**
 * @swagger
 * /post/{id}:
 *   get:
 *     summary: Obtiene un posteo por id
 *     description: Obtiene un posteo de la base de datos utilizando su id como parámetro.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del posteo a buscar
 *         schema:
 *           type: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Posteo encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Posteo no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (post) {
            res.json(post);
        } else {
            res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the post'
        });
    }
});
// Actualiza un posteo por id
/**
 * @swagger
 * /post/{id}:
 *   put:
 *     summary: Actualiza un posteo por id
 *     description: Actualiza un posteo de la base de datos utilizando su id como parámetro.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del posteo a actualizar
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Datos del posteo para actualizar el registro.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Nuevo título del posteo
 *               content:
 *                 type: string
 *                 example: Nuevo contenido del posteo
 *               date_created:
 *                 type: string
 *                 example: 2022-01-01
 *               date_created_gmt:
 *                 type: string
 *                 example: 2022-01-01T00:00:00Z
 *               taxonomies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [tag1, tag2]
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Posteo actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Posteo no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', verifyAdminRole, async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updated_at: Date.now() },
            { new: true }
        );

        if (post) {
            res.json(post);
        } else {
            res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the post'
        });
    }
});

// Elimina un posteo por id
/**
 * @swagger
 * /post/{id}:
 *   delete:
 *     summary: Elimina un posteo por id
 *     description: Elimina un posteo de la base de datos utilizando su id como parámetro.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del posteo a eliminar
 *         schema:
 *           type: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Posteo eliminado exitosamente
 *       404:
 *         description: Posteo no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if the user is the owner of the post
        if (req.userRole === 'admin' || post.createdBy.toString() === req.userId) {
            await post.remove();
            res.json({ success: true, message: 'Post deleted successfully' });
        } else {
            res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this post'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the post'
        });
    }
});

// Hace un usuario admin
router.post('/admin', async (req, res) => {
    try {
        const { nombre, apellido, password } = req.body;

        // Check if user already exists
        const existingUser = await Usuario.findOne({ nombre });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new admin user
        const newAdmin = new Usuario({
            nombre,
            apellido,
            password: hashedPassword,
        });

        // Save the new admin user to the database
        await newAdmin.save();

        // Generate a token for the admin user
        const token = jwt.sign({ id: newAdmin._id, role: 'admin' }, process.env.Token, { expiresIn: '1d' });

        res.status(201).json({ message: 'Usuario admin creado exitosamente', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Actualiza un usuario por nombre
/**
 * @swagger
 * /usuario/{nombre}:
 *   put:
 *     summary: Actualiza un usuario por nombre
 *     description: Actualiza un usuario de la base de datos utilizando su nombre como parámetro.
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         description: Nombre del usuario a actualizar
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Datos del usuario para actualizar el registro.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Nuevo nombre del usuario
 *               apellido:
 *                 type: string
 *                 example: Nuevo apellido del usuario
 *               password:
 *                 type: string
 *                 example: Nueva contraseña del usuario
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:nombre', async (req, res) => {
    try {
        const user = await Usuario.findOneAndUpdate(
            { nombre: req.params.nombre },
            { ...req.body, updated_at: Date.now() },
            { new: true }
        );

        if (user) {
            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                user
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the user'
        });
    }
});

// Elimina un usuario por nombre
/**
 * @swagger
 * /usuario/{nombre}:
 *   delete:
 *     summary: Elimina un usuario por nombre
 *     description: Elimina un usuario de la base de datos utilizando su nombre como parámetro.
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         description: Nombre del usuario a eliminar
 *         schema:
 *           type: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:nombre', async (req, res) => {
    try {
        const user = await Usuario.findOneAndDelete({ nombre: req.params.nombre });

        if (user) {
            res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the user'
        });
    }
});

// Controlador para ingresar
/**
 * @swagger
 * /usuario/login:
 *   post:
 *     summary: Ingresar
 *     description: Permite a un usuario iniciar sesión utilizando su nombre y contraseña.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     requestBody:
 *       description: Datos del usuario para iniciar sesión.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Nombre del usuario
 *               password:
 *                 type: string
 *                 example: Contraseña del usuario
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Datos inválidos proporcionados
 *       401:
 *         description: Nombre o contraseña inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login', async (req, res) => {
    try {
        // Comprueba si el nombre está presente
        if (!req.body.nombre || !req.body.password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre and password are required'
            });
        }

        // Busca el usuario en la base de datos
        const user = await Usuario.findOne({ nombre: req.body.nombre });

        // Comprueba si el usuario existe y si la contraseña es correcta
        if (user && bcrypt.compareSync(req.body.password, user.password)) {
            // Crea un token
            const token = jwt.sign({ id: user._id, role: 'user' }, process.env.Token, { expiresIn: '1d' });

            res.status(200).json({
                success: true,
                message: 'Login successful',
                token
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid nombre or password'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while logging in'
        });
    }
});

/**
 * @swagger
 * /usuario/admin:
 *   post:
 *     summary: Crea un nuevo usuario como administrador
 *     description: Añade un nuevo usuario a la base de datos con la información proporcionada por un administrador.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     requestBody:
 *       description: Datos del usuario para crear un nuevo registro.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Nombre del usuario
 *               password:
 *                 type: string
 *                 example: Contraseña del usuario
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Datos inválidos proporcionados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/usuario/admin', verifyAdminRole, validateUserFields, async (req, res) => {
    try {
        const newUser = new Usuario({
            created_at: Date.now(),
            updated_at: null,
            nombre: req.body.nombre,
            apellido: req.body.apellido,
            password: bcrypt.hashSync(req.body.password, 8)
        });

        const user = await newUser.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating the user'
        });
    }
});

module.exports = router;