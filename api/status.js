module.exports = function(app){

	/* Show server status: potentially dangerous information given... */
	app.get('/v1/status', function (req, res){
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
