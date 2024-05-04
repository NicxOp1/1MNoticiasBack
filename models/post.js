const mongoose = require('mongoose');
const Schema = mongoose.Schema; // Asegúrate de que esta línea esté presente

/**
 * @swagger
 *  components:
 *    schemas:
 *      Post:
 *        type: object
 *        required:
 *          - title
 *          - content
 *          - date_created
 *          - date_created_gmt
 *          - taxonomies
 *        properties:
 *          title:
 *            type: string
 *            description: The title of the post.
 *          content:
 *            type: string
 *            description: The content of the post.
 *          date_created:
 *            type: string
 *            description: The date the post was created.
 *          date_created_gmt:
 *            type: string
 *            description: The date the post was created in GMT.
 *          taxonomies:
 *            type: array
 *            items:
 *              type: string
 *            description: The taxonomies of the post.
 *          category:
 *            type: string
 *            description: The category of the post.
 *          createdBy:
 *            type: string
 *            description: The ID of the user who created the post.
 *          image:
 *            type: string
 *            description: The URL of the image.
 *          imageDescription:
 *            type: string
 *            description: The description of the image.
 *        example:
 *           title: Post Title
 *           content: Post Content
 *           date_created: 2022-01-01
 *           date_created_gmt: 2022-01-01
 *           taxonomies: ["taxonomy1", "taxonomy2"]
 *           category: Category
 *           createdBy: 60d0fe4b6469270015c2e9c1
 *           image: https://example.com/image.jpg
 *           imageDescription: Image description
 */
const PostSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    date_created: { type: String, required: true },
    date_created_gmt: { type: String, required: true },
    taxonomies: { type: [String], required: true },
    category: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Usuario'},
    image: { type: String },//solo va a ser una url
    imageDescription: { type: String },
});

PostSchema.pre('save', function(next) {
    for (let i = 0; i < this.taxonomies.length; i++) {
        if (this.taxonomies[i] === this.taxonomies[i].toUpperCase()) {
            this.category = this.taxonomies[i];
            break;
        }
    }
    next();
});

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;