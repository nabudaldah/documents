#!/usr/bin/env node

/* General */
var fs          = require('fs');
var mongo       = require('mongojs');
var io          = require('socket.io');
var moment      = require('moment');
var assert      = require('assert');
var async       = require('async');

/* Express.io */
var http        = require('http');
var https       = require('https');
var express     = require('express');
var helmet      = require('helmet');
var bodyParser  = require('body-parser');
var compression = require('compression');

/* Socket.io helper (communication between R and app via MongoDB) */
var mubsub      = require('mubsub');

//console.log('Initializing Express.io app...');
var app = express();

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

channel.subscribe('update', function(message) {
  //console.log(moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ': mubsub: ' + message);
  //compute();
});

/* R engine */
var R = require('./lib/Rv2.js');
var N = require('os').cpus().length;

console.log('Loading ' + N + ' R module(s)...');
var rp = [];
for(var i = 0; i < N; i++){
	var r = R.new(config.R.exe);
  rp.push(r);
};

rp.map(function(r){
	r.start(function(){
	  if(config.R.init) r.run(config.R.init);
	  r.run('source("../lib/functions.R");', function(job){
	    console.log('R ready');
	  });
	});
});

function run(script, callback){
		
	var l, id, preferred;
	for(var i = 0; i < rp.length; i++){
		if(rp[i].session.ready && rp[i].session.queue.length == 0){
			preferred = rp[i];
			break;
		}		
		if(!id || rp[i].session.queue.length < l){
			id = rp[i].session.id;
			l  = rp[i].session.queue.length;
			preferred = rp[i];
		}
	}

	if(preferred){
		preferred.run(script, callback);		
	} else {
		console.error('No R instance ready to execute script.');		
	}

};

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

// 650 computations per second
function compute(){

  var query  = { tags: { $all: ["computation"] } };
  var fields = { _id: 1, computation: 1 };

  // check datum...

  db.collection('computations').find(query, fields).forEach(function(err, doc) {
    if (!doc) return;
    var init   = 'context <- list(collection="' + 'computations' + '", id="' + doc._id + '", pid="' + process.pid + '");\n';
    var script = doc['computation'];
    run(init + script);
  });

};

// Use javascript instead of R to mark out-of-date computations

function compute2(){

  var query  = { tags: { $all: ["computation"] } };
  var fields = { _id: 1, update: 1, dependencies: 1, computation: 1 };

  db.collection('computations').find(query, fields).forEach(function(err, parent) {
    if(!parent) return;
    //console.log(parent._id + ' ' + parent.update + ' ' + parent.dependencies);

    var collection = parent.dependencies.split('/')[0];
    var id         = parent.dependencies.split('/')[1];

    var query  = { _id: id };
    var fields = { _id: 1, update: 1 };

    db.collection(collection).findOne(query, fields, function(err, child){
      if(!child) return;
      //console.log(parent._id + ' -> ' + child._id);
      if(moment(parent.update).isBefore(child.update)){
        //console.log('need to compute parent: ' + parent._id)
        var init   = 'context <- list(collection="' + 'computations' + '", id="' + parent._id + '");\n';
        var script = parent.computation;
        run(init + script);
      }
    });
  });

};

// compute cycle
setInterval(function(){
  var ready = 0;
  for(var i = 0; i < rp.length; i++) if (rp[i].session.ready) ready++;
  if(rp.length != ready) return;

  var c = 0;
  for(var i = 0; i < rp.length; i++) c += rp[i].session.queue.length;
  if(c > 0) return;

  if(true) {
    //console.log(moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ': starting new compute cycle ...');
    compute();
  }
}, 1000);

// health check
var c0 = 0;
setInterval(function(){
  var c = 0;
  for(var i = 0; i < rp.length; i++) c += rp[i].session.queue.length;
  var ns = Math.abs((c - c0) * 4)
  c0 = c;
  console.log(moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ': currently ' + c + ' computations in ' + rp.length + ' queues ... n/s: ' + ns);
}, 250);
