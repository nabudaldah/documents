module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  var uuid     = require('node-uuid');

  stdout('Initializing document API ... ');

  var moment  = require('moment'); require('twix');

  /* Get object including data (potentially large JSON) */
  app.get('/api/:collection/:id/raw', function (req, res) {
    var collection = db.collection(req.params.collection);
    collection.findOne({ _id: req.params.id }, function (err, data) {
      if(err)   { stderr(err); res.status(500).send('Database error.');  return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }
      res.send(data);
    });
  });

  /* Get object */
  app.get('/api/:collection/:id', function (req, res) {
    var collection = db.collection(req.params.collection);
    collection.findOne({ _id: req.params.id }, { _data: false }, function (err, data) {
      if(err)   { stderr(err); res.status(500).send('Database error.');  return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }
      res.send(data);
    });
  });

  /* Create object */
  app.post('/api/:collection', function (req, res) {
    var object = req.body;
    var collection = db.collection(req.params.collection);
    collection.insert(object, function(err, data){ 
      if(err || !data) { stderr(err); res.status(500).send('Database error.'); return; }
      res.status(200).end();
      var ref = req.params.collection;
      trigger(ref, 'update');
      return;
    });
  });

  /* Update object */
  app.put('/api/:collection/:id', function (req, res) {
    if(req.body._id) delete req.body._id;
    req.body._update = moment().format();
    var collection = db.collection(req.params.collection);
    collection.update({ _id: req.params.id }, { $set: req.body }, { upsert: false }, function(err, data){ 
      if(err || !data) { stderr(err); res.status(500).send('Database error.'); return; }
      res.status(200).end();
      var ref = req.params.collection + '/' + req.params.id;
      trigger(ref, 'update'); // should be array of names of values changed... 
      return;
    });
  });

  /* Insert *or* update object */
  app.post('/api/:collection/:id', function (req, res) {
    if(req.body._id) delete req.body._id;
    req.body._update = moment().format();
    var collection = db.collection(req.params.collection);
    collection.update({ _id: req.params.id }, { $set: req.body }, { upsert: true }, function(err, data){ 
      if(err || !data) { stderr(err); res.status(500).send('Database error.'); return; }
      res.status(200).end();
      var ref = req.params.collection + '/' + req.params.id;
      trigger(ref, 'update'); // should be array of names of values changed... 
      return;
    });
  });

  /* Delete object */
  app.delete('/api/:collection/:id', function (req, res) {
    var collection = db.collection(req.params.collection);
    collection.remove({ _id: req.params.id }, function(err, data){
      if(err || !data) { stderr(err); res.status(500).send('Database error.'); return; }
      res.status(200).end();
    });
    var ref = req.params.collection;
    trigger(ref, 'update'); // should be array of names of values changed... 
  });

  /* Create public shared object */
  app.post('/api/:collection/:id/public', function (req, res) {

    var publicId = uuid.v4();
    var object = {
      _id:        publicId,
      collection: req.params.collection,
      id:         req.params.id
    }

    var collection = db.collection('public');
    collection.insert(object, function(err, data){ 
      if(err || !data) { stderr(err); res.status(500).send('Database error.'); return; }
      res.status(200).send(publicId);
      return;
    });

  });

  /* Delete public shared object */
  app.delete('/api/:collection/:id/public', function (req, res) {
    var collection = db.collection('public');
    collection.remove({ id: req.params.id, collection: req.params.collection }, function(err, data){
      if(err || !data) { stderr(err); res.status(500).send('Database error.'); return; }
      res.status(200).end();
    });
  });


};