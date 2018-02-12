const path = require('path');
const express = require('express');
const session = require('express-session');

const app = express();
const PORT = 8080;

let sess = {
  secret: 'keyboard cat',
  cookie: {}
}

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, './public')));

//Configure Express sessions
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) 
  sess.cookie.secure = true 
}

app.use(session(sess));

app.use('/', require('./controllers/routes'));

app.get('/', (req, res) => {
  res.redirect('/signIn');
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});