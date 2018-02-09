const express = require('express')
const router = express.Router()
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const session = require('express-session');

router.use(express.static(path.join(__dirname, './public')));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true })); 
router.use(cookieParser());
router.use(session({
    key: 'user_sid',
    secret: 'somerandonstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));

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

const sessionChecker = (req, res, next) => {
    if (!req.session.user && !req.cookies.user_sid) {
        res.redirect('/signIn');
    } else {
        next();
    }
};

const logInChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/hotelSearch');
    } else {
        next();
    }
};

router.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');        
    }
    next();
});

router.get('/signIn', logInChecker, (req, res) => {
  res.render('signIn.pug', {
    user: {},
  });
});

router.post('/signIn', logInChecker, (req, res) => {

 
  getUserModel().listByUsername(req.body.email, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    if (entities.length === 0) {
      console.log("Account with that username does not exist.");
      res.render('signIn.pug', {
        user: {},
        message: "Account with that username does not exist.",
      });
    } else {
      bcrypt.compare(req.body.password, entities[0].password, function(err, response) {
        if (response === true) {
          req.session.user = entities[0].id;
          req.session.name = entities[0].first;
          res.redirect('/hotelSearch');
        } else {
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

router.get('/signUp', logInChecker, (req, res) => {
  res.render('signUp.pug', {
    user: {},
  });
});

router.post('/signUp', logInChecker, (req, res) => {

  getUserModel().listByUsername(req.body.email, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    if (entities.length > 0) {
      res.render('signUp.pug', {
        user: {},
        message: "Account with that email already exists."
      });
    } else {
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

router.get('/hotelSearch', sessionChecker, (req, res) => {
    res.render('hotelSearch.pug', {
      reservation: {},
      name: req.session.name,
    });
});

router.post('/hotelSearch', sessionChecker, (req, res) => {

  let availableHotelIds = new Set();

  getRoomModel().list(req.body.city, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }
    console.log(entities.length);
    for (let i = 0; i < entities.length; i++) {
      let currentRoom = entities[i];
      let datesBooked = currentRoom.datesBooked;

      if (!(availableHotelIds.has(currentRoom.hotel))) {
        if (datesBooked.length == 0) {
          availableHotelIds.add(currentRoom.hotel);
        } else {
          datesBooked.push(req.body.start + "," + req.body.end)
          datesBooked.sort(function(a, b) {
            a = new Date(a.split(",", 1));
            b = new Date(b.split(",", 1));
            if (a <= b) return -1;
            if (a >= b) return 1;
          });

          let overlap = false;
          console.log(datesBooked);
          for (let j = 1; j < datesBooked.length; j++) {
            let dateOne = new Date (datesBooked[j - 1].split(",").pop());
            let dateTwo = new Date (datesBooked[j].split(",", 1));
            if (dateOne >= dateTwo) {
              console.log(dateOne + " " + dateTwo);
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

router.get('/makeReservation', sessionChecker, (req, res) => {
  res.redirect('/hotelSearch');
});

router.post('/makeReservation', sessionChecker, (req, res) => {
  console.log(req.body.hotel);
  let booked = false;

  getRoomModel().listByHotel(req.body.hotel, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    for (let i = 0; i < entities.length; i++) {
      let currentRoom = entities[i];
      let datesBooked = currentRoom.datesBooked;

      if (datesBooked.length == 0) {
        
          let reservation = {
            user: req.session.user,
            start: req.body.start,
            end: req.body.end, 
            hotel: req.body.hotel,
            hotelName: req.body.name,
            room: currentRoom.number
          };

          console.log(reservation);
    
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

router.get('/reservations', sessionChecker, (req, res) => {
  console.log(req.session.user);
  getReservationModel().list(req.session.user, (err, entities, cursor) => {
    console.log(entities);
    res.render('reservations.pug', {
      reservations: entities,
    });
  });  
});

router.get('/signOut', sessionChecker, (req, res) => {
  res.clearCookie('user_sid');
  res.redirect("/signIn");  
});

//OLD
router.get('/hotels', (req, res, next) => {
  console.log(req.body.hotel);
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

// router.get('/:hotel/makeReservation', (req, res, next) => {
//   getHotelModel().read(req.params.hotel, (err, entity) => {
//     if (err) {
//       next(err);
//       return;
//     }

//     res.render('makeReservation.pug', {
//     	reservation: {},
//     	hotel: entity.name
//   	});
//   });
// });

// router.post('/:hotel/makeReservation', (req, res, next) => {

   

//   getRoomModel().list(req.params.hotel, (err, entities, cursor) => {
//     if (err) {
//       next(err);
//       return;
//     }

//     let responseMessage = "";

//     for (let i = 0; i < entities.length; i++) {
//     	let currentRoom = entities[i];
//     	let datesBooked = currentRoom.datesBooked;

//     	if (datesBooked.length == 0) {
      	
// 	        let reservation = {
// 	          first: req.body.first,
// 	  	      last: req.body.last,
// 	  	      start: req.body.start,
// 	  	      end: req.body.end, 
// 	  	      hotel: req.params.hotel,
// 	  	      room: currentRoom.number
// 	        };
		
// 	        getReservationModel().create(reservation, (err, entity) => {
// 	          if (err) {
// 	            next(err);
// 	            return;
// 	          }
// 	        });


// 	        datesBooked.push(req.body.start + "," + req.body.end);
// 	        let roomUpdate = {
// 	          number: currentRoom.number,
// 	  	      datesBooked: datesBooked,
// 	  	      hotelName: currentRoom.hotelName,
// 	  	      hotel: currentRoom.hotel,
// 	        };

// 	        getRoomModel().update(currentRoom.id, roomUpdate, function (err, savedData) {
// 	          if (err) {
// 	            next(err);
// 	            return;
// 	          }
// 	        });

// 	        responseMessage = "Room succesfully booked!"
// 	        break;
//       } else {
    	
//     	//Add proposed date to array of dates booked, then sort
//       	datesBooked.push(req.body.start + "," + req.body.end)
//       	datesBooked.sort(function(a, b) {
//           a = new Date(a.split(",", 1));
//           b = new Date(b.split(",", 1));
//           if (a <= b) return -1;
//           if (a >= b) return 1;
//         });


//       	//Check if there is overlap
//       	let overlap = false;
//         for (let j = 1; j < datesBooked.length; j++) {
//         	let dateOne = new Date (datesBooked[j - 1].split(",").pop());
//         	let dateTwo = new Date (datesBooked[j].split(",", 1));
//         	if (dateOne >= dateTwo) {
//         		overlap = true;
//         		responseMessage = "No rooms were available on those dates.";
//         	}
//         }

//         //if no overlap exist, book reservation
//         if (overlap === false){

//         	let reservation = {
// 	          first: req.body.first,
// 	  	      last: req.body.last,
// 	  	      start: req.body.start,
// 	  	      end: req.body.end, 
// 	  	      hotel: req.params.hotel,
// 	  	      room: currentRoom.number
// 	        };
		
// 	        getReservationModel().create(reservation, (err, entity) => {
// 	          if (err) {
// 	            next(err);
// 	            return;
// 	          }
// 	        });


// 	        datesBooked.push(req.body.start + "," + req.body.end);
// 	        let roomUpdate = {
// 	          number: currentRoom.number,
// 	  	      datesBooked: datesBooked,
// 	  	      hotelName: currentRoom.hotelName,
// 	  	      hotel: currentRoom.hotel,
// 	        };

// 	        getRoomModel().update(currentRoom.id, roomUpdate, function (err, savedData) {
// 	          if (err) {
// 	            next(err);
// 	            return;
// 	          }
// 	        });
// 	        responseMessage = "Room succesfully booked!"
//         	break;
//         } 
//       }
//     }
    
//     getHotelModel().read(req.params.hotel, (err, entity) => {
//       if (err) {
//         next(err);
//         return;
//       }

//       res.render('hotel.pug', {
//         message: responseMessage,
//         hotel: entity
//       });
//     });
//   });
// });


// router.get('/:hotel/manageReservations', (req, res, next) => {
// 	getHotelModel().read(req.params.hotel, (err, entity) => {
//       if (err) {
//         next(err);
//         return;
//       }
//       res.render('manageReservations.pug', {
//         reservation: {},
//         hotel: entity.name
//   	  });
//   });
// });

// router.post('/:hotel/manageReservations', (req, res, next) => {
//   let filters = [req.body.first, req.body.last, req.params.hotel];
//   getReservationModel().list(filters, (err, entities, cursor) => {
//     if (err) {
//       next(err);
//       return;
//     }

//     res.render('reservations.pug', {
//       first: req.body.first,
//       last: req.body.last,
//       reservations: entities,
//       nextPageToken: cursor
//     });
//   });
// });

// router.get('/:hotel/manageReservations/:reservation/delete', (req, res, next) => {
// 	getReservationModel().delete(req.params.reservation, (err, entity) => {
//       if (err) {
//         next(err);
//         return;
//       }
//       res.redirect(`${req.baseUrl}/${req.params.hotel}`)
//   });
// });


module.exports = router