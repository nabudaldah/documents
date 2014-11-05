exports.timeseriesGet = function (req, res) {

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
      if(slice && slice.length == 0) vectorProjection = undefined;
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
};

  var timeseriesPut = function (req, res) {

  var uploadedTimeseries = req.body;
  if(!uploadedTimeseries || !uploadedTimeseries.base || !uploadedTimeseries.interval || !uploadedTimeseries.vector || !(uploadedTimeseries.vector instanceof Array) || !uploadedTimeseries.vector.length) {
    res.status(400).send(error('Incomplete timeseries object.')); return;
  } 

  var uploadedTimeseries = new Timeseries(uploadedTimeseries);
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
    if(currentTimeseries) { 
      var currentTimeseries = new Timeseries(currentTimeseries);
      var overlayedTimeseries = currentTimeseries.overlay(uploadedTimeseries);
      mongoUpdate["data." + req.params.timeseries] = overlayedTimeseries;
    } else {
      mongoUpdate["data." + req.params.timeseries] = uploadedTimeseries;        
    }

    collection.update({ _id: req.params.id }, { $set: mongoUpdate }, { upsert: true }, function(err, data){ 
      if(err || !data) { res.status(500).send(error('Database error.')); return; }
      res.status(200).end();
      io.sockets.emit('timeseries', req.params.collection + '/' + req.params.id + '/' + req.params.timeseries);
      console.log('timeseries updated: ' + req.params.collection + '/' + req.params.id + '/' + req.params.timeseries)
      return;
    });

  });
  
};

exports.objectList = function (req, res) {
  var collection = db.collection(req.params.collection);
  var limit = parseInt(req.query.limit) || 25;
  var skip  = parseInt(req.query.skip)  || 0;

  var regex;
  try     { regex = new RegExp(req.query.query, 'i'); }
  catch(e){ regex = req.query.query; }

  var tags = req.query.query.split(' ');

  collection.find(
    {$or: [{ _id: regex }, { name: regex }, { tags: { $all: tags } } ] },
    { _id: 1, name: 1, tags: 1 })
  .limit(limit)
  .skip(skip, function (err, data) { res.send(data); })
};

exports.objectGetRaw = function (req, res) {
  var collection = db.collection(req.params.collection);
  collection.findOne({ _id: req.params.id }, function (err, data) {
    if(err)   { res.status(500).send(error('Database error.'));               return; }
    if(!data) { res.status(400).send(error('Object not found in database.')); return; }
    res.send(data);
  });
};

exports.objectGet = function (req, res) {
  var collection = db.collection(req.params.collection);
  collection.findOne({ _id: req.params.id }, { data: false }, function (err, data) {
    if(err)   { res.status(500).send(error('Database error.'));               return; }
    if(!data) { res.status(400).send(error('Object not found in database.')); return; }
    res.send(data);
  });
};

exports.objectPut = function (req, res) {
  if(req.body._id) delete req.body._id;
  var collection = db.collection(req.params.collection);
  collection.update({ _id: req.params.id }, { $set: req.body }, { upsert: true }, function(err, data){ 
    if(err || !data) { res.status(500).send(error('Database error.')); return; }
    res.status(200).end();
    io.sockets.emit('object', req.params.collection + '/' + req.params.id); 
    return;
  });
};

exports.objectDelete = function (req, res) {
  var collection = db.collection(req.params.collection);
  collection.remove({ _id: req.params.id }, function(err, data){
    if(err || !data) { res.status(500).send(error('Database error.')); return; }
    res.status(200).end();
  });
};

exports.computeR = function (req, res) {

  var collection = db.collection(req.params.collection);
  collection.findOne({ _id: req.params.id }, { _id: 1, computation: 1 }, function (err, data) { 

    if(err)               { res.status(500).send(error('Database error.'));               return; }
    if(!data)             { res.status(400).send(error('Object not found in database.')); return; }
    if(!data.computation) { res.status(400).send(error('Object has no computation.'));    return; }

    var init = 'context <- list(collection="' + req.params.collection + '", id="' + req.params.id + '");\n';
    R.run(init + data.computation, function(job){ res.send(job.log); });
  });

};

exports.executeJs = function (req, res) {

  if(!req.params.collection || !req.params.id || !req.params.script) {
    res.status(400).send(error('Missing collection, id and script parameters.'));
    return;
  };

  var fields = { _id: 1 };
  fields[req.params.script] = 1;

  var collection = db.collection(req.params.collection);
  collection.findOne({ _id: req.params.id }, fields, function (err, data) {

    if(err)          { console.error('Database error.'); }
    if(!data)        { console.error('Object not found in database.'); }
    if(!data[req.params.script]) { console.error('Script not found.'); }

    var context = {
      object: data, require: require, console: console, setTimeout: setTimeout,
      setInterval: setInterval, async: async, moment: moment, request: request,
      xmldoc: xmldoc, schedule: schedule, io: io
    };

    var script = fs.readFileSync('./lib/js/context.js', { encoding : 'utf8' });
    var script = script.replace('/* SCRIPT */', data[req.params.script].javascript);

    try { vm.runInContext(script, vm.createContext(context)); }
    catch(exception){ console.error(exception); }

  });

  res.end();

};
