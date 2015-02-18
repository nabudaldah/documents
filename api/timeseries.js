module.exports = function(app, config, db, trigger){

  var Timeseries = require('../lib/Timeseries.js');

  /* Get timeseries */
  app.get('/v1/:collection/:id/timeseries/:timeseries', function (req, res) {

    var collection = db.collection(req.params.collection);
    var projection = {};
    projection["_data." + req.params.timeseries + ".base"]     = 1;
    projection["_data." + req.params.timeseries + ".interval"] = 1;
    collection.findOne({ _id: req.params.id }, projection, function (err, data) {
      if(err)   { res.status(500).send('Database error.');               return; }
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
        if(err)   { res.status(500).send('Database error.');               return; }
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
  app.put('/v1/:collection/:id/timeseries/:timeseries', function (req, res) {

    var uploadedTimeseries = req.body;
    if(!uploadedTimeseries || !uploadedTimeseries.base || !uploadedTimeseries.interval || !uploadedTimeseries.vector || !(uploadedTimeseries.vector instanceof Array) || !uploadedTimeseries.vector.length) {
      res.status(400).send('Incomplete timeseries object.'); return;
    } 

    uploadedTimeseries = new Timeseries(uploadedTimeseries);
    var collection = db.collection(req.params.collection);
    var projection = {};
    projection["_data." + req.params.timeseries] = 1;
    collection.findOne({ _id: req.params.id }, projection, function (err, data) {

      if(err)        { res.status(500).send('Database error.');               return; }
      //if(!data)      { res.status(400).send('Object not found in database.'); return; }
      //if(!data._data) { res.status(400).send('Object has no data.');           return; }

      var currentTimeseries;
      if(data && data._data && data._data[req.params.timeseries]) currentTimeseries = data._data[req.params.timeseries];
      var mongoUpdate = {};
      if(currentTimeseries && currentTimeseries.base && currentTimeseries.interval && currentTimeseries.vector) { 
        currentTimeseries = new Timeseries(currentTimeseries);
        var overlayedTimeseries = currentTimeseries.overlay(uploadedTimeseries);
        mongoUpdate["_data." + req.params.timeseries] = overlayedTimeseries;
      } else {
        mongoUpdate["_data." + req.params.timeseries] = uploadedTimeseries;        
      }

      // NaN handling... (always use NaN's, not null's)
      if(mongoUpdate["_data." + req.params.timeseries] && mongoUpdate["_data." + req.params.timeseries].vector){
        mongoUpdate["_data." + req.params.timeseries].vector = mongoUpdate["_data." + req.params.timeseries].vector.map(function(x){
          if(x === null || x == 'NaN') return NaN;
          return x;
        })        ;
      }

      //console.log(mongoUpdate["_data." + req.params.timeseries].vector);

      collection.update({ _id: req.params.id }, { $set: mongoUpdate }, { upsert: true }, function(err, data){ 
        if(err || !data) { res.status(500).send('Database error.'); return; }
        res.status(200).end();
        //console.log('socket.io: ' + req.params.collection + '/' + req.params.id + '/' + req.params.timeseries)
        //io.sockets.emit('update', req.params.collection + '/' + req.params.id + '/' + req.params.timeseries);

        var ref = req.params.collection + '/' + req.params.id + '/' + req.params.timeseries;
        trigger(ref, 'update');
        return;
      });

    });
    
  });
};