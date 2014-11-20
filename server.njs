
// socket.io is not cluster ready!!!
var cluster = require('cluster');
var workers = 1; //require('os').cpus().length;
cluster.schedulingPolicy = cluster.SCHED_NONE;
//cluster.schedulingPolicy = cluster.SCHED_RR;

if (cluster.isMaster) {
  
  for (var i = 0; i < workers; i++) {
    console.log('Adding worker: ' + i);
    cluster.fork();
  }
  
  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
    cluster.fork();    
  });

  /* centralized Job scheduler */
  // var agenda = new Agenda({db: { address: 'localhost:27017/documents', collection: 'scheduler' }});

} else {

  /* General */
  var fs          = require('fs');
  var mongo       = require('mongojs');
  var io          = require('socket.io');
  var moment      = require('moment');

  /* Express.io */
  var http        = require('http');
  var https       = require('https');
  var express     = require('express');
  var helmet      = require('helmet');
  var bodyParser  = require('body-parser');
  var compression = require('compression');

  /* Socket.io helper (communication between R and app via MongoDB) */
  var mubsub      = require('mubsub');

  /* Load config.json file */
  console.log('Loading config.json file...');
  var config;
  try {
    var content = fs.readFileSync(__dirname + '/config.json', { enconding: 'utf8'} );
    config = JSON.parse(content);
  } catch(e){
    console.error('Error reading config.json: ' + e);
    process.exit();
  }

  /* Database */
  console.log('Connecting to MongoDB...');
  var db  = mongo.connect(config.mongo.database);

  db.on('error',function(err) {
    console.error('MongoDB error: ', err);
    process.exit();
  });

  db.on('ready',function() {
    console.log('Connected to MongoDB.');

    /* Check if settings exists and if not -> install default super user from config.json */
    db.getCollectionNames(function(err, data){

      if(err) {
        console.error('Error getting collection names from database.');
        process.exit();
      }

      if(!data || !data.length || data.indexOf('settings') == -1){
        console.log('Initializing MongoDB: creating admin user and default collections.');
        db.collection('settings').insert(config.admin);
        db.collection('settings').insert(config.collections);
      }

    });
  });

  console.log('Initializing Express.io app...');
  var app = express();

  /* Log all API requests */
  app.use(function (req, res, next) {
    console.log(process.pid + "> " + moment().format("YYYY-MM-DD HH:mm:ss.SSS") + ": [" + req.method + "] " + req.path);
    next();
  })

  /* Express modules */
  // Credits: http://stackoverflow.com/a/12497793
  app.use(function(req, res, next){
    if (req.is('text/*')) {
      req.text = '';
      req.setEncoding('utf8');
      req.on('data', function(chunk){ req.text += chunk; });
      req.on('end', next);
    } else {
      next();
    }
  });

  app.use(helmet());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.use(compression({threshold: 512}));
  app.use(express.static(__dirname + '/pub'));

  /* MongoDB R triggers */ 
  // {"event" : "update", "message" : "timeseries/tstest"}
  var client = mubsub('mongodb://' + 'localhost' + ':'+ 27017 +'/' + config.mongo.database);
  var channel = client.channel('triggers');  
  client.on('error', console.error);
  channel.on('error', console.error);
    
  channel.subscribe('update' + process.pid, function(message) {
    console.log('mubsub' + process.pid + ': socket.io: ' + message);
    io.sockets.emit(message, 'updated');
  });

  /* Simple socket.io trigger function for use in api routes */
  var trigger = function(message, channel){
    io.sockets.emit(message, channel);
  };

  require(__dirname + '/api/status.js')(app);
  require(__dirname + '/api/list.js')(app, db);
  require(__dirname + '/api/pivot.js')(app, config);
  require(__dirname + '/api/document.js')(app, config, db, trigger);
  require(__dirname + '/api/timeseries.js')(app, config, db);
  require(__dirname + '/api/compute.js')(app, config, db);
  require(__dirname + '/api/execute.js')(app, config, db);
  require(__dirname + '/api/authenticate.js')(app, config, db);

  /* Development server (on port 3000 on http only) */
  if(config.development){
    var server = http.createServer(app).listen(3000);
    io = io.listen(server);
    console.log('Development server ready.');
  } 

  /* Production server (on port 80 and https enabled) */
  if(!config.development){
    /* Always redirect to HTTPS */
    var redirect = function(req, res) { res.writeHead(301, {Location: 'https://localhost/'}); res.end(); };
    http.createServer(redirect).listen(80);

    /* Open app on HTTPS (http://www.mobilefish.com/services/ssl_certificates/ssl_certificates.php) */
    var ssl = { key: fs.readFileSync(__dirname + '/ssl/key.pem'), cert: fs.readFileSync(__dirname + '/ssl/cert.pem') };
    var server = https.createServer(ssl, app).listen(443);
    io = io.listen(server);
    console.log('Server ready.');
  }


}
