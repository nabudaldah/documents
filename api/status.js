module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  stdout('Initializing status API ... ');

	/* Show server status: potentially dangerous information given... */
	app.get('/api/status', function (req, res){
	  var status = {
	    uptime: process.uptime(),
	    arch: process.arch,
	    platform: process.platform,
	    memory: process.memoryUsage().rss,
	    version: process.version 
	  };

	  res.send(status);
	  res.end();
	});

};
