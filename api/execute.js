module.exports = function(app, config, db){

	/* Javascript execute */
	var fs      = require('fs');
	var Fiber   = require('fibers'); // 0.1s
	var vm      = require('vm');
	var moment  = require('moment'); require('twix');
	var request = require('request');
	var xmldoc  = require('xmldoc');
	var mongo   = require('mongojs');

	var executeJavascriptContext = fs.readFileSync('./lib/context.js', { encoding : 'utf8' });
	var executeJavascript = function (javascript, context, callback){

	  var vmContext = {
	    console: console,
	    Fiber: Fiber,
	    mongo: mongo,
	    fs: fs,
	    request: request,
	    require: require,
	    moment: moment,
	    xmldoc: xmldoc,
	    Timeseries: Timeseries,
	    context: context
	  };

	  var vmScript = executeJavascriptContext.replace('/* SCRIPT */', javascript);
	  var ref = context.collection + '/' + context.id + '/' + context.script;
	  console.log('executing: ' + ref);
	  try { 
	  	vm.runInContext(vmScript, vm.createContext(vmContext));
	  } catch(exception) {
	  	console.error('error executing: ' + ref + ' (' + exception + ')'); 
	    if(context.response) {
	      context.response.status(400).send("" + exception);
	    }
  	}

	};	 

	app.get('/v1/:collection/:id/execute/:script', function (req, res) {

	  if(!req.params.collection || !req.params.id || !req.params.script) {
	    res.status(400).send(error('Missing collection, id and script parameters.'));
	    return;
	  }

	  var fields = { _id: 1 };
	  fields[req.params.script] = 1;

	  var collection = db.collection(req.params.collection);
	  collection.findOne({ _id: req.params.id }, fields, function (err, data) {

	    if(err)          { console.error('Database error.'); }
	    if(!data)        { console.error('Object not found in database.'); }
	    if(!data[req.params.script]) { console.error('Script not found.'); }

	    var javascript = data[req.params.script];
	    var context = {
	    	database:   config.mongo.database,
	    	collection: req.params.collection,
	    	id:         req.params.id,
	    	script:     req.params.script,
	    	response:   res,
	    	pid:        process.pid // for mubsub triggers
	    };
	    
	    // executeJavascript = function (javascript, context, callback)
	    executeJavascript(javascript, context);

	  });

	  // Responde from inside of VM or in error catch
	  // res.end();

	});
	 
};