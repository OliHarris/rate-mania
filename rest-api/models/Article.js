const mongoose = require('mongoose');
const ArticleSchema = new mongoose.Schema({  
  article_id: Number,
  article_title: String,
  underrated: Number,
  overrated: Number
});
module.exports = mongoose.model('Article', ArticleSchema);