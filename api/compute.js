module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  stdout('Initializing compute API ...')

  /* R engine */
  console.log('Loading R module...');
  var R = require('computer');
  var R = new R(config.R.exe, require('os').cpus().length);
  R.start(function(){
    R.init(config.R.init, function(err){
      if(err) {
        console.log('R.init(): Error: ' + err);
      }
      console.log('R: ' + R.ready() + ' instances ready to handle jobs. ')
    });
  });

  // List of currently running scripts
  // See issue: http://stackoverflow.com/q/14302512 and http://stackoverflow.com/a/14345476
  var running = {};
  app.get('/api/:collection/:id/compute/:script', function (req, res) {

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
        + 'pubtmp="'     + config.R.pubtmp       + '", '
        + 'dbhost="'     + config.db.host        + '", '
        + 'dbport="'     + config.db.port        + '", '
        + 'database="'   + config.db.database    + '", '
        + 'shardhost="'  + config.cluster.me.host     + '", '
        + 'shardport="'  + config.cluster.me.shardport     + '");\n';

      var script = data[req.params.script];

      var end = (function(req, res) {
        var ref = req.params.collection + '/' + req.params.id + '/' + req.params.script;

        var f = function(err, log){
          
          running[ref] = null;
          delete running[ref];

          if(err) { res.status(400).send(err); return; }
          if(log) { res.status(200).send(log); return; }
          
          res.status(200).send('done');
          return;
        };
        return(f);
      })(req, res);

      var ref = req.params.collection + '/' + req.params.id + '/' + req.params.script;
      if(!running[ref]) {

        running[ref] = true;
        R.run(init + script, end);
      } else{
        res.status(400).send('already running');
      }

    });

  });

};
