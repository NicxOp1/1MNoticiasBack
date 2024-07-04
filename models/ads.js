const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const schema = new mongoose.Schema({
    created_at: {type: Date, required: false},
    updated_at: {type: Date, required: false},
    ad: {type: String, required: true},
    alt: {type: String, required: true},
    url: {type: String, required: false},
    position: {type: String, required: true},
    createdBy: { type: Schema.Types.ObjectId, ref: 'Usuario'},
});

const Ads = mongoose.model('Ads', schema, 'Ads');

module.exports = Ads;
