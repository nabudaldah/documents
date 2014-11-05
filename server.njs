/* NodeJS packages */
var require    = require;
var fs         = require('fs');
var http       = require('http');
var https      = require('https');
var express    = require('express');
var expressJwt = require('express-jwt');
var jwt        = require('jsonwebtoken');
var bcrypt     = require('bcrypt-nodejs');
var helmet     = require('helmet');
var mongo      = require('mongojs');
var uuid       = require('node-uuid');
var moment     = require('moment'); require('twix');
var async      = require('async');
var vm         = require('vm');
var request    = require('request');
var xmldoc     = require('xmldoc');
var schedule   = require('node-schedule');
var io         = require('socket.io');
var Fiber      = require('fibers'); // 0.1s
var sqlite3    = require('sqlite3').verbose();
var bodyParser = require('body-parser')

// Custom libs
var R          = require('./lib/js/R.js');
var Timeseries = require('./lib/js/Timeseries.js');
var pivot      = require('./lib/js/pivot.js');

var error = function(message){
  return { status: 400, message: message, url: 'http://localhost/err#' + encodeURIComponent(message) };
};

// Configuration
var config = {
  development: true,
  authTimeout: 24 * 60,
  R: {
    exe: '/usr/bin/R',
    dir: __dirname + '/lib/R/',
    init: '.libPaths("/home/ubuntu/R/x86_64-pc-linux-gnu-library/3.0");source("functions.R");'
  },
  mongo: {
    database: 'files'
  },
  sqlite: {
    database: __dirname + '/db/pivot.sqlite3'
  },
  js: {
    context: __dirname + '/lib/js/contextV2.js'
  }
};

/* Job scheduler */
// var agenda = new Agenda({db: { address: 'localhost:27017/files', collection: 'scheduler' }});

/* R engine */
R.start(config.R.exe, config.R.dir);
R.run(config.R.init);

/* Database */
var db  = mongo.connect(config.mongo.database);
var db3_create = new sqlite3.Database(config.sqlite.database);
db3_create.close();
var db3 = new sqlite3.Database(config.sqlite.database, sqlite3.OPEN_READONLY);
var db3;
var app = express();

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


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())


//app.use(express.compress());
//app.use(express.json());
//app.use(express.urlencoded());
app.use(express.static(__dirname + '/app'));

/*

  RESTful API convention:

    GET and POST        /v1/<collection>
    GET, PUT and DELETE /v1/<collection>/<id>

*/

/* MongoDB R triggers */ 
// {"event" : "update", "message" : "timeseries/tstest"}
var mubsub = require('mubsub');
var client = mubsub('mongodb://' + 'localhost' + ':'+ 27017 +'/' + 'files');
var channel = client.channel('triggers');  
client.on('error', console.error);
channel.on('error', console.error);
  
channel.subscribe('update', function(message) {
  console.log('socket.io: ' + message);
  io.sockets.emit(message, 'updated');
});

/* List objects (only returns _id, name and tags attributes for performance reasons) */
app.get('/v1/:collection', function (req, res) {
  var collection = db.collection(req.params.collection);
  var limit = parseInt(req.query.limit) || 25;
  var skip  = parseInt(req.query.skip)  || 0;

  var regex;
  try     { regex = new RegExp(req.query.query, 'i'); }
  catch(e){ regex = req.query.query; }

  var tags = req.query.query?req.query.query.split(' '):[];

  collection.find(
    {$or: [{ _id: regex }, { name: regex }, { tags: { $all: tags } } ] },
    { _id: 1, name: 1, tags: 1 })
  .limit(limit)
  .skip(skip, function (err, data) { 
    if(err || !data) { res.status(500).send(error('Database error.')); return; }
    res.send(data);
  });
});


/* Update pivot table */
app.get('/v1/:collection/pivot-update', function(req, res){
  var collection = req.params.collection;
  pivot.update(collection, config.sqlite.database, function(err, results){
    if(err) { res.status(400).send(error('Failed to save update pivot table')); return; }
    res.end();
  });
});

/* Query pivot table */
app.get('/v1/:collection/pivot', function (req, res) {

  // http://localhost/api/pivot/WorldBank?row=Region&column=Year&measure=SUM(GDP)&filter=Region='Europe',Year>2003
  var table      = req.params.collection;
  var row        = req.query.row;
  var column     = req.query.column;
  var measure    = req.query.measure;

  var where = req.query.where;
  if(where) where = where.split(',');
  else where = [];

  var dimensions = [];
  if(row) dimensions.push(row)
  if(column) dimensions.push(column);

  var select = [].concat(dimensions);
  if(measure) select.push(measure);

  var data = {
    row:       row,
    column:    column,
    rows:       [],
    columns:    [],
    dimensions: dimensions,
    measure:     measure,
    table:      [],
    list:       {}
  };

  function check(end){
    if(!table) { end('Missing table.'); return; }
    if(!select.length) { end('Missing row, column and measure.'); return; }
    end();
  };

  function fetchDimensions(end){

    function fetchDimension(dimension, end){
      db3.all("SELECT DISTINCT(" + dimension + ") FROM " + table + " ORDER BY " + dimension + ";", function(err, table) {
        if(err || !table) { end(err); return; }
        for(var r = 0; r < table.length; r++){
          if(dimension == row)    data["rows"].push(table[r][dimension]);
          if(dimension == column) data["columns"].push(table[r][dimension]);
        }
        end();
      });
    };

    function respond(err){ if(err) { end(err); return; } else { end(); } }

    async.each(dimensions, fetchDimension, respond);
  };

  function fetchData(end){
    var sql = "SELECT " + select.join(', ') + " FROM " + table + " where " + measure.match(/\([^\)]+\)/) + ' <> ""';

    if(where.length)   sql += " AND " + where.join(" AND ");
    if(dimensions.length) sql += " GROUP BY " + dimensions.join(', ');
    sql += ";"
    db3.all(sql, function(err, table) {
      if(err) { end(err); return; }
      data["table"] = table;
      end();
    });
  };

  function transformData(end){
    for(var r = 0; r < data.table.length; r++){
      var id = [];
      if(row)    id.push(data.table[r][row]);
      if(column) id.push(data.table[r][column]);
      if(measure) data.list[id.join(',')] = data.table[r][measure];
      else        data.list[id.join(',')] = true;        
    };
    end();
  };

  function respond(err, results){
    if(err) res.status(400).send('Database error. ' + err);
    else res.send(data);
  };

  async.series([check, fetchDimensions, fetchData, transformData], respond);

});


/* Get object including data (potentially large JSON) */
app.get('/v1/:collection/:id/raw', function (req, res) {
  var collection = db.collection(req.params.collection);
  collection.findOne({ _id: req.params.id }, function (err, data) {
    if(err)   { res.status(500).send(error('Database error.'));               return; }
    if(!data) { res.status(400).send(error('Object not found in database.')); return; }
    res.send(data);
  });
});

/* Get object */
app.get('/v1/:collection/:id', function (req, res) {
  var collection = db.collection(req.params.collection);
  collection.findOne({ _id: req.params.id }, { data: false }, function (err, data) {
    if(err)   { res.status(500).send(error('Database error.'));               return; }
    if(!data) { res.status(400).send(error('Object not found in database.')); return; }
    res.send(data);
  });
});

/* Create object */
app.post('/v1/:collection', function (req, res) {
  var object = req.body;
  var collection = db.collection(req.params.collection);
  collection.insert(object, function(err, data){ 
    if(err || !data) { res.status(500).send(error('Database error.')); return; }
    res.status(200).end();
    var ref = req.params.collection;
    console.log('socket.io: ' + req.params.collection);
    io.sockets.emit(ref, 'updated');
    return;
  });
});

/* Update object */
app.put('/v1/:collection/:id', function (req, res) {
  if(req.body._id) delete req.body._id;
  var collection = db.collection(req.params.collection);
  collection.update({ _id: req.params.id }, { $set: req.body }, { upsert: false }, function(err, data){ 
    if(err || !data) { res.status(500).send(error('Database error.')); return; }
    res.status(200).end();
    var ref = req.params.collection + '/' + req.params.id;
    console.log('socket.io: ' + req.params.collection + '/' + req.params.id);
    io.sockets.emit(ref, 'updated'); // should be array of names of values changed... 
    return;
  });
});

/* Delete object */
app.delete('/v1/:collection/:id', function (req, res) {
  var collection = db.collection(req.params.collection);
  collection.remove({ _id: req.params.id }, function(err, data){
    if(err || !data) { res.status(500).send(error('Database error.')); return; }
    res.status(200).end();
  });
  var ref = req.params.collection;
  console.log('socket.io: ' + req.params.collection);
  io.sockets.emit(ref, 'updated'); // should be array of names of values changed... 
});

/* Get timeseries */
app.get('/v1/:collection/:id/timeseries/:timeseries', function (req, res) {

  var collection = db.collection(req.params.collection);
  var projection = {};
  projection["data." + req.params.timeseries + ".base"]     = 1;
  projection["data." + req.params.timeseries + ".interval"] = 1;
  collection.findOne({ _id: req.params.id }, projection, function (err, data) {
    if(err)   { res.status(500).send(error('Database error.'));               return; }
    if(!data) { res.status(400).send(error('Object not found in database.')); return; }
    if(!data.data) { res.status(400).send(error('Object has no data.')); return; }
    if(!data.data[req.params.timeseries]) { res.status(400).send(error('Timeseries not found in object.')); return; }

    var ts = new Timeseries(data.data[req.params.timeseries]);
    var from   = req.query.from, to = req.query.to;
    var vectorProjection = 1;

    if(from && to){
      var slice = ts.slice(from, to);
      if(slice && slice.length == 2) vectorProjection = { $slice: slice };
    }

    var projection = {};
    projection["data." + req.params.timeseries] = 1;
    projection["data." + req.params.timeseries + ".base"]     = 1;
    projection["data." + req.params.timeseries + ".interval"] = 1;
    //projection["data." + req.params.timeseries + ".vector"]   = vectorProjection;
    if(vectorProjection) projection["data." + req.params.timeseries + ".vector"]   = vectorProjection;

    collection.findOne({ _id: data._id }, projection, function (err, data) {
      if(err)   { res.status(500).send(error('Database error.'));               return; }
      if(!data) { res.status(400).send(error('Object not found in database.')); return; }

      if(!data.data[req.params.timeseries].vector)
        data.data[req.params.timeseries].vector = [];

      var ts = new Timeseries(data.data[req.params.timeseries]);
      if(from && to) ts = ts.pad(from, to);

      res.send(ts);
    });
  });
});

/* Update timeseries */
app.put('/v1/:collection/:id/timeseries/:timeseries', function (req, res) {

  var uploadedTimeseries = req.body;
  if(!uploadedTimeseries || !uploadedTimeseries.base || !uploadedTimeseries.interval || !uploadedTimeseries.vector || !(uploadedTimeseries.vector instanceof Array) || !uploadedTimeseries.vector.length) {
    res.status(400).send(error('Incomplete timeseries object.')); return;
  } 

  uploadedTimeseries = new Timeseries(uploadedTimeseries);
  var collection = db.collection(req.params.collection);
  var projection = {};
  projection["data." + req.params.timeseries] = 1;
  collection.findOne({ _id: req.params.id }, projection, function (err, data) {

    if(err)        { res.status(500).send(error('Database error.'));               return; }
    //if(!data)      { res.status(400).send(error('Object not found in database.')); return; }
    //if(!data.data) { res.status(400).send(error('Object has no data.'));           return; }

    var currentTimeseries;
    if(data && data.data && data.data[req.params.timeseries]) currentTimeseries = data.data[req.params.timeseries];
    var mongoUpdate = {};
    if(currentTimeseries && currentTimeseries.base && currentTimeseries.interval && currentTimeseries.vector) { 
      currentTimeseries = new Timeseries(currentTimeseries);
      var overlayedTimeseries = currentTimeseries.overlay(uploadedTimeseries);
      mongoUpdate["data." + req.params.timeseries] = overlayedTimeseries;
    } else {
      mongoUpdate["data." + req.params.timeseries] = uploadedTimeseries;        
    }

    // NaN handling... (always use NaN's, not null's)
    if(mongoUpdate["data." + req.params.timeseries] && mongoUpdate["data." + req.params.timeseries].vector){
      mongoUpdate["data." + req.params.timeseries].vector = mongoUpdate["data." + req.params.timeseries].vector.map(function(x){
        if(x === null || x == 'NaN') return NaN;
        return x;
      })        ;
    }

    //console.log(mongoUpdate["data." + req.params.timeseries].vector);

    collection.update({ _id: req.params.id }, { $set: mongoUpdate }, { upsert: true }, function(err, data){ 
      if(err || !data) { res.status(500).send(error('Database error.')); return; }
      res.status(200).end();
      //console.log('socket.io: ' + req.params.collection + '/' + req.params.id + '/' + req.params.timeseries)
      //io.sockets.emit('update', req.params.collection + '/' + req.params.id + '/' + req.params.timeseries);

      var ref = req.params.collection + '/' + req.params.id + '/' + req.params.timeseries;
      console.log('socket.io: ' + ref);
      io.sockets.emit(ref, 'updated');
      return;
    });

  });
  
});

/* R compute */
app.get('/v1/:collection/:id/compute/:script', function (req, res) {

  if(!req.params.collection || !req.params.id || !req.params.script) {
    res.status(400).send(error('Missing collection, id and script parameters.')); return;
  }

  var fields = { _id: 1 };
  fields[req.params.script] = 1;

  var collection = db.collection(req.params.collection);
  collection.findOne({ _id: req.params.id }, fields, function (err, data) {

    if(err)                      { res.status(500).send(error('Database error.'));               return; }
    if(!data)                    { res.status(500).send(error('Object not found in database.')); return; }
    if(!data[req.params.script]) { res.status(500).send(error('Script not found.'));             return; }

    var init = 'context <- list(collection="' + req.params.collection + '", id="' + req.params.id + '");\n';
    var script = data[req.params.script];
    R.run(init + script, function(job){ res.send(job.log); });

  });

});

/* Javascript execute */
var executeJavascriptContext = fs.readFileSync(config.js.context, { encoding : 'utf8' });
var executeJavascript = function (javascript, context, callback){

  var vmContext = {
    console: console,
    Fiber: Fiber,
    mongo: mongo,
    fs: fs,
    request: request,
    require: require,
    moment: moment,
    xmldoc: xmldoc,
    Timeseries: Timeseries,
    context: context
  };

  var vmScript = executeJavascriptContext.replace('/* SCRIPT */', javascript);
  var ref = context.collection + '/' + context.id + '/' + context.script;
  console.log('executing: ' + ref);
  try { vm.runInContext(vmScript, vm.createContext(vmContext)); }
  catch(exception){ console.error('error executing: ' + ref + ' (' + exception + ')'); }

};

app.get('/v1/:collection/:id/execute/:script', function (req, res) {

  if(!req.params.collection || !req.params.id || !req.params.script) {
    res.status(400).send(error('Missing collection, id and script parameters.'));
    return;
  }

  var fields = { _id: 1 };
  fields[req.params.script] = 1;

  var collection = db.collection(req.params.collection);
  collection.findOne({ _id: req.params.id }, fields, function (err, data) {

    if(err)          { console.error('Database error.'); }
    if(!data)        { console.error('Object not found in database.'); }
    if(!data[req.params.script]) { console.error('Script not found.'); }

    var javascript = data[req.params.script].javascript;
    var context = { collection: req.params.collection, id: req.params.id, script: req.params.script };
    // executeJavascript = function (javascript, context, callback)
    executeJavascript(javascript, context);

  });

  res.end();

});

/* Job scheduler */
var jobs = {};
var initiateScheduler = function(){

  var collections = [];
  var fetchCollections = function(end){
    var collection = db.collection('settings');
    collection.find({ tags: { $all: ['collection'] } }, { _id: 1 }, function (err, data) {
      if(err)   { console.error('Database error.');                   end('nok'); return; }
      if(!data) { console.error('No collections to run jobs for...'); end('nok'); return; }
      for(var d in data) { collections.push(data[d]._id); }
      end();
    });
  };

  var fetchDocuments = function(end){
    var searchCollection = function(collectionName, end){
      var collection = db.collection(collectionName);
      collection.find({ tags: { $all: ['scheduled'] } }, { data: 0 }, function (err, data) {
        if(err || !data) { end('error in searchCollection'); return; }

        for(var d in data){
          var object = data[d];
          if(!object.template) continue;

          var template = object.template;
          for(var t in template){
            var templateItem = template[t];
            if(!(templateItem && templateItem.name && templateItem.type &&
                 templateItem.type == "javascript" && object[templateItem.name] &&
                 object[templateItem.name].javascript && object[templateItem.name].schedule)) continue;

            jobs[collectionName + '/' + object._id + '/' + templateItem.name] = {
              collection: collectionName,
              object: object._id,
              variable: templateItem.name
            };
          }
        }
        end();
      });
    };

    var result = function(err){ end(err); };

    async.each(collections, searchCollection, result);

  };

  var scheduleJobs = function(end){


    var execute = function(job) {
      var collection = db.collection(job.collection);
      collection.findOne({ "_id": job.object }, { "data": 0 }, function (err, data) {
        if(err)   { console.error('Database error.');   end('nok'); return; }
        if(!data) { console.error('Object not found.'); end('nok'); return; }

        var object     = data;
        var repeat     = object[job.variable].schedule;
        var javascript = object[job.variable].javascript;
        var context    = { collection: job.collection, id: job.object, script: job.variable } ;

        job.process = schedule.scheduleJob(repeat, function(){
          executeJavascript(javascript, context);
        });
      });
    };

    for(var j in jobs){ execute(jobs[j]); }

    end();
  };

  var result = function(err, result){
    if(err) console.log(err);
    console.log(result);
  };

  async.series([fetchCollections, fetchDocuments, scheduleJobs], result);

};

/* Javascript job (re)schedule */
app.get('/v1/:collection/:id/schedule/:script', function (req, res) {
  if(!req.params.collection || !req.params.id || !req.params.script) {
    res.status(400).send(error('Missing collection, id and script parameters.'));
    return;
  }

  var key = req.params.collection + '/' + req.params.id + '/' + req.params.script;
  var job;
  if(jobs[key]) {
    job = jobs[key];
    job.process.cancel();
  } else {
    job = {
      collection: req.params.collection,
      object:     req.params.id,
      variable:   req.params.script
    };
  }

  var collection = db.collection(job.collection);
  collection.findOne({ "_id": job.object }, { "data": 0 }, function (err, data) {
    if(err)   { console.error('Database error.');   end('nok'); return; }
    if(!data) { console.error('Object not found.'); end('nok'); return; }

    var object = data;
    var repeat = object[job.variable].schedule;
    //var script = object[job.variable].javascript;

    if(!repeat) { return; }

    job.process = schedule.scheduleJob(repeat, function(){

      var javascript = object[job.variable].javascript;
      var context    = { collection: job.collection, id: job.object, script: job.variable };

      job.process = schedule.scheduleJob(repeat, function(){
        executeJavascript(javascript, context);
      });

    });
    res.send('ok');
  });
});

initiateScheduler();

/* Token based Authentication (// https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/) */
var secret;
if(config.development){
  secret = 'development';
} else {
  secret = uuid.v1();
  app.use('/api', expressJwt({secret: secret}));
  setInterval(function(){ secret = uuid.v1(); }, config.authTimeout * 60 * 1000);
}

app.post('/authenticate', function (req, res) {
  var denied = function(status, message) { res.send(status, error(message)); return; };
  if(!req.body.username || !req.body.password) { denied(400, 'No username and password provided.'); return; }
  db.collection('settings').findOne( { _id: req.body.username }, function(err, data){
    //if(err || !data) { denied(401, 'Access denied.'); return; }
    bcrypt.compare(req.body.password, data.password, function(err, match) {      
      //if(err || !match) { denied(401, 'Access denied.'); return; }
      res.json({ token: jwt.sign(data, secret, { expiresInMinutes: config.authTimeout }), profile: data });
    });
  });
});

var server;
if(config.development){
  /* Only open HTTP port for development */
  server = http.createServer(app).listen(3000);
  io = io.listen(server);
  console.log('Development server ready at: http://localhost/');

} else {
  /* Always redirect to HTTPS */
  var redirect = function(req, res) { res.writeHead(301, {Location: 'https://localhost/'}); res.end(); };
  http.createServer(redirect).listen(80);

  /* Open app on HTTPS (http://www.mobilefish.com/services/ssl_certificates/ssl_certificates.php) */
  var ssl = { key: fs.readFileSync('ssl/key.pem'), cert: fs.readFileSync('ssl/cert.pem') };
  server = https.createServer(ssl, app).listen(443);
  io = io.listen(server);
  console.log('Server ready at: https://localhost/');
}
