#!/usr/bin/env node

function stdout(str){
  console.log("[" + process.pid + "] " + new Date().toISOString() + ": " + str)
}

function stderr(str){
  console.error("ERROR: [" + process.pid + "] " + new Date().toISOString() + ": " + str)
}

/* General */
var fs = require('fs');
var async       = require('async');
var io          = require('socket.io');
var moment      = require('moment');
var assert      = require('assert');

/* Express.io */
var express     = require('express');
var helmet      = require('helmet');
var bodyParser  = require('body-parser');
var compression = require('compression');
var busboy      = require('connect-busboy');

/* Socket.io helper (communication between R and app via MongoDB) */
var mubsub      = require('mubsub');

/* Load config.json file */
var config;
var loadConfig = function(callback){

  stdout('Loading config.json file...');
  assert(fs.existsSync(process.cwd() + '/config.json'), 'Configuration file config.json should exist.');

  fs.readFile(process.cwd() + '/config.json', { enconding: 'utf8'}, function(err, data){
    if(err) callback(err);
    config = JSON.parse(data);
    callback();
  });

}

var checkConfig = function(callback){
  assert(config.http, 'HTTP port should be configured in config.json.');
  assert(config.https, 'HTTPS port should be configured in config.json.');
  assert(config.db, 'Mongo should be configured in config.json.');
  assert(config.db.database, 'A Mongo database should be configured in config.json.');
  assert(config.db && config.db.database, 'Mongo should be configured in config.json for Mubsub.');
  assert(config.admin && config.collections, 'Default users and collections should be in config.json.');    
  assert(config.tmp, 'Temporary folder should be configured in config.json.');
}

// Shared database client binding
var db = null;
var dbConnect = function(callback){

  stdout('Connecting to MongoDB...');
  var mongodb = require('mongodb');
  var driver  = mongodb.MongoClient;

  driver.connect('mongodb://'+ config.db.host +':'+ config.db.port +'/' + config.db.database, function(err, client) {
    if(err){
      stderr('MongoDB connection error: ', err);
      callback(err);
    }
    stdout('Connected to MongoDB!');
    db = client;
    callback();

    // Insert admin if it doesn't exist.
    db.collection('settings').find({ _id: 'admin' }).toArray(function(err, data){
      if(err) {
        stderr('Error trying to find admin user...');
        return;
      }
      if(!data.length){
        db.collection('settings').insert(config.admin, function(err, data){
          if(err) stderr('Could not add default admin user: ' + err);
          else stdout('Added default admin user.')
        })

      }
    })

  });
}

// Connect to MongoDB shards
var shards = [];
var shardsConnect = function(callback){

  stdout('Connecting to all MongoDB shards ...');

  var mongodb = require('mongodb');
  var driver  = mongodb.MongoClient;

  var async    = require('async');
  var request  = require('request');

  async.eachSeries(config.cluster.nodes, function(node, callback){

    stdout('Connecting to shard... ');
    
    driver.connect('mongodb://'+ node.host +':'+ node.shardport +'/' + config.db.database, function(err, client) {
      if(err){
        stderr('MongoDB connection error: ', err);
        callback(err);
      }
      stdout('Connected to MongoDB shard!');
      shards.push(client);
      callback();
    });

  }, function(err){
    if(err) stderr('Error connecting to shards.');
    callback(err);
  });

}

var app = null;
var apiBind = function(callback){

  stdout('Initializing Express.io app...');
  app = express();

  // gzip all data
  app.use(compression());

  /* Log all API requests */
  app.use(function (req, res, next) { stdout(req.ip + " " + req.method + " " + req.path); next(); });

  // app.use(helmet());

  // For file uploads
  app.use(busboy());

  // Credits: http://stackoverflow.com/questions/19917401/node-js-express-request-entity-too-large
  app.use(bodyParser.json({limit: '16mb'}));
  app.use(bodyParser.text({ type: 'text/xml' }))
  app.use(bodyParser.urlencoded({limit: '16mb', extended: true }));
  app.use(express.static(process.cwd() + '/pub'));

  /* MongoDB R triggers */ 
  // {"event" : "update", "message" : "timeseries/tstest"}
  // var client = mubsub('mongodb://' + 'localhost' + ':'+ 27017 +'/' + config.db.database);
  var client = mubsub(db);
  client.on('error', function(err){
    stderr('Mubsub client error: trying to reconnect... (' + err + ')');
    client = mubsub('mongodb://' + config.db.host + ':'+ config.db.port +'/' + config.db.database);
  });

  var channel = client.channel('triggers');  
  channel.on('error', stderr);
  
  channel.subscribe('update', function(message) {
    // stdout(moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ': mubsub: socket.io: ' + message);
    io.sockets.emit(message, 'updated');
  });

  /* Simple socket.io trigger function for use in api routes */
  var trigger = function(message, channel){
    db.collection('triggers').insert({ event: channel, "message": message }, function(err, data){
      if(err) stderr('trigger: ' + err);
    })
    // io.sockets.emit(message, channel);
  };

  var context = {
    stdout:  stdout,
    stderr:  stderr,
    config:  config,
    db:      db,
    shards:  shards,
    app:     app,
    channel: channel,
    trigger: trigger
  }

  require(process.cwd() + '/api/auth.js')(context)
  require(process.cwd() + '/api/public.js')(context)
  require(process.cwd() + '/api/collection.js')(context)
  require(process.cwd() + '/api/upload.js')(context)
  require(process.cwd() + '/api/pivot.js')(context)
  require(process.cwd() + '/api/document.js')(context)
  require(process.cwd() + '/api/compute.js')(context)

  // require(process.cwd() + '/api/execute.js')(context)
  // require(process.cwd() + '/api/timeseries.js')(context)
  // require(process.cwd() + '/api/compute.js')(context)
  // require(process.cwd() + '/api/status.js')(context)
  // require(process.cwd() + '/api/soap.js')(context)
  // require(process.cwd() + '/api/csv.js')(context)
  // require(process.cwd() + '/api/excel.js')(context)
  // require(process.cwd() + '/api/mapreduce.js')(context) // R-script only
  // require(process.cwd() + '/api/schedule.js')(context)

  // todo... text file interface using _data container of object
  // require(process.cwd() + '/api/file.js')(context)
  // todo... binary file interface using GridFS
  // require(process.cwd() + '/api/bfile.js')(context)

  // Credits: http://stackoverflow.com/a/18214539/3514414
  app.use(function(req, res) {
    stdout('Defaulting to public index.')
    res.sendFile(process.cwd() + '/pub/index.html');
  });

  callback();
};

var appListen = function(callback) {

  if(config.ssl &&
     config.ssl.ca  && fs.existsSync(config.ssl.ca)  &&
     config.ssl.key && fs.existsSync(config.ssl.key) &&
     config.ssl.crt && fs.existsSync(config.ssl.crt)){
  
    // Credits: http://stackoverflow.com/a/23975955/3514414
    // Redirect from http port 80 to https
    var http = require('http');
    http.createServer(function (req, res) {
      res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
      res.end();
    }).listen(config.http);
    stdout('App redirecting HTTP connections on TCP port ' + config.http + ' to HTTPS on TCP port ' + config.http + '.');

    // Credits: http://qugstart.com/blog/node-js/install-comodo-positivessl-certificate-with-node-js/
    var options = {
      ca:   fs.readFileSync(config.ssl.ca,   { encoding: 'utf-8' }),
      key:  fs.readFileSync(config.ssl.key,  { encoding: 'utf-8' }),
      cert: fs.readFileSync(config.ssl.crt,  { encoding: 'utf-8' })
    };

    var https  = require('https');
    var server = https.createServer(options, app).listen(config.https, function(err){
      if(err) { callback(err); process.exit(); return; }
      stdout('App listening for HTTPS connections on TCP port ' + config.https + '.');
      callback();
    });
    server.timeout = 30 * 60 * 1000; // 30min
    io = io.listen(server);  

  } else {
  
    var http   = require('http');
    var server = http.createServer(app).listen(config.http, function(err){
      if(err) { callback(err); process.exit(); return; }
      stdout('App listening for HTTP connections on TCP port ' + config.http + '.');
      callback();
    });
    server.timeout = 30 * 60 * 1000; // 30min
    io = io.listen(server);  

  }

}

// Load config, connect to MongoDB, then bind all api's and finally start listening...
async.series([ loadConfig, dbConnect, shardsConnect, apiBind, appListen ],
  function(err, results){ if(err) { stderr(err); process.exit(); }
});

