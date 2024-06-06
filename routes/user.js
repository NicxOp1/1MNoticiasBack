const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/user.js");
const Post = require("../models/post.js");
const Ads = require("../models/ads.js");
const path = require("path");
const mongoose = require("mongoose");

const router = express.Router();

// Middlewares

function validateUserFields(req, res, next) {
  if (!req.body.nombre || !req.body.apellido || !req.body.password) {
    return res.status(400).json({
      success: false,
      message: "Nombre, apellido and password are required",
    });
  }

  next();
}
function verifyAdminRole(req, res, next) {
  const token = req.headers["x-access-token"];
  if (!token) {
    return res
      .status(403)
      .json({ success: false, message: "No token provided." });
  }

  jwt.verify(token, process.env.Token, (err, decoded) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to authenticate token." });
    }

    // if everything good, save to request for use in other routes
    req.userId = decoded.id;
    req.userRole = decoded.role;

    if (req.userRole !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Requires admin role!" });
    }

    next();
  });
}
function verifyUserRole(req, res, next) {
  const token = req.headers["x-access-token"];
  if (!token) {
    return res
      .status(403)
      .json({ success: false, message: "No token provided." });
  }

  jwt.verify(token, process.env.Token, (err, decoded) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to authenticate token." });
    }

    // if everything good, save to request for use in other routes
    req.userId = decoded.id;
    req.userRole = decoded.role;

    if (req.userRole !== "user" && req.userRole !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Requires user or admin role!" });
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
router.post("/", verifyUserRole, async (req, res) => {
  try {
    const postData = req.body;
    const newPost = await createPost(postData);
    res.status(201).json(newPost);
  } catch (err) {
    console.log("Error en el controlador:", err); // registrar el error
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
// Route to get posts
router.get("/", async (req, res) => {
  try {
    let posts;
    
    if (Object.keys(req.query).length > 0) {
      posts = await Post.find(req.query).populate('createdBy', 'nombre');
    } else {
      posts = await Post.find().populate('createdBy', 'nombre');
    }

    // Map the posts to include createdByName
    const postsWithCreatedByName = posts.map(post => {
      const postObject = post.toObject();
      postObject.createdByName = post.createdBy ? post.createdBy.nombre : null;
      return postObject;
    });

    res.json(postsWithCreatedByName);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the posts",
    });
  }
});

// Function to create a new post
async function createPost(postData) {
    const user = await Usuario.findById(postData.createdBy);
    if (!user) {
        throw new Error('User not found');
    }

    const newPost = new Post({
        ...postData,
        createdByName: user.nombre, // Populate the createdByName field
    });

    await newPost.save();
    return newPost;
}
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
router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await Post.find({ createdBy: req.params.userId });

    res.json(posts);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the posts2",
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
router.get("/user/post/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (post) {
      res.json(post);
    } else {
      res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the post3",
    });
  }
});
// Actualiza un posteo por id
router.put("/:id", verifyUserRole, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId; // Use req.userId instead of req.user.id

    // Find the post by ID and user ID
    const post = await Post.findOne({ _id: postId, createdBy: userId });

    if (!post) {
      return res
        .status(404)
        .json({ message: "No se encontró el post con el id y usuario dados" });
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

    res.json({ message: "Post actualizado correctamente", post });
  } catch (err) {
    console.log("Error en el controlador:", err); // registrar el error
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
// Actualiza un posteo por id sin verificar el rol siendo admin
router.put("/:id", verifyAdminRole, async (req, res) => {
  try {
    const postId = req.params.id;

    // Find the post by ID and user ID
    const post = await Post.findOne({ _id: postId });

    if (!post) {
      return res
        .status(404)
        .json({ message: "No se encontró el post con el id y usuario dados" });
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

    res.json({ message: "Post actualizado correctamente", post });
  } catch (err) {
    console.log("Error en el controlador:", err); // registrar el error
    res.status(500).json({ error: "Error interno del servidor" });
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
router.delete("/:id", verifyUserRole, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the post",
    });
  }
});

/* USUARIOS */

// crea un usuario admin
router.post("/admin",verifyAdminRole , async (req, res) => {
    try {
      const { nombre, apellido, password, role, description,profileImage } = req.body;

      // Check if user already exists
      const existingUser = await Usuario.findOne({ nombre });
      if (existingUser) {
        return res.status(400).json({ message: "El usuario ya existe" });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create a new admin user
      const newAdmin = new Usuario({
        profileImage,
        nombre,
        apellido,
        password: hashedPassword,
        role,
        description
      });

      // Save the new admin user to the database
      await newAdmin.save();

      // Generate a token for the admin user
      const token = jwt.sign(
        { id: newAdmin._id, role: role },
        process.env.Token,
        { expiresIn: "1d" }
      );

      res
        .status(201)
        .json({ message: "Usuario admin creado exitosamente", token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

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
router.delete("/:nombre", verifyAdminRole, async (req, res) => {
  try {
    const user = await Usuario.findOneAndDelete({ nombre: req.params.nombre });

    if (user) {
      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the user",
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
router.post("/login", async (req, res) => {
  try {
    // Comprueba si el nombre está presente
    if (!req.body.nombre || !req.body.password) {
      return res.status(400).json({
        success: false,
        message: "Nombre and password are required",
      });
    }

    // Busca el usuario en la base de datos
    const user = await Usuario.findOne({ nombre: req.body.nombre });

    // Comprueba si el usuario existe y si la contraseña es correcta
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
      // Crea un token con el rol del usuario
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.Token,
        { expiresIn: "1d" }
      );

      res.status(200).json({
        success: true,
        message: "Login successful",
        token,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid nombre or password",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while logging in",
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
router.post("/usuario/admin",verifyAdminRole,async (req, res) => {
    try {
      const newUser = new Usuario({
        created_at: Date.now(),
        updated_at: null,
        profileImage: req.body.profileImage,
        nombre: req.body.nombre,
        apellido: req.body.apellido,
        password: bcrypt.hashSync(req.body.password, 8),
        role: req.body.role,
        description: req.body.description
      });

      const user = await newUser.save();

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "An error occurred while creating the user",
      });
    }
  }
);
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
router.get("/usuario/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log(Usuario);
    const user = await Usuario.findById(id);
    console.log(user, "user");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error); // Imprime el error en la consola
    res.status(500).json({ error: error.message }); // Envía el mensaje de error en la respuesta
  }
});

// Obtiene todos los usuarios
router.get("/users",verifyAdminRole, async (req, res) => {
  try {
    const users = await Usuario.find();
    if (!users) {
      return res.status(404).json({ message: "Users not found" });
    }

    res.json(users);
  } catch (error) {
    console.error(error); // Imprime el error en la consola
    res.status(500).json({ error: error.message }); // Envía el mensaje de error en la respuesta
  }
});

//editar user segun id
router.put("/userEdit/:id", verifyAdminRole, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("User ID from params:", userId);

    // Verificar si el ID es válido
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Crear un objeto con los datos a actualizar
    const updateData = { ...req.body, updated_at: Date.now() };

    // Si se envía la nueva contraseña, encriptarla
    if (req.body.newPassword) {
      updateData.password = bcrypt.hashSync(req.body.newPassword, 8);
      delete req.body.newPassword;
    }

    const updatedUser = await Usuario.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    if (updatedUser) {
      res.status(200).json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the user",
    });
  }
});


/* Publicidades */

//Crea una publicidad
router.post("/publicidad", verifyUserRole, async (req, res) => {
  try {
    // Crear un nuevo documento Post con los datos del cuerpo de la solicitud
    const newAds = new Ads({
      ...req.body,
    });
    // Guardar el nuevo documento Post en la base de datos
    newAds
      .save()
      .then(() => res.json({ message: "AD guardada correctamente" }))
      .catch((err) => {
        console.log("Error al guardar el AD:", err); // registrar el error
        res.status(400).json({
          error: "el AD no pudo guardarse por algun problema del servidor",
        });
      });
  } catch (err) {
    console.log("Error en el controlador:", err); // registrar el error
    res.status(400).json({ error: "Hay un error con tu peticion" });
  }
});

//obtiene todas las publicidades
router.get("/publicidades", async (req, res) => {
  try {
    console.log("Iniciando la solicitud /publicidad");
    console.log("Parámetros de consulta:", req.query);

    let query = {}; // Inicializar objeto de consulta vacío

    // Verificar si hay parámetros de consulta
    if (Object.keys(req.query).length > 0) {
      // Validar los parámetros de consulta
      const allowedParams = [
        "created_at",
        "updated_at",
        "ad",
        "alt",
        "position",
        "createdBy",
      ];
      for (const key in req.query) {
        if (allowedParams.includes(key)) {
          query[key] = req.query[key];
        } else {
          console.log(`Parámetro no permitido: ${key}`);
        }
      }
    }

    // Realizar la consulta con los parámetros validados
    console.log("Consulta a la base de datos con:", query);
    const ads = await Ads.find(query);
    console.log("Resultados de la consulta:", ads);

    res.status(200).json({
      success: true,
      message: ads,
    });
  } catch (err) {
    console.log("Error al obtener los anuncios:", err);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while fetching the posts4. Please check server logs for more information.",
    });
  }
});
/* router.get("/",async(req, res)=>{
  try{
    const ads = await Ads.find();
    res.json(ads)
  }catch(error){
    res.status(500).json({
      success:false,
      message: "An error occurred while fetching the posts"
    })
  }
}); */

//Obtiene la publicidad por id
router.get("/publicidad/:id", async (req, res) => {
  try {
    const ads = await Ads.findById(req.params.id);
    res.json(ads);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the posts5",
    });
  }
});

// Obtiene todas las ads creadas por un usuario
router.get("/publicidad/by/:userId", async (req, res) => {
  try {
    const ads = await Ads.find({ createdBy: req.params.userId });

    res.json(ads);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the posts6",
    });
  }
});

// Actualiza un ad por id
router.put("/publicidad/:id", verifyUserRole, async (req, res) => {
  try {
    const adsId = req.params.id;
    const userId = req.userId; // Use req.userId instead of req.user.id
    const userRole = req.userRole;
    console.log(userRole, "rol");
    if (userRole === "admin") {
      const ads = await Ads.findOne({ _id: adsId });
      if (!ads) {
        return res
          .status(404)
          .json({
            message: "No se encontró el post con el id y usuario dados",
          });
      }
      // Update the post with the new data
      ads.ad = req.body.ad;
      ads.alt = req.body.alt;
      ads.position = req.body.position;
      ads.updated_at = Date.now();

      // Save the updated ads
      await ads.save();

      res.json({ message: "El ad fue actualizado correctamente", ads });
    } else if (userRole === "user") {
      // Find the post by ID and user ID
      const ads = await Ads.findOne({ _id: adsId, createdBy: userId });
      if (!ads) {
        return res
          .status(404)
          .json({
            message: "No se encontró el post con el id y usuario dados",
          });
      }
      // Update the post with the new data
      ads.ad = req.body.ad;
      ads.alt = req.body.alt;
      ads.position = req.body.position;
      ads.updated_at = Date.now();

      // Save the updated ads
      await ads.save();

      res.json({ message: "El ad fue actualizado correctamente", ads });
    }
  } catch (err) {
    console.log("Error en el controlador:", err); // registrar el error
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Elimina un ad por id
router.delete("/publicidad/:id", verifyUserRole, async (req, res) => {
  try {
    const ads = await Ads.findByIdAndDelete(req.params.id);

    if (!ads) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Ad deleted successfully",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the Ad",
    });
  }
});

module.exports = router;
