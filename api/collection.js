module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  var ObjectID = require('mongodb').ObjectID;

	app.get('/api/:collection', function (req, res) {
	  var collection = db.collection(req.params.collection);
	  var limit = parseInt(req.query.limit) || 25;
	  var skip  = parseInt(req.query.skip)  || 0;

	  var query;
	  query = { "$and": [ { _id: new RegExp(req.query.query, 'i') }, { _id: new RegExp('^' + req.username) } ] }
	  if (req.username == 'admin') query = { _id: new RegExp(req.query.query, 'i') }

	  if(req.query.count){
		  collection.count(query, function (err, data) { 
		    if(err) { stderr(err); res.status(500).send('Database error.'); return; }
		    if(!data) data = 0;
		    res.send({ count: data });
		  });
	  } else {
			collection.find(query, { _id: 1, name: 1, _tags: 1 })
			.limit(limit)
			.skip(skip).toArray(function (err, data) { 
				if(err || !data) { stderr(err); res.status(500).send('Database error.'); return; }
				res.send(data); 
			});
	  }

	});

};