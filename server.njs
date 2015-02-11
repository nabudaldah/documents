#!/usr/bin/env node

/* General */
var fs          = require('fs');
var mongo       = require('mongojs');
var io          = require('socket.io');
var moment      = require('moment');
var assert      = require('assert');

/* Express.io */
var http        = require('http');
var https       = require('https');
var express     = require('express');
var helmet      = require('helmet');
var bodyParser  = require('body-parser');
var compression = require('compression');

/* Socket.io helper (communication between R and app via MongoDB) */
var mubsub      = require('mubsub');

/* Load config.json file */
console.log('Loading config.json file...');
assert(fs.existsSync(process.cwd() + '/config.json'), 'Configuration file config.json should exist.');
var config;
try {
  var content = fs.readFileSync(process.cwd() + '/config.json', { enconding: 'utf8'} );
  config = JSON.parse(content);
} catch(e){
  assert(false, 'config.json should be in valid JSON format.')
  console.error('Error reading config.json: ' + e);
  process.exit();
}

assert(config.mongo, 'Mongo should be configured in config.json.');
assert(config.mongo.database, 'A Mongo database should be configured in config.json.');
assert(config.mongo && config.mongo.database, 'Mongo should be configured in config.json for Mubsub.');
assert(config.admin && config.collections, 'Default users and collections should be in config.json.');

/* Database */
console.log('Connecting to MongoDB...');
var db  = mongo.connect(config.mongo.database);

// db.on('error',function(err) {
//   console.error('MongoDB error: ', err);
//   process.exit();
// });

// db.on('ready',function() {
//   console.log('Connected to MongoDB.');

//   /* Check if settings exists and if not -> install default super user from config.json */
//   db.getCollectionNames(function(err, data){

//     if(err) {
//       console.error('Error getting collection names from database.');
//       process.exit();
//     }

//     if(!data || !data.length || data.indexOf('settings') == -1){
//       console.log('Initializing MongoDB: creating admin user and default collections.');
//       db.collection('settings').insert(config.admin);
//       db.collection('settings').insert(config.collections);
//     }

//   });
// });

console.log('Initializing Express.io app...');
var app = express();

/* Log all API requests */
app.use(function (req, res, next) {
  console.log(moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ": [" + req.method + "] " + req.path);
  next();
})

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

app.use(helmet());

// Credits: http://stackoverflow.com/questions/19917401/node-js-express-request-entity-too-large
app.use(bodyParser.json({limit: '16mb'}));
app.use(bodyParser.urlencoded({limit: '16mb', extended: true }));

app.use(compression({threshold: 512}));
app.use(express.static(process.cwd() + '/pub'));

/* MongoDB R triggers */ 
// {"event" : "update", "message" : "timeseries/tstest"}
var client = mubsub('mongodb://' + 'localhost' + ':'+ 27017 +'/' + config.mongo.database);
client.on('error', function(err){
  console.error('Mubsub client error: trying to reconnect... (' + err + ')');
  client = mubsub('mongodb://' + 'localhost' + ':'+ 27017 +'/' + config.mongo.database);
});

var channel = client.channel('triggers');  
channel.on('error', console.error);
  
channel.subscribe('update', function(message) {
  console.log(moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ': mubsub: socket.io: ' + message);
  io.sockets.emit(message, 'updated');
});

/* Simple socket.io trigger function for use in api routes */
var trigger = function(message, channel){
  db.collection('triggers').insert({ event: channel, "message": message })
  // io.sockets.emit(message, channel);
};

require(process.cwd() + '/api/auth.js')(app, config, db, trigger);
require(process.cwd() + '/api/status.js')(app);
require(process.cwd() + '/api/collection.js')(app, db);
require(process.cwd() + '/api/pivot.js')(app, config);
require(process.cwd() + '/api/document.js')(app, config, db, trigger);
require(process.cwd() + '/api/file.js')(app, db);
require(process.cwd() + '/api/csv.js')(app, db);
require(process.cwd() + '/api/excel.js')(app, db);
require(process.cwd() + '/api/timeseries.js')(app, config, db);
require(process.cwd() + '/api/compute.js')(app, config, db);
require(process.cwd() + '/api/execute.js')(app, config, db);
require(process.cwd() + '/api/schedule.js')(app, config, db, channel);
require(process.cwd() + '/api/status.js')(app);

assert(config.httpPort,  'config.js: httpPort attribute should be a valid TCP port number.');
assert(config.httpsPort, 'config.js: httpsPort attribute should be a valid TCP port number.');

if(config.redirect){
  var redirect = function(req, res) {
    res.writeHead(301, {Location: 'https://' + config.httpsHost + ':' + config.httpsPort || 3001 + req.path}); res.end(); };
  http.createServer(redirect).listen(config.httpPort || 3000);
} else {
  var httpServer = http.createServer(app).listen(config.httpPort || 3000);
  io = io.listen(httpServer);  
}

/* Open app on HTTPS (http://www.mobilefish.com/services/ssl_certificates/ssl_certificates.php) */
if(config.https){
  var ssl = { key: fs.readFileSync(process.cwd() + '/ssl/key.pem'), cert: fs.readFileSync(process.cwd() + '/ssl/cert.pem') };
  var httpsServer = https.createServer(ssl, app).listen(config.httpsPort || 3001);
  io = io.listen(httpsServer);
}
