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

function getModel () {
  return require('./model-datastore.js');
}

app.get('/', (req, res) => {
  res.redirect('/hotels');
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

// app.get('/', (req, res, next) => {
//   getModel().list(10, req.query.pageToken, (err, entities, cursor) => {
//     if (err) {
//       next(err);
//       return;
//     }
//     res.render('hotels.pug', {
//       books: entities,
//       nextPageToken: cursor
//     });
//   });
// });

// app.listen(PORT, () => {
// 	console.log(`App listening on port ${PORT}`);
// });

// app.get('/add', (req, res) => {
// 	res.render('form.pug', {
//     book: {},
//     action: 'Add'
//   });
// });

// app.post('/add', (req, res, next) => {
//   const data = req.body;

//   // Save the data to the database.
//   getModel().create(data, (err, savedData) => {
//     if (err) {
//       next(err);
//       return;
//     }
//     //res.redirect(`${req.baseUrl}/${savedData.id}`);
//     res.send('Hello! World.');
//   });
// });

// app.get('/:book', (req, res, next) => {
//   console.log("BOOK: " + req.params.book);
//   getModel().read(req.params.book, (err, entity) => {
//     if (err) {
//       next(err);
//       return;
//     }
//     res.render('hotel.pug', {
//       book: entity
//     });
//   });
// });



