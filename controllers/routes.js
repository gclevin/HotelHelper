const express = require('express')
const router = express.Router()
const path = require('path');
const bodyParser = require('body-parser');

// router.set('views', path.join(__dirname, './views'));
// router.set('view engine', 'pug');
router.use(express.static(path.join(__dirname, './public')));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true })); 

function getModel () {
	return require('./../models/model-datastore.js');
  // return require('./model-datastore.js');
}

// router.use(function timeLog (req, res, next) {
//   console.log('Time: ', Date.now())
//   next()
// })
// define the home page route
// router.get('/', function (req, res) {
//   res.send('hotels')
// })




router.get('/', (req, res, next) => {
  getModel().list(10, req.query.pageToken, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }
    console.log(entities);
    res.render('hotels.pug', {
      hotels: entities,
      nextPageToken: cursor
    });
  });
});

router.get('/add', (req, res) => {
	res.render('form.pug', {
    hotel: {},
    action: 'Add'
  });
});

router.post('/add', (req, res, next) => {
  const data = req.body;
  //console.log(data);
  // Save the data to the database.
  getModel().create(data, (err, savedData) => {
    if (err) {
      next(err);
      return;
    }

    res.redirect(`${req.baseUrl}/${savedData.id}`);

  });
});

// router.post('/add', (req, res, next) => {
//   const data = req.body;
//   //console.log(data);
//   // Save the data to the database.
//   getModel().create(data, (err, savedData) => {
//     if (err) {
//       next(err);
//       return;
//     }

//     let entity = {
//   		name: "loop",
//   		address: "loop",
//   		city: "loop",
//   		zip: "loop",
//   		state: "loop",
//   		rooms: "3",
// 	};

//     let numRooms = savedData.rooms
//     for (var i = 0; i <= numRooms; i++) {
//     	console.log("YEAH!")
    	
//     }
//     console.log("HELLO " + savedData.name)
//     res.redirect(`${req.baseUrl}/${savedData.id}`);
//     //res.send('Hello! World.');
//   });
// });


router.get('/:hotel', (req, res, next) => {
  getModel().read(req.params.hotel, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('hotel.pug', {
      hotel: entity
    });
  });
});

module.exports = router