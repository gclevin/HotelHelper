const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8080;

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, './public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

app.use('/hotels', require('./controllers/routes'));

//Delete
function getModel () {
  return require('./model-datastore.js');
}

app.get('/', (req, res) => {
  res.redirect('/hotels');
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});