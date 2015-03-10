module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

	/* Javascript execute */
	var fs      = require('fs');
	var Fiber   = require('fibers'); // 0.1s
	var vm      = require('vm');
	// var moment  = require('moment'); require('twix');
	var moment  = require('moment-timezone'); var twix = require('twix');
	var request = require('request');
	var xmldoc  = require('xmldoc');
	var mongo   = require('mongojs');
	var edi     = require(__dirname + '/../lib/edi.js');
	var Timeseries = require(__dirname + '/../lib/Timeseries.js');

	var executeJavascriptContext = fs.readFileSync(__dirname + '/../lib/context.js', { encoding : 'utf8' });
	var executeJavascript = function (javascript, context, callback){

	  var vmContext = {
	  	console: console,
	    Fiber: Fiber,
	    mongo: mongo,
	    fs: fs,
	    request: request,
	    moment: moment,
	    xmldoc: xmldoc,
	    edi: edi,
	    Timeseries: Timeseries,
	    context: context
	  };

	  var vmScript = executeJavascriptContext.replace('/* SCRIPT */', javascript);
	  var ref = context.collection + '/' + context.id + '/' + context.script;
	  console.log('executing: ' + ref);
	  try {

	  	vm.runInContext(vmScript, vm.createContext(vmContext), {timeout: 1000});
	  } catch(exception) {
	  	console.error('error executing: ' + ref + ' (' + exception + ')'); 
	    if(context.response) {
	      context.response.status(400).send("" + exception);
	    }
  	}

	};

	// List of currently running scripts
	// See issue: http://stackoverflow.com/q/14302512 and http://stackoverflow.com/a/14345476
	var running = {};

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

	    var end = (function(req, res) {
		    var ref = req.params.collection + '/' + req.params.id + '/' + req.params.script;
	    	var f = function(exception){
	    		running[ref] = null;
	    		delete running[ref];
	    		if(exception) res.status(400).send("" + exception);
	        else          res.status(200).send("Ok");
		    };
		    return(f);
	  	})(req, res);

	    var javascript = data[req.params.script];
	    var context = {
	    	database:   config.db.database,
	    	collection: req.params.collection,
	    	id:         req.params.id,
	    	script:     req.params.script,
	    	end:        end,
	    	pid:        process.pid // for mubsub triggers
	    };

	    var ref = req.params.collection + '/' + req.params.id + '/' + req.params.script;
	    // executeJavascript = function (javascript, context, callback)
	    if(!running[ref]) {
		    running[ref] = true;
	    	executeJavascript(javascript, context);
	    } else{
	    	res.status(400).send('already running');
	    }

	  });

	});
	 
};