const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/user.js');
const Post = require('../models/post.js'); // Asegúrate de que la ruta al archivo del modelo sea correcta
const path = require('path');


const router = express.Router();

// Middlewares

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
function verifyUserRole(req, res, next) {
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

        if (req.userRole !== 'user' && req.userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Requires user or admin role!' });
        }
        
        next();
    });
}





/* POSTEOS */

// Crea un nuevo post 
/**
 * @swagger
 * /:
 *   post:
 *     summary: Crea un nuevo post
 *     description: Añade un nuevo post a la base de datos con la información proporcionada.
 *     consumes:
 *       - multipart/form-data
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
 *               image:
 *                type: string
 *               example: https://example.com/image.jpg
 *              imageDescription:
 *               type: string
 *              example: Descripción de la imagen
 *    produces:
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
 */
router.post('/', verifyUserRole , async (req, res) => {
    try {
        // Crear un nuevo documento Post con los datos del cuerpo de la solicitud
        const newPost = new Post({
            ...req.body,
        });
        // Guardar el nuevo documento Post en la base de datos
        newPost.save()
            .then(() => res.json({ message: 'Post guardado correctamente' }))
            .catch(err => {
                console.log('Error al guardar el Post:', err); // registrar el error
                res.status(400).json({ error: "el post no pudo guardarse por algun problema del servidor" });
            });

    } catch (err) {
        console.log('Error en el controlador:', err); // registrar el error
        res.status(400).json({ error: "Hay un error con tu peticion" });
    }
});
// trae todos los posts y se le pueden mandar querys para filtrar
/**
 * @swagger
 * /post:
 *   post:
 *     summary: Crea un nuevo post
 *     description: Añade un nuevo post a la base de datos con la información proporcionada.
 *     consumes:
 *       - multipart/form-data
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: formData
 *         name: title
 *         type: string
 *         required: true
 *         description: El título del post.
 *       - in: formData
 *         name: content
 *
 */
router.get('/', async (req, res) => {
    try {
        if (Object.keys(req.query).length > 0) {
/*             // Handle filtering logic here
            // For example, if there is a "category" query parameter
            // you can filter the posts based on that category
            if (req.query.category) {
                const filteredPosts = await Post.find({ category: req.query.category });
                res.json(filteredPosts);
            } else {
                const posts = await Post.find();
                res.json(posts);
            } */
            const filteredPosts = await Post.find(req.query);
            res.json(filteredPosts);
        } else {
            const posts = await Post.find();
            res.json(posts);
        }
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
router.put('/:id', verifyUserRole, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId; // Use req.userId instead of req.user.id

        // Find the post by ID and user ID
        const post = await Post.findOne({ _id: postId, createdBy: userId });

        if (!post) {
            return res.status(404).json({ message: 'No se encontró el post con el id y usuario dados' });
        }

        // Update the post with the new data
        post.title = req.body.title;
        post.resumedContent = req.body.resumedContent;
        post.content = req.body.content;
        post.date_created = req.body.date_created;
        post.date_created_gmt = req.body.date_created_gmt;
        post.taxonomies = req.body.taxonomies;
        post.category = req.body.category;
        post.image = req.body.image;
        post.imageDescription = req.body.imageDescription;

        // Save the updated post
        await post.save();

        res.json({ message: 'Post actualizado correctamente', post });

    } catch (err) {
        console.log('Error en el controlador:', err); // registrar el error
        res.status(500).json({ error: 'Error interno del servidor' });
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
router.delete('/:id',verifyUserRole, async (req, res) => {
    try {
        const post = await Post.findByIdAndDelete(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        } else {
            res.status(200).json({ 
                success: true, 
                message: 'Post deleted successfully' 
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the post'
        });
    }
});

/* USUARIOS */

// crea un usuario admin
router.post('/admin',/* verifyAdminRole ,*/async (req, res) => {
    try {
        const { nombre, apellido, password, role } = req.body;

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
            role
        });

        // Save the new admin user to the database
        await newAdmin.save();

        // Generate a token for the admin user
        const token = jwt.sign({ id: newAdmin._id, role: role }, process.env.Token, { expiresIn: '1d' });

        res.status(201).json({ message: 'Usuario admin creado exitosamente', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});
//editar user segun nombre
router.put('/:nombre',verifyAdminRole , async (req, res) => {
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
router.delete('/:nombre',verifyAdminRole , async (req, res) => {
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
// Controlador para ingresar y hacer login como usuario
/**
 * @swagger
 * /login:
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
 *               - role
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Nombre del usuario
 *               password:
 *                 type: string
 *                 example: Contraseña del usuario
 *              role:
 *                type: string
 *               example: admin
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
            // Crea un token con el rol del usuario
            const token = jwt.sign({ id: user._id, role: user.role }, process.env.Token, { expiresIn: '1d' });

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
// controlador para crear un nuevo usuario como administrador
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
            password: bcrypt.hashSync(req.body.password, 8),
            role: req.body.role
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
// Obtiene un usuario por id
/**
 * @swagger
 * /user/{userId}:
 *   get:
 *     summary: Obtiene un usuario por id
 *     description: Obtiene un usuario de la base de datos utilizando su id como parámetro.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Id del usuario a obtener
 *         schema:
 *           type: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        // Fetch user from database using userId
        const user = await Usuario.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;