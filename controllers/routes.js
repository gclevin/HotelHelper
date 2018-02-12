const express = require('express')
const router = express.Router()
const path = require('path');
const bcrypt = require('bcryptjs');
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

function getUserModel () {
  return require('./../models/userModel.js');
}

//Redirect user if they are not logged in
const loggedInCheck = (req, res, next) => {
    if (!req.session.user) { 
      res.redirect('signIn');
    } else {
      next();
    }
}

//Redirect user if they are already logged in
const loggedOutCheck = (req, res, next) => {
    if (req.session.user) { 
      res.redirect('hotelSearch');
      return;
    } else {
      next();
    }
}

router.use((req, res, next) => {
    next();
});

router.get('/signIn', loggedOutCheck, (req, res) => {
  res.render('signIn.pug', {
    user: {},
  });
});

router.post('/signIn', loggedOutCheck, (req, res) => {

  getUserModel().listByUsername(req.body.email, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    if (entities.length === 0) { //Username does not exist
      res.render('signIn.pug', {
        user: {},
        message: "Account with that username does not exist.",
      });
    } else {
      bcrypt.compare(req.body.password, entities[0].password, function(err, response) {
        if (response === true) { //Username and password correct
          req.session.user = entities[0].id;
          req.session.name = entities[0].first;
          res.redirect('hotelSearch');
        } else { //Username exists, but inputted password is incorrect
          console.log("Incorrect Password");
          res.render('signIn.pug', {
            user: {},
            message: "Incorrect Password",
          });
        }
      });
    }
  });
});

router.get('/signUp', loggedOutCheck, (req, res) => {
  res.render('signUp.pug', {
    user: {},
  });
});

router.post('/signUp', loggedOutCheck, (req, res) => {

  getUserModel().listByUsername(req.body.email, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    if (entities.length > 0) { //Username already taken
      res.render('signUp.pug', {
        user: {},
        message: "Account with that email already exists."
      });
    } else { //Create new account, slating and hashing the password
      bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
          let newUser = {
            first: req.body.first,
            last: req.body.last,
            email: req.body.email,
            password: hash,
          }
          getUserModel().create(newUser, (err, entity) => {
            if (err) {
              next(err);
              return;
            }

            req.session.user = entity.id;
            req.session.name = req.body.first;
            res.redirect('/hotelSearch');
          }); 
        });
      });
    }
  });
});

router.get('/hotelSearch', loggedInCheck, (req, res) => {
    res.render('hotelSearch.pug', {
      reservation: {},
      name: req.session.name,
    });
});

router.post('/hotelSearch', loggedInCheck, (req, res) => {


  let availableHotelIds = new Set(); //Holds the IDs of available hotels

  getRoomModel().list(req.body.city, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    for (let i = 0; i < entities.length; i++) {
      let currentRoom = entities[i];
      let datesBooked = currentRoom.datesBooked;

      if (!(availableHotelIds.has(currentRoom.hotel))) { //if current room's hotel doesn't exist in our set
        if (datesBooked.length == 0) { //room availability completely open
          availableHotelIds.add(currentRoom.hotel);
        } else { //room is booked on certain days
          //sort dates booked
          datesBooked.push(req.body.start + "," + req.body.end)
          datesBooked.sort(function(a, b) {
            a = new Date(a.split(",", 1));
            b = new Date(b.split(",", 1));
            if (a <= b) return -1;
            if (a >= b) return 1;
          });

          //Check for overlap based on sorted list
          let overlap = false;
          for (let j = 1; j < datesBooked.length; j++) {
            let dateOne = new Date (datesBooked[j - 1].split(",").pop());
            let dateTwo = new Date (datesBooked[j].split(",", 1));
            if (dateOne >= dateTwo) {
              overlap = true;
            }
          }

          if (overlap === false) {
            availableHotelIds.add(currentRoom.hotel);
            break;
          }
        }
      }
    } 

    getHotelModel().listByCity(req.body.city, (err, hotelEntities, cursor) => {
      if (err) {
        next(err);
        return;
      }

      //Get hotel entities based on IDs in our set
      let availableHotels = [];
      for (let k = 0; k < hotelEntities.length; k++) {
        if (availableHotelIds.has(hotelEntities[k].id)) {
          availableHotels.push(hotelEntities[k]);
        }
      }

      res.render('hotelResults.pug', {
        hotels: availableHotels,
        start: req.body.start,
        end: req.body.end
      });  
    });  
  });  
});

router.get('/makeReservation', loggedInCheck, (req, res) => {
  res.redirect('/hotelSearch');
});

router.post('/makeReservation', loggedInCheck, (req, res) => {

  let booked = false;

  getRoomModel().listByHotel(req.body.hotel, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    for (let i = 0; i < entities.length; i++) {
      let currentRoom = entities[i];
      let datesBooked = currentRoom.datesBooked;

      if (datesBooked.length == 0) { //room availability completely open
        
          let reservation = {
            user: req.session.user,
            start: req.body.start,
            end: req.body.end, 
            hotel: req.body.hotel,
            hotelName: req.body.name,
            room: currentRoom.number
          };
    
          getReservationModel().create(reservation, (err, entity) => {
            if (err) {
              next(err);
              return;
            }
          });

          //Update room entity to reflect newly made resrevation
          datesBooked.push(req.body.start + "," + req.body.end);
          let roomUpdate = {
            number: currentRoom.number,
            datesBooked: datesBooked,
            hotelName: currentRoom.hotelName,
            hotel: currentRoom.hotel,
            city: currentRoom.city
          };

          getRoomModel().update(currentRoom.id, roomUpdate, function (err, savedData) {
            if (err) {
              next(err);
              return;
            }
          });
          booked = true;
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
          }
        }

        //if no overlap exist, book reservation
        if (overlap === false){

          let reservation = {
            user: req.session.user,
            start: req.body.start,
            end: req.body.end, 
            hotel: req.body.hotel,
            hotelName: req.body.name,
            room: currentRoom.number
          };
    
          getReservationModel().create(reservation, (err, entity) => {
            if (err) {
              next(err);
              return;
            }
          });


          let roomUpdate = {
            number: currentRoom.number,
            datesBooked: datesBooked,
            hotelName: currentRoom.hotelName,
            hotel: currentRoom.hotel,
            city: currentRoom.city
          };

          getRoomModel().update(currentRoom.id, roomUpdate, function (err, savedData) {
            if (err) {
              next(err);
              return;
            }
          });
          booked = true;
          break;
        } 
      }
    }
    
    if (booked) {
      res.redirect("/reservations");
    } else {
      res.render('hotelSearch.pug', {
        reservation: {},
        name: req.session.name,
        message: "Requested room no longer available.",
      });
    }
  });
});

router.get('/reservations', loggedInCheck, (req, res) => {

  getReservationModel().list(req.session.user, (err, entities, cursor) => {
    res.render('reservations.pug', {
      reservations: entities,
    });
  });  
});

router.get('/signOut', (req, res) => {
  req.session.destroy();
  res.redirect("/signIn");  
});

router.get('/hotels', (req, res, next) => {
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
        city: req.body.city
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

module.exports = router