module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  /* R engine */
  console.log('Loading R module...');
  var R = require('../lib/R.js');
  var R = new R(config.R.exe, 1);
  R.start(function(){
    R.init('source("../lib/functions.R");', function(err){
      if(err) {
        console.log('R.init(): Error: ' + err);
      }
      console.log('R: ' + R.ready() + ' instances ready to handle jobs. ')
    });
  });

  app.get('/v1/:collection/:id/compute/:script', function (req, res) {

    if(!req.params.collection || !req.params.id || !req.params.script) {
      res.status(400).send('Missing collection, id and script parameters.'); return;
    }

    var fields = { _id: 1 };
    fields[req.params.script] = 1;

    var collection = db.collection(req.params.collection);
    collection.findOne({ _id: req.params.id }, fields, function (err, data) {

      if(err)                      { res.status(500).send('Database error.');               return; }
      if(!data)                    { res.status(500).send('Object not found in database.'); return; }
      if(!data[req.params.script]) { res.status(500).send('Script not found.');             return; }

      var init = 'context <- list('
        + 'collection="' + req.params.collection + '", '
        + 'id="'         + req.params.id         + '", '
        + 'dbhost="'     + config.db.host        + '", '
        + 'dbport="'     + config.db.port        + '", '
        + 'database="'   + config.db.database    + '", '
        + 'shardhost="'  + config.cluster.me.host     + '", '
        + 'shardport="'  + config.cluster.me.shardport     + '");db.cluster();\n';

      var script = data[req.params.script];
      R.run(init + script, function(err, log){ 
        console.log(log);
        if(log) {
          res.send(log);
        } else {
          res.send('done');
        } 
      });

    });

  });

};