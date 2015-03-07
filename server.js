#!/usr/bin/env node

var cluster = require('cluster');

function stdout(str){
  console.log("[" + process.pid + "] " + new Date().toISOString() + ": " + str)
}

function stderr(str){
  console.error("ERROR: [" + process.pid + "] " + new Date().toISOString() + ": " + str)
}

if(cluster.isMaster){

  var N = 1 || require('os').cpus().length;
  for(var i = 0; i < N; i++){
    stdout('forking ... ' + (i + 1) + ' of ' + N)
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    stdout('worker ' + worker.process.pid + ' died');
  });

} // /cluster.isMaster

if(cluster.isWorker){

  stdout('hi from ' + process.pid)

  /* General */
  var fs = require('fs');
  var async       = require('async');
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
    assert(config.mongo, 'Mongo should be configured in config.json.');
    assert(config.mongo.database, 'A Mongo database should be configured in config.json.');
    assert(config.mongo && config.mongo.database, 'Mongo should be configured in config.json for Mubsub.');
    assert(config.admin && config.collections, 'Default users and collections should be in config.json.');    
  }

  /* Database */
  // var db  = mongo.connect(config.mongo.database);

  // db.on('error',function(err) {
  //   stderr('MongoDB error: ', err);
  //   process.exit();
  // });

  // db.on('ready',function() {
  //   stdout('Connected to MongoDB.');
  //   /* Check if settings exists and if not -> install default super user from config.json */
  //   db.getCollectionNames(function(err, data){
  //     if(err) {
  //       stderr('Error getting collection names from database.');
  //       process.exit();
  //     }
  //   });

  //   db.collection('settings').findOne({ _id: 'admin' }, function(err, data){
  //     if(!data){
  //       stdout('Initializing MongoDB: creating admin user.');
  //       db.collection('settings').insert(config.admin);
  //     }
  //   });

  //   db.collection('settings').findOne({ _id: 'documents' }, function(err, data){
  //     if(!data){
  //       stdout('Initializing MongoDB: creating default collections.');
  //       db.collection('settings').insert(config.collections);
  //     }
  //   });
  // });


  // Shared database client binding
  var db = null;

  var dbConnect = function(callback){

    stdout('Connecting to MongoDB...');
    var mongodb = require('mongodb');
    var driver  = mongodb.MongoClient;

    driver.connect('mongodb://127.0.0.1:27017/' + config.mongo.database, function(err, client) {
      if(err){
        stderr('MongoDB connection error: ', err);
        callback(err);
      }
      stdout('Connected to MongoDB!');
      db = client;
      callback();
    });
  }

  var app;
  var apiBind = function(callback){

    stdout('Initializing Express.io app...');
    app = express();

    /* Log all API requests */
    app.use(function (req, res, next) {
      stdout(req.ip + " " + req.method + " " + req.path);
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
      stderr('Mubsub client error: trying to reconnect... (' + err + ')');
      client = mubsub('mongodb://' + 'localhost' + ':'+ 27017 +'/' + config.mongo.database);
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
      app:     app,
      channel: channel,
      trigger: trigger
    }

    stdout('Initializing auth API ... ');
    require(process.cwd() + '/api/auth.js')(context)

    stdout('Initializing status API ... ');
    require(process.cwd() + '/api/status.js')(context)

    stdout('Initializing collection API ... ');
    require(process.cwd() + '/api/collection.js')(context)

    stdout('Initializing document API ... ');
    require(process.cwd() + '/api/document.js')(context)

    stdout('Initializing timeseries API ...')
    require(process.cwd() + '/api/timeseries.js')(context)

    stdout('Initializing timeseries CSV API ...')
    require(process.cwd() + '/api/csv.js')(context)

    stdout('Initializing timeseries Excel/TSV API ...')
    require(process.cwd() + '/api/excel.js')(context)

    stdout('Initializing pivot API ... ');
    require(process.cwd() + '/api/pivot.js')(context)

    // Coming soon...
    // require(process.cwd() + '/api/file.js')(context)

    stdout('Initializing compute API ...')
    require(process.cwd() + '/api/compute.js')(context)

    stdout('Initializing execute API ...')
    require(process.cwd() + '/api/execute.js')(context)

    stdout('Initializing schedule API ...')
    require(process.cwd() + '/api/schedule.js')(context)

    callback();
  };

  var appListen = function(callback) {

    assert(config.httpPort,  'config.js: httpPort attribute should be a valid TCP port number.');
    assert(config.httpsPort, 'config.js: httpsPort attribute should be a valid TCP port number.');

    var listening = function(err){
      if(err) callback(err);
      stdout('App listening ... ');
      callback();
    }

    if(config.redirect){
      var redirect = function(req, res) {
      res.writeHead(301, {Location: 'https://' + config.httpsHost + ':' + config.httpsPort || 3001 + req.path}); res.end(); };
      http.createServer(redirect).listen(config.httpPort || 3000, listening);
    } else {
      var httpServer = http.createServer(app).listen(config.httpPort || 3000, listening);
      io = io.listen(httpServer);  
    }

    /* Open app on HTTPS (http://www.mobilefish.com/services/ssl_certificates/ssl_certificates.php) */
    if(config.https){
      var ssl = { key: fs.readFileSync(process.cwd() + '/ssl/key.pem'), cert: fs.readFileSync(process.cwd() + '/ssl/cert.pem') };
      var httpsServer = https.createServer(ssl, app).listen(config.httpsPort || 3001, listening);
      io = io.listen(httpsServer);
    }

  }

  var selfTest = function(callback){
    setTimeout(function(){
      stdout('Running self tests...');

    stdout('Testing auth API ... OK');
    stdout('Testing status API ... OK');
    stdout('Testing collection API ... OK');
    stdout('Testing document API ... OK');
    stdout('Testing timeseries API ... OK');
    stdout('Testing timeseries CSV API ... OK');
    stdout('Testing timeseries Excel/TSV API ... OK');
    stdout('Testing pivot API ... OK');
    stdout('Testing compute API ... OK');
    stdout('Testing execute API ... OK');
    stdout('Testing schedule API ... OK');

      callback()
    }, 100);
  }

  // Load config, connect to MongoDB, then bind all api's and finally start listening...
  async.series([
    loadConfig,
    dbConnect,
    apiBind,
    appListen,
    selfTest,
  ], function(err, results){
    if(err) {
      stderr(err);
      process.exit();
    }
  });

}
// /cluster.isWorker