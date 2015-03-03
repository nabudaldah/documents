#!/usr/bin/env node

/* General */
var fs          = require('fs');
var mongo       = require('mongojs');
//var io          = require('socket.io');
var moment      = require('moment');
var assert      = require('assert');
var async       = require('async');

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

/* MongoDB R triggers */ 
// {"event" : "update", "message" : "timeseries/tstest"}
var client = mubsub('mongodb://' + 'localhost' + ':'+ 27017 +'/' + config.mongo.database);
var channel = client.channel('triggers');  
client.on('error', console.error);
channel.on('error', console.error);

var change = false;
channel.subscribe('update', function(message) {
  //console.log(moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ': mubsub: ' + message);
  //compute();
  change = true;
});

/* R engine */
var Rv3 = require('./lib/R.js');
var R = new Rv3(config.R.exe);
R.start(function(){
  R.init('source("../lib/functions.R");', function(err){
    if(err) {
      console.log('R.init(): Error: ' + err);
      process.exit();
    }
    console.log('R: ' + R.ready() + ' instances ready to handle jobs. ');
  });
});

/* Database */
console.log('Connecting to MongoDB...');
var db  = mongo.connect(config.mongo.database);

db.on('error',function(err) {
  console.error('MongoDB error: ', err);
  process.exit();
});

db.on('ready',function() {
  console.log('Connected to MongoDB.');
});

function compute(script){
  R.run(script, function(err, job){
    // console.log('executed: ' + job.id + ': ' + job.log)
  });
}

// not time triggered, but recursive... might me memory hog
function computeCycle(compute, callback){

  var query  = { _tags: { $in: ["computation", "data"] } };
  var fields = { _id: 1, _tags: 1, _update: 1, dependencies: 1, computation: 1 };

  function getDocuments(callback){
    db.collection('computations').find(query, fields, function(err, data) {
      documentsList = data;
      callback();
    });
  };

  function sortDocuments(callback){
    for(d in documentsList){
      var doc = documentsList[d];
      documents[doc._id] = doc;
      if(doc._tags[0] = "computation") computationDocuments[doc._id] = doc;
      if(doc._tags[0] = "data")        dataDocuments[doc._id] = doc;
    }
    callback();
  };

  function listComputations(callback){
    for(c in computationDocuments){
      var parent = computationDocuments[c];
      if(!parent.dependencies) continue;
      var id = parent.dependencies.split('/')[1];
      var child = documents[id];
      if(parent && child && new Date(parent._update) < new Date(child._update)){ // when deleting from MongoDB, the objects disapear here from memory (?)
        computations[parent._id] = parent._id;
      }      
    }
    callback();
  };

  function queueComputations(callback){
    for(id in computations){
      var computation = documents[id];
      var init   = 'context <- list(collection="' + 'computations' + '", id="' + computation._id + '");\n';
      var script = computation.computation;
      compute(init + script);      
    }
    callback();
  };

  function finish(err){
    if(callback && typeof(callback) == 'function') callback();
  };

  var N = 0;
  var documentsList = [];
  var documents     = {};
  var computationDocuments = {};
  var dataDocuments = {}; 
  var computations  = {};
  async.series([getDocuments, sortDocuments, listComputations, queueComputations], finish);

}

// compute cycle
var sorting = false;
setInterval(function(){
  
  if(R.ready() == 0 || R.queue.length) return;

  if(change && !sorting) {
    sorting = true;
    computeCycle(compute, function(){
      sorting = false;
      change = false;
    });
  }

}, 10);

var os = require("os");

var trigger = function(message, channel){
  db.collection('triggers').insert({ event: channel, "message": message })
  // io.sockets.emit(message, channel);
};

// health check
setInterval(function(){

  if(!R.ready())
    console.log(moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ': R not ready yet...');
  
  console.log(moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ': queue: ' + R.queue.length + ', influx: ' + R.influx, ', efflux: ' + R.efflux);
  
  var collection = db.collection('computations');

  var id = os.hostname();

  // console.log(R)

  var processes = R.instances.map(function(instance){
    return 'R[' + instance.process.pid + ']: ' + (instance.job?'working':'idle')
  });

  var status = {
    _id: id,
    _tags: ["computer", "host", os.hostname()],
    _update: moment().format(),
    queue:  'queue:  ' + R.queue.length,
    influx: 'influx: ' + R.influx,
    efflux: 'efflux: ' + R.efflux,
    R0: processes[0],
    R1: processes[1],
    R2: processes[2],
    R3: processes[3]
  };

  collection.update({ _id: id }, { $set: status }, { upsert: true }, function(err, data){ 
    if(err || !data) { console.error('Database error.'); return; }
    var ref = 'computations' + '/' + id;
    trigger(ref, 'update'); // should be array of names of values changed... 
    return;
  });

  // reset fluxis
  R.influx = R.efflux = 0;

}, 1000);




// /* Express.io */
// var http        = require('http');
// var https       = require('https');
// var express     = require('express');
// var helmet      = require('helmet');
// var bodyParser  = require('body-parser');
// var compression = require('compression');

// //console.log('Initializing Express.io app...');
// var app = express();

// app.use(bodyParser.json({limit: '16mb'}));

// /* Express modules */
// // Credits: http://stackoverflow.com/a/12497793
// app.use(function(req, res, next){
//   if (req.is('text/*')) {
//     req.text = '';
//     req.setEncoding('utf8');
//     req.on('data', function(chunk){ req.text += chunk; });
//     req.on('end', next);
//   } else {
//     next();
//   }
// });

// app.get('/:collection/:document/:field', function(res, req){
// 	... queue requested computation
// })