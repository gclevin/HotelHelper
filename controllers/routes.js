const express = require('express')
const router = express.Router()
const path = require('path');
const bodyParser = require('body-parser');

let a = "HI";

// router.set('views', path.join(__dirname, './views'));
// router.set('view engine', 'pug');
router.use(express.static(path.join(__dirname, './public')));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true })); 

function getHotelModel () {
	return require('./../models/hotelModel.js');
}

function getRoomModel () {
	return require('./../models/roomModel.js');
}

router.get('/', (req, res, next) => {
  getHotelModel().list(10, req.query.pageToken, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }
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

router.post('/add', function (req, res, next) {
  const data = req.body;
  getHotelModel().create(data, function (err, savedData) { 
    if (err) {
      next(err);
      return;
    }
	
	let numRooms = req.body.rooms

	for (var i = 1; i <= numRooms; i++) {
  	  let entity = {
  	    number: i,
  	    datesBooked: "",
  	    hotel: req.body.name,
  	  }

  	  getRoomModel().create(entity, function (err, savedData) {
        if (err) {
          next(err);
      	  return;
        }
  	  });
    };
    res.redirect(`${req.baseUrl}/${savedData.id}`);
  });
});

router.get('/:hotel', (req, res, next) => {
  getHotelModel().read(req.params.hotel, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('hotel.pug', {
      hotel: entity
    });
  });
});

//Still in production
router.get('/:hotel/makeReservation', (req, res, next) => {
  getHotelModel().read(req.params.hotel, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    console.log(entity.name)
    res.render('makeReservation.pug', {
    	reservation: {},
    	hotel: entity.name
  	});
  });
});

//Still in production
router.post('/:hotel/makeReservation', (req, res, next) => {
	console.log(req.params.hotel)
	let data = req.body
	let hotel = { hotel : req.params.hotel }
	console.log(Array.from(data))
	
  // getHotelModel().read(req.params.hotel, (err, entity) => {
  //   if (err) {
  //     next(err);
  //     return;
  //   }
  //   console.log(entity.name)
  //   res.render('makeReservation.pug', {
  //   	reservation: {},
  //   	hotel: entity.name
  // 	});
  // });
});

module.exports = router