module.exports = function(app, config, db){

  var Timeseries = require('../lib/Timeseries.js');

  /* Get timeseries */
  app.get('/v1/:collection/:id/timeseries/:timeseries', function (req, res) {

    var collection = db.collection(req.params.collection);
    var projection = {};
    projection["data." + req.params.timeseries + ".base"]     = 1;
    projection["data." + req.params.timeseries + ".interval"] = 1;
    collection.findOne({ _id: req.params.id }, projection, function (err, data) {
      if(err)   { res.status(500).send('Database error.');               return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }
      if(!data.data) { res.status(400).send('Object has no data.'); return; }
      if(!data.data[req.params.timeseries]) { res.status(400).send('Timeseries not found in object.'); return; }

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
        if(err)   { res.status(500).send('Database error.');               return; }
        if(!data) { res.status(400).send('Object not found in database.'); return; }

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
      res.status(400).send('Incomplete timeseries object.'); return;
    } 

    uploadedTimeseries = new Timeseries(uploadedTimeseries);
    var collection = db.collection(req.params.collection);
    var projection = {};
    projection["data." + req.params.timeseries] = 1;
    collection.findOne({ _id: req.params.id }, projection, function (err, data) {

      if(err)        { res.status(500).send('Database error.');               return; }
      //if(!data)      { res.status(400).send('Object not found in database.'); return; }
      //if(!data.data) { res.status(400).send('Object has no data.');           return; }

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
        if(err || !data) { res.status(500).send('Database error.'); return; }
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
};