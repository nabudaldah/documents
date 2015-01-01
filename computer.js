
/* Express.io */
var http        = require('http');
var express     = require('express');
var bodyParser  = require('body-parser');
var moment      = require('moment');

console.log('Initializing Express.io app...');
var app = express();

/* Log all API requests */
app.use(function (req, res, next) {
  console.log(process.pid + "> " + moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ": [" + req.method + "] " + req.path);
  next();
})

app.use(bodyParser.json({limit: '16mb'}));


/* Express modules */
// Credits: http://stackoverflow.com/a/12497793
app.use(function(req, res, next){
  if (req.is('text/*')) {
    req.text = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk){ req.text += chunk; });
    req.on('end', next);
  } else {
    next();
  }
});

/* R API */
app.get('/v1/r/:collection/:id', function (req, res) {
  // ...
});

/* Javascript API */
app.get('/v1/js/:collection/:id', function (req, res) {
  // ...
});

/* Octave (Matlab) API */
app.get('/v1/octave/:collection/:id', function (req, res) {
  // ...
});

/* Python2 API */
app.get('/v1/python2/:collection/:id', function (req, res) {
  // ...
});

/* GEN API */
app.get('/v1/gen/:collection/:id', function (req, res) {
  // ...
});

/* API */
app.listen(4000);
