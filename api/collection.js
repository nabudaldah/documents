module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

	app.get('/v1/:collection', function (req, res) {
	  var collection = db.collection(req.params.collection);
	  var limit = parseInt(req.query.limit) || 25;
	  var skip  = parseInt(req.query.skip)  || 0;

	  var regex;
	  try     { regex = new RegExp(req.query.query, 'i'); }
	  catch(e){ regex = req.query.query; }

	  var _tags = req.query.query?req.query.query.split(' '):[];

	  collection.find(
	    {$or: [{ _id: regex }, { name: regex }, { _tags: { $all: _tags } } ] },
	    { _id: 1, name: 1, _tags: 1 })
	  .limit(limit)
	  .skip(skip).toArray(function (err, data) { 
	    if(err || !data) { res.status(500).send('Database error.'); return; }
	    res.send(data);
	  });
	});

	app.get('/v1/:collection/count', function (req, res) {
	  var collection = db.collection(req.params.collection);

	  var regex;
	  try     { regex = new RegExp(req.query.query, 'i'); }
	  catch(e){ regex = req.query.query; }

	  var _tags = req.query.query?req.query.query.split(' '):[];

	  collection.count({$or: [{ _id: regex }, { name: regex }, { _tags: { $all: _tags } } ] }, function (err, data) { 
	    if(err) { res.status(500).send('Database error.'); return; }
	    if(!data) data = 0;
	    res.send({ count: data });
	  });
	});

};