module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  stdout('Initializing automate API ...')

  /* Get all of users' automate items */
  app.get('/api/automate', function (req, res) {
    var collection = db.collection('automate');
		collection.find({ user: req.username }).toArray(function (err, data) { 
			if(err)   { stderr(err); res.status(500).end(); return; }
			res.send(data); 
		});
  });

  /* Post automate item */
  app.post('/api/automate', function (req, res) {
    var collection = db.collection('automate');
		collection.find({ user: req.username }).toArray(function (err, data) { 
			if(err)   { stderr(err); res.status(500).end(); return; }
			res.send(data); 
		});
  });

};