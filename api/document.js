module.exports = function(app, config, db, trigger){

  /* Get object including data (potentially large JSON) */
  app.get('/v1/:collection/:id/raw', function (req, res) {
    var collection = db.collection(req.params.collection);
    collection.findOne({ _id: req.params.id }, function (err, data) {
      if(err)   { res.status(500).send('Database error.');               return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }
      res.send(data);
    });
  });

  /* Get object */
  app.get('/v1/:collection/:id', function (req, res) {
    var collection = db.collection(req.params.collection);
    collection.findOne({ _id: req.params.id }, { data: false }, function (err, data) {
      if(err)   { res.status(500).send('Database error.');               return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }
      res.send(data);
    });
  });

  /* Create object */
  app.post('/v1/:collection', function (req, res) {
    var object = req.body;
    var collection = db.collection(req.params.collection);
    collection.insert(object, function(err, data){ 
      if(err || !data) { res.status(500).send('Database error.'); return; }
      res.status(200).end();
      var ref = req.params.collection;
      console.log('socket.io: ' + req.params.collection);
      trigger(ref, 'updated');
      return;
    });
  });

  /* Update object */
  app.put('/v1/:collection/:id', function (req, res) {
    if(req.body._id) delete req.body._id;
    var collection = db.collection(req.params.collection);
    collection.update({ _id: req.params.id }, { $set: req.body }, { upsert: false }, function(err, data){ 
      if(err || !data) { res.status(500).send('Database error.'); return; }
      res.status(200).end();
      var ref = req.params.collection + '/' + req.params.id;
      console.log('socket.io: ' + req.params.collection + '/' + req.params.id);
      trigger(ref, 'updated'); // should be array of names of values changed... 
      return;
    });
  });

  /* Delete object */
  app.delete('/v1/:collection/:id', function (req, res) {
    var collection = db.collection(req.params.collection);
    collection.remove({ _id: req.params.id }, function(err, data){
      if(err || !data) { res.status(500).send('Database error.'); return; }
      res.status(200).end();
    });
    var ref = req.params.collection;
    console.log('socket.io: ' + req.params.collection);
    trigger(ref, 'updated'); // should be array of names of values changed... 
  });

};