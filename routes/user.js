const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/user.js');
const Post = require('../models/post.js'); // Asegúrate de que la ruta al archivo del modelo sea correcta
const path = require('path');
const fs = require('node:fs'); // Import the fs module
/* const upload = multer({ dest: path.join(__dirname, '../assets') }); */
/* const multer = require('multer'); */

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'C:\\Users\\Nicolas Lopez\\Desktop\\SCRIPTS\\Black Magic\\1MnoticiasBack\\assets');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

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
 *         type: string
 *         required: true
 *         description: El contenido del post.
 *       - in: formData
 *         name: date_created
 *         type: string
 *         required: true
 *         description: La fecha de creación del post.
 *       - in: formData
 *         name: date_created_gmt
 *         type: string
 *         required: true
 *         description: La fecha de creación del post en GMT.
 *       - in: formData
 *         name: taxonomies
 *         type: array
 *         items:
 *           type: string
 *         required: true
 *         description: Las taxonomías del post.
 *       - in: formData
 *         name: category
 *         type: string
 *         description: La categoría del post.
 *       - in: formData
 *         name: createdBy
 *         type: string
 *         description: El ID del usuario que creó el post.
 *       - in: formData
 *         name: image
 *         type: file
 *         description: La imagen para el post.
 *       - in: formData
 *         name: imageDescription
 *         type: string
 *         description: La descripción de la imagen.
 *     responses:
 *       201:
 *         description: Post creado exitosamente
 *       400:
 *         description: Datos inválidos proporcionados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', upload.single('image'), async (req, res) => {
    try {
        console.log('req.body:', req.body); // registrar el cuerpo de la solicitud
        console.log('req.file:', req.file); // registrar el archivo de la solicitud

        // req.file es el archivo 'image'
        // req.body contendrá el texto 'title', 'content', etc.
        // Crear un nuevo documento Post con los datos del cuerpo de la solicitud
        const newPost = new Post({
            ...req.body,
            createdBy: req.user.id, // asignar el id del usuario que creó el post
            image: req.file ? req.file.path : null // si se subió una imagen, almacene la ruta de la imagen
        });

        console.log('newPost:', newPost); // registrar el nuevo Post

        saveImage(req.file)
        console.log(saveImage(req.file))
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
function saveImage(file) {  
    const newPath = path.join(__dirname, '../assets', file.originalname);
    fs.renameSync(file.path, newPath);
    return newPath
}


// Crea un nuevo post
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
 *     summary: Actualiza un post existente
 *     description: Actualiza un post existente en la base de datos con la información proporcionada. Si se proporciona una nueva imagen, se cargará a S3 y se actualizará la URL de la imagen en la base de datos.
 *     consumes:
 *       - multipart/form-data
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: El ID del post a actualizar.
 *       - in: formData
 *         name: title
 *         type: string
 *         description: El nuevo título del post.
 *       - in: formData
 *         name: content
 *         type: string
 *         description: El nuevo contenido del post.
 *       - in: formData
 *         name: date_created
 *         type: string
 *         description: La nueva fecha de creación del post.
 *       - in: formData
 *         name: date_created_gmt
 *         type: string
 *         description: La nueva fecha de creación del post en GMT.
 *       - in: formData
 *         name: taxonomies
 *         type: array
 *         items:
 *           type: string
 *         description: Las nuevas taxonomías del post.
 *       - in: formData
 *         name: category
 *         type: string
 *         description: La nueva categoría del post.
 *       - in: formData
 *         name: createdBy
 *         type: string
 *         description: El nuevo ID del usuario que creó el post.
 *       - in: formData
 *         name: image
 *         type: file
 *         description: La nueva imagen para el post (opcional).
 *       - in: formData
 *         name: imageDescription
 *         type: string
 *         description: La nueva descripción de la imagen.
 *     responses:
 *       200:
 *         description: Post actualizado exitosamente. Devuelve el post actualizado.
 *       400:
 *         description: Datos inválidos proporcionados
 *       404:
 *         description: No se encontró el post
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        let imageUrl;
        if (req.file) {
            // Convertir la imagen a Base64
            const imageBase64 = req.file.buffer.toString('base64');

            // Carga al almacenamiento en la nube
            const params = {
                Bucket: process.env.AWS_BUCKET_NAME, // Nombre del bucket en S3
                Key: `${Date.now().toString()}-${req.file.originalname}`, // Nombre del archivo en S3
                Body: Buffer.from(imageBase64, 'base64'), // Datos de la imagen
                ContentType: req.file.mimetype, // Tipo de contenido
                ACL: 'public-read' // Hacer que la imagen sea de lectura pública
            };

            const uploadResponse = await s3.upload(params).promise();

            // Generar URL de la imagen
            imageUrl = uploadResponse.Location;
        }

        // Actualizar el documento Post con los datos del cuerpo de la solicitud
        const updatedPost = await Post.findByIdAndUpdate(req.params.id, {
            ...req.body,
            ...(imageUrl && { image: imageUrl }) // si se subió una imagen, actualice la URL de la imagen
        }, { new: true }); // { new: true } devuelve el documento actualizado

        if (!updatedPost) {
            return res.status(404).json({ message: 'No se encontró el post con el id dado' });
        }

        res.json({ message: 'Post actualizado correctamente', post: updatedPost });

    } catch (err) {
        res.status(400).json({ error: err });
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
router.post('/admin',verifyAdminRole,async (req, res) => {
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