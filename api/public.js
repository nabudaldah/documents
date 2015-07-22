module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  stdout('Initializing public document API ... ');

  var moment  = require('moment'); require('twix');

  /* Get public object */
  app.get('/api/public/:id', function (req, res) {
    var collection = db.collection('public');
    collection.findOne({ _id: req.params.id }, function (err, data) {
      if(err)   { stderr(err); res.status(500).send('Database error.');  return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }

      // res.send(data);

      var shared = data;

      if(!shared.collection || !shared.id){
        res.status(500).send('Invalid object.');
        return;
      }

      if(shared.expire && moment().isAfter(moment(shared.expire))){
        res.status(400).send('Object has expired.');
        return;
      }

      var collection = db.collection(shared.collection);
      collection.findOne({ _id: shared.id }, function (err, data) {
        if(err)   { stderr(err); res.status(500).send('Database error.');  return; }
        if(!data) { res.status(400).send('Object not found in database.'); return; }
        res.send(data);
      });
    
    });

  });

};