module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  /* Scheduler */
  console.log('Loading scheduler...');
  var schedule = require('node-schedule');
  var request = require('request');

  // Check settings
  var collection = db.collection('settings');
  collection.findOne({ _id: 'scheduler' }, function (err, data) {

    if(err)            { console.error('schedule.js: Database error.');               return; }
    if(!data) { 
      collection.insert(config.scheduler, function(err, data){
        if(err) { console.error('schedule.js: Database error while inserting default scheduler configuration.'); return; }
      });
    };

  });

  channel.subscribe('update', function(message){
    if(message == "settings/scheduler"){
      console.log('updating schedule!');
      update();
    }
  });

  var jobs = [];

  var update = function(){

    // Cancel all current jobs
    jobs.map(function(job){ job.cancel(); });
    jobs = [];

    var collection = db.collection('settings');
    collection.findOne({ _id: 'scheduler' }, function (err, data) {

      if(err)            { console.error('schedule.js: Database error.');               return; }
      if(!data)          { console.error('schedule.js: Object not found in database.'); return; }
      if(!data.schedule) { console.error('schedule.js: Schedule not found in object.'); return; }

      var lines = data.schedule.split('\n');
      lines.map(function(line){
        line = line.trim();
        if(line.charAt(0) == '#') { console.log('schedule.js: ignoring: ' + line); return; }
        if(line == '') { console.log('schedule.js: ignoring empty line '); return; }
        var column = line.split(' ');
        if(column.length != 6) { console.error('schedule.js: expected 6 elements per line "' + line + '"'); return; }
        var reference = column[5];
        var repeat  = column;
        repeat.splice(5, 1);
        repeat = repeat.join(' ');
        console.log('schedule.js: scheduling: cron ' + repeat + ' doing ' + reference);
        var job = schedule.scheduleJob(repeat, function(){
          // Execute via API
          // /v1/:collection/:id/execute/:script
          var execute = reference.split('/')[0] + '/' + reference.split('/')[1] + '/execute/' + reference.split('/')[2];
          console.log('executing "' + execute + '" ...');

          executeByReference(reference.split('/')[0], reference.split('/')[1], reference.split('/')[2]);
          
        });
        jobs.push(job);
      });

    });

  };

  // Initial schedule
  update();



















	/* Javascript execute */
	var fs      = require('fs');
	var Fiber   = require('fibers'); // 0.1s
	var vm      = require('vm');
	var moment  = require('moment'); require('twix');
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

	var executeByReference = function(collection, id, script){

	  if(!collection || !id || !script) {
	    console.error('Missing collection, id and script parameters.');
	    return;
	  }

	  var fields = { _id: 1 };
	  fields[script] = 1;

	  var dbc = db.collection(collection);
	  dbc.findOne({ _id: id }, fields, function (err, data) {

	    if(err)          { console.error('Database error.'); }
	    if(!data)        { console.error('Object not found in database.'); }
	    if(!data[script]) { console.error('Script not found.'); }

	    var javascript = data[script];
	    var context = {
	    	database:   config.db.database,
	    	collection: collection,
	    	id:         id,
	    	script:     script,
	    	//response:   res,
	    	pid:        process.pid // for mubsub triggers
	    };
	    
	    // executeJavascript = function (javascript, context, callback)
	    executeJavascript(javascript, context);

	  });

	  // Responde from inside of VM or in error catch
	  // res.end();

	};

	//executeByReference("timeseries","","");













};