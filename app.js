const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

//knexfile
const options = require('./knexfile.js');
const knex = require('knex')(options);

//routers
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/user');

// cors 
const helmet = require('helmet');
const cors = require('cors');

// swagger docs
const swaggerUI = require('swagger-ui-express');
// const swaggerDocument = require('./docs/swagger.json');

const app = express();

app.use(logger('short'));

app.use(helmet());
app.use(cors());

logger.token('req', (req, res) => JSON.stringify(req.headers))
logger.token('res', (req, res) => {
  const headers = {}
  res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
  return JSON.stringify(headers)
})

//setting up knex 
app.use((req, res, next) => {
  req.db = knex
  next()
});

app.get('/knex', function (req, res, next) {
  req.db.raw("SELECT VERSION()")
    .then((version) => console.log((version[0][0])))
    .catch((err) => { console.log(err); throw err })
  res.send("Version Logged successfully");
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// set the routes up
app.use('/', indexRouter);
app.use('/user', usersRouter);
app.use('/', swaggerUI.serve);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
