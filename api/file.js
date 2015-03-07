module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  // Add later: encoding (base64 or utf8)

  /* Get file */
  app.get('/v1/:collection/:id/file/:file', function (req, res) {

    var collection = db.collection(req.params.collection);
    var projection = {};
    projection["_data." + req.params.file]     = 1;
    collection.findOne({ _id: req.params.id }, projection, function (err, data) {
      if(err)   { res.status(500).send('Database error.');               return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }
      if(!data._data) { res.status(400).send('Object has no _data field.'); return; }
      if(!data._data[req.params.file]) { res.status(400).send('File not found in object.'); return; }

      var file = data._data[req.params.file];
      res.type('text/plain');
      res.send(file);

    });

  });

  /* Put file */
  app.post('/v1/:collection/:id/file/:file', function (req, res) {

    var collection = db.collection(req.params.collection);
    var mongoUpdate = {};
    mongoUpdate["_data." + req.params.file] = req.body;

    collection.update({ _id: req.params.id }, { $set: mongoUpdate }, { upsert: true }, function(err, data){ 
      if(err || !data) { res.status(500).send('Database error.'); return; }
      res.status(200).end();
    });

  });

};
