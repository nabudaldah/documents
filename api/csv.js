module.exports = function(app, db){

  app.get('/v1/:collection/csv/:template', function(req, res){
    
    var collection = db.collection(req.params.collection);
    var selection  = {  };
    var projection = {  };
    
    collection.find(selection, projection, function (err, data) {

      if(err)   { res.status(500).send('Database error.'); return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }

      res.send(csv);
    });

  });

  app.post('/v1/:collection/csv', function(req, res){

    var selection  = { };
    var projection = req.body;
    var collection = db.collection(req.params.collection);
   
    collection.find(selection, projection, function(err, data){
      if(err)   { res.status(500).send('Database error.'); return; }
      var newline = '\n', separator = '\t';
      var header = [];
      for(p in projection){ header.push(p); };
      var csv = header.join(separator) + newline;

      for(d in data){
        var object = data[d];
        var row = [];
        for(p in projection){
          row.push(object[p]);
        };
        csv = csv + row.join(separator) + newline;
      };
      res.send(csv);
      //res.end();
    });

  });


  /* Get timeseries in CSV format */
  app.get('/v1/:collection/:id/timeseries/:timeseries/csv', function (req, res) {

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

        var csv = ts.toCSV(req.query.separator, req.query.format);

        res.type('text/plain');
        res.send(csv);

      });
    });
  });

};
