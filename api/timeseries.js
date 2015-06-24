module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  stdout('Initializing timeseries API ...')

  var Timeseries = require('../lib/Timeseries.js');

  /* Get timeseries */
  app.get('/api/:collection/:id/timeseries/:timeseries', function (req, res) {

    var collection = db.collection(req.params.collection);
    var projection = {};
    projection["_data." + req.params.timeseries + ".base"]     = 1;
    projection["_data." + req.params.timeseries + ".interval"] = 1;
    collection.findOne({ _id: req.params.id }, projection, function (err, data) {
      if(err)   { res.status(500).send('Database error (find 1).');               return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }
      if(!data._data) { res.status(400).send('Object has no _data field.'); return; }
      if(!data._data[req.params.timeseries]) { res.status(400).send('Timeseries not found in object.'); return; }

      var ts = new Timeseries(data._data[req.params.timeseries]);
      var from   = req.query.from, to = req.query.to;
      var vectorProjection = 1;

      if(from && to){
        var slice = ts.slice(from, to);
        if(slice && slice.length == 2) vectorProjection = { $slice: slice };
      }

      var projection = {};
      projection["_data." + req.params.timeseries] = 1;
      projection["_data." + req.params.timeseries + ".base"]     = 1;
      projection["_data." + req.params.timeseries + ".interval"] = 1;
      //projection["_data." + req.params.timeseries + ".vector"]   = vectorProjection;
      if(vectorProjection) projection["_data." + req.params.timeseries + ".vector"]   = vectorProjection;

      collection.findOne({ _id: data._id }, projection, function (err, data) {
        if(err)   { res.status(500).send('Database error (find 2).');               return; }
        if(!data) { res.status(400).send('Object not found in database.'); return; }

        if(!data._data[req.params.timeseries].vector)
          data._data[req.params.timeseries].vector = [];

        var ts = new Timeseries(data._data[req.params.timeseries]);
        if(from && to) ts = ts.pad(from, to);

        res.send(ts);
      });
    });
  });

  /* Update timeseries */
  app.put('/api/:collection/:id/timeseries/:timeseries', function (req, res) {

    var collection = db.collection(req.params.collection);
    var t0 = new Date();
    collection.insert({ _id: req.params.id, vector: req.body }, { upsert: true }, function(err, data){
      var t1 = new Date();
      console.log('put: ' + (t1.getTime() - t0.getTime()) + ' ms');
      if(err || !data) { res.status(500).send('Database error (update).'); return; }
      res.status(200).end();
      // var ref = req.params.collection + '/' + req.params.id + '/' + req.params.timeseries;
      // trigger(ref, 'update');
      return;
    });
    return; // test

    var async = false;
    if(req.query.async) async = true;

    var upload = new Timeseries(req.body);
    // if(!upload || !upload.base || !upload.interval || !upload.vector || !(upload.vector instanceof Array) || !upload.vector.length) {
    if(!upload.isValid()) {
      res.status(400).send('Incomplete timeseries object.'); return;
    }

    if(async) { res.status(200).end(); }

    var push = { };
    push["_data." + req.params.timeseries + ".changes"] = upload;
    var collection = db.collection(req.params.collection);
    var t0 = new Date();
    collection.update({ _id: req.params.id }, { "$push": push }, { upsert: true }, function(err, data){
      var t1 = new Date();
      console.log('put: ' + (t1.getTime() - t0.getTime()) + ' ms');
      if(err || !data) { res.status(500).send('Database error (update).'); return; }
      if(!async) res.status(200).end();
      // var ref = req.params.collection + '/' + req.params.id + '/' + req.params.timeseries;
      // trigger(ref, 'update');
      return;
    });
    return; // test

    var collection = db.collection(req.params.collection);
    var projection = {};
    projection["_data." + req.params.timeseries] = 1;
    collection.findOne({ _id: req.params.id }, projection, function (err, data) {

      if(err)        { res.status(500).send('Database error (find)');               return; }
      //if(!data)      { res.status(400).send('Object not found in database.'); return; }
      //if(!data._data) { res.status(400).send('Object has no data.');           return; }

      if(async) { res.status(200).end(); } 

      var current = new Timeseries();
      var ts      = new Timeseries();

      if(data) current.fromJSON(data._data[req.params.timeseries]);

      if(current.isValid()){
        ts = current.overlay(upload);
        if(ts == null) {
          console.error('overlay failed');
          res.status(500).send('overlay failed');
          return;
        }
      } else {
        ts = new Timeseries(upload);
      }

      // ts.change(upload);

      var update = {};
      // console.log(upload);
      // console.log(ts);
      // return;
      update["_data." + req.params.timeseries] = ts.toJSON(false); // true = convert null to NaN

      collection.update({ _id: req.params.id }, { $set: update }, { upsert: true }, function(err, data){ 
        if(err || !data) { res.status(500).send('Database error (update).'); return; }
        if(!async) res.status(200).end();
        //console.log('socket.io: ' + req.params.collection + '/' + req.params.id + '/' + req.params.timeseries)
        //io.sockets.emit('update', req.params.collection + '/' + req.params.id + '/' + req.params.timeseries);

        var ref = req.params.collection + '/' + req.params.id + '/' + req.params.timeseries;
        trigger(ref, 'update');
        return;
      });

    });
    
  });

};