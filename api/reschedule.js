/* Javascript job (re)schedule */
app.get('/v1/:collection/:id/schedule/:script', function (req, res) {
  if(!req.params.collection || !req.params.id || !req.params.script) {
    res.status(400).send(error('Missing collection, id and script parameters.'));
    return;
  }

  var key = req.params.collection + '/' + req.params.id + '/' + req.params.script;
  var job;
  if(jobs[key]) {
    job = jobs[key];
    job.process.cancel();
  } else {
    job = {
      collection: req.params.collection,
      object:     req.params.id,
      variable:   req.params.script
    };
  }

  var collection = db.collection(job.collection);
  collection.findOne({ "_id": job.object }, { "data": 0 }, function (err, data) {
    if(err)   { console.error('Database error.');   end('nok'); return; }
    if(!data) { console.error('Object not found.'); end('nok'); return; }

    var object = data;
    var repeat = object[job.variable].schedule;
    //var script = object[job.variable].javascript;

    if(!repeat) { return; }

    job.process = schedule.scheduleJob(repeat, function(){

      var javascript = object[job.variable].javascript;
      var context = { database: config.mongo.database, collection: job.collection, id: job.object, script: job.variable };

      job.process = schedule.scheduleJob(repeat, function(){
        executeJavascript(javascript, context);
      });

    });
    res.send('ok');
  });
});