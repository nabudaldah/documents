module.exports = function(app, config, db){

  /* R engine */
  console.log('Loading R module...');
  var R = require('../lib/R.js');
  R.start(config.R.exe, config.R.dir, function(){
    R.run(config.R.init);
  });
  
  app.get('/v1/:collection/:id/compute/:script', function (req, res) {

    if(!req.params.collection || !req.params.id || !req.params.script) {
      res.status(400).send(error('Missing collection, id and script parameters.')); return;
    }

    var fields = { _id: 1 };
    fields[req.params.script] = 1;

    var collection = db.collection(req.params.collection);
    collection.findOne({ _id: req.params.id }, fields, function (err, data) {

      if(err)                      { res.status(500).send(error('Database error.'));               return; }
      if(!data)                    { res.status(500).send(error('Object not found in database.')); return; }
      if(!data[req.params.script]) { res.status(500).send(error('Script not found.'));             return; }

      var init = 'context <- list(collection="' + req.params.collection + '", id="' + req.params.id + '", pid="' + process.pid + '");\n';
      var script = data[req.params.script];
      R.run(init + script, function(job){ res.send(job.log); });

    });

  });

};