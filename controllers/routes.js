const express = require('express')
const router = express.Router()
const path = require('path');
const bodyParser = require('body-parser');

router.use(express.static(path.join(__dirname, './public')));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true })); 

function getHotelModel () {
	return require('./../models/hotelModel.js');
}

function getRoomModel () {
	return require('./../models/roomModel.js');
}

function getReservationModel () {
	return require('./../models/reservationModel.js');
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
	let arr = [];

	for (var i = 1; i <= numRooms; i++) {
  	  let entity = {
  	    number: i,
  	    datesBooked: arr,
  	    hotelName: req.body.name,
  	    hotel: savedData.id,
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

router.get('/:hotel/makeReservation', (req, res, next) => {
  getHotelModel().read(req.params.hotel, (err, entity) => {
    if (err) {
      next(err);
      return;
    }

    res.render('makeReservation.pug', {
    	reservation: {},
    	hotel: entity.name
  	});
  });
});

router.post('/:hotel/makeReservation', (req, res, next) => {

   

  getRoomModel().list(req.params.hotel, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    let responseMessage = "";

    for (let i = 0; i < entities.length; i++) {
    	let currentRoom = entities[i];
    	let datesBooked = currentRoom.datesBooked;

    	if (datesBooked.length == 0) {
      	
	        let reservation = {
	          first: req.body.first,
	  	      last: req.body.last,
	  	      start: req.body.start,
	  	      end: req.body.end, 
	  	      hotel: req.params.hotel,
	  	      room: currentRoom.number
	        };
		
	        getReservationModel().create(reservation, (err, entity) => {
	          if (err) {
	            next(err);
	            return;
	          }
	        });


	        datesBooked.push(req.body.start + "," + req.body.end);
	        let roomUpdate = {
	          number: currentRoom.number,
	  	      datesBooked: datesBooked,
	  	      hotelName: currentRoom.hotelName,
	  	      hotel: currentRoom.hotel,
	        };

	        getRoomModel().update(currentRoom.id, roomUpdate, function (err, savedData) {
	          if (err) {
	            next(err);
	            return;
	          }
	        });

	        responseMessage = "Room succesfully booked!"
	        break;
      } else {
    	
    	//Add proposed date to array of dates booked, then sort
      	datesBooked.push(req.body.start + "," + req.body.end)
      	datesBooked.sort(function(a, b) {
          a = new Date(a.split(",", 1));
          b = new Date(b.split(",", 1));
          if (a <= b) return -1;
          if (a >= b) return 1;
        });


      	//Check if there is overlap
      	let overlap = false;
        for (let j = 1; j < datesBooked.length; j++) {
        	let dateOne = new Date (datesBooked[j - 1].split(",").pop());
        	let dateTwo = new Date (datesBooked[j].split(",", 1));
        	if (dateOne >= dateTwo) {
        		overlap = true;
        		responseMessage = "No rooms were available on those dates.";
        	}
        }

        //if no overlap exist, book reservation
        if (overlap === false){

        	let reservation = {
	          first: req.body.first,
	  	      last: req.body.last,
	  	      start: req.body.start,
	  	      end: req.body.end, 
	  	      hotel: req.params.hotel,
	  	      room: currentRoom.number
	        };
		
	        getReservationModel().create(reservation, (err, entity) => {
	          if (err) {
	            next(err);
	            return;
	          }
	        });


	        datesBooked.push(req.body.start + "," + req.body.end);
	        let roomUpdate = {
	          number: currentRoom.number,
	  	      datesBooked: datesBooked,
	  	      hotelName: currentRoom.hotelName,
	  	      hotel: currentRoom.hotel,
	        };

	        getRoomModel().update(currentRoom.id, roomUpdate, function (err, savedData) {
	          if (err) {
	            next(err);
	            return;
	          }
	        });
	        responseMessage = "Room succesfully booked!"
        	break;
        } 
      }
    }
    
    getHotelModel().read(req.params.hotel, (err, entity) => {
      if (err) {
        next(err);
        return;
      }

      res.render('hotel.pug', {
        message: responseMessage,
        hotel: entity
      });
    });
  });
});


router.get('/:hotel/manageReservations', (req, res, next) => {
	getHotelModel().read(req.params.hotel, (err, entity) => {
      if (err) {
        next(err);
        return;
      }
      res.render('manageReservations.pug', {
        reservation: {},
        hotel: entity.name
  	  });
  });
});

router.post('/:hotel/manageReservations', (req, res, next) => {
  let filters = [req.body.first, req.body.last, req.params.hotel];
  getReservationModel().list(filters, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    res.render('reservations.pug', {
      first: req.body.first,
      last: req.body.last,
      reservations: entities,
      nextPageToken: cursor
    });
  });
});

router.get('/:hotel/manageReservations/:reservation/delete', (req, res, next) => {
	getReservationModel().delete(req.params.reservation, (err, entity) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${req.params.hotel}`)
  });
});


module.exports = router