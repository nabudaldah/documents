module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  stdout('Initializing auth API ... ');
  
  var trusted = [];

  trusted.push(config.host);

  trusted.push(config.cluster.me.host);

  config.cluster.nodes.map(function(node){
    trusted.push(node.host);
  });

  stdout('auth.js: trusted hosts: ' + trusted.join(', '))

  var expressJwt = require('express-jwt');
  var jwt        = require('jsonwebtoken');
  // var bcrypt     = require('bcrypt-nodejs');
  // var crypto     = require('crypto');
  var sha1       = require('sha1');
  var uuid       = require('node-uuid');
  var basicAuth  = require('basic-auth');

  var secret     = 'development';  
  var authBearerHandler = expressJwt({secret: secret});

  // Credits: https://davidbeath.com/posts/expressjs-40-basicauth.html 
  var authBasicHandler = function (req, res, next) {
    var user = basicAuth(req);
    if (!user || !user.name || !user.pass) return res.sendStatus(401);
    db.collection('users').findOne( { _id: user.name }, function(err, data){      
      if(err || !data) { return res.sendStatus(401); }
      var hash = sha1(user.pass);
      if(hash == data.password){
        req.user = user;
        next();        
      } else {
        return res.sendStatus(401);
      }
    });
  };

  // Open access
  app.use('/pub', function (req, res, next) {
    next();
  });

  // Sign-up API
  app.post('/signup', function (req, res) {
    var denied = function(status, message) { res.status(status).send(message); return; };
    if(!req.body.username || !req.body.name || !req.body.password || !req.body.email) { 
      denied(400, 'No name, username, password or email provided');
      return; 
    }
    db.collection('users').findOne( { _id: req.body.username }, function(err, data){
      if(err) { denied(500, 'Database error'); return; }
      if(data) { denied(400, 'Already taken'); return; }

      // var hash = crypto.createHash('md5').update(req.body.password).digest('hex');
      var hash = sha1(req.body.password);

      var user = { _id: req.body.username, name: req.body.name, email: req.body.email, password: hash };
      var collection = db.collection('users');
      collection.insert(user, function(err, data){ 
        if(err) { res.status(500).send('Database error'); return; }
        res.status(200).send('Ok');
      });

    });
  });  

  // Authenticate and request token
  /* Token based Authentication (// https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/) */
  app.post('/login', function (req, res) {
    if(!req.body.username || !req.body.password) { res.status(400).send('No username and password provided'); return; }
    db.collection('users').findOne( { _id: req.body.username }, function(err, data){
      if(err || !data) { res.status(401).send('Access denied'); return; }
      // var hash = crypto.createHash('md5').update(req.body.password).digest('hex');
      var hash = sha1(req.body.password);
      if(hash == data.password){
        res.json({ token: jwt.sign(data, secret, { expiresInMinutes: config.authExpiration }), profile: data });
      } else {
        res.status(401).send('Access denied');
      }
    });
  });

  // Check wether user would like to use Basic Auth or Token Based Auth
  // Credits: https://davidbeath.com/posts/expressjs-40-basicauth.html 
  app.use('/api', function (req, res, next) {

    // Allow trusted cluster connections without authenticating (mapreduce)
    // if(trusted.indexOf(req.hostname) != -1 || trusted.indexOf(req.ip) != -1) { next(); return; }

    // Get authorization header
    var authorization = req.headers.authorization;

    // If there is no authorization at all ... request for Basic auth
    if(authorization == undefined){
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
      return res.sendStatus(401);
    }

    // Handle either Basic or Token Based auth
    var type = authorization.split(' ')[0];
    if(type == 'Basic')  authBasicHandler(req, res, next);
    if(type == 'Bearer') authBearerHandler(req, res, next);

    // Caller should use either Token based auth or Basic auth... deny access
    if(type != 'Bearer' && type != 'Basic')
      return res.sendStatus(401);

  });

  // Generic Access Policy
  app.use('/api/:collection?/:id?/:operation?/:property?', function(req, res, next){

    if(req.user.name) req.username = req.user.name; // Basic auth  (API)
    if(req.user._id)  req.username = req.user._id;  // Token based (web-app)

    console.log('Access Control: ['+ req.username +'] trying to access collection: ['+req.params.collection+'], id: ['+req.params.id+'], operation: ['+req.params.operation+'], property: ['+req.params.property+']')

    // No authorization (does not work with bearer auth yet..)
    if(!req.username){
      console.error('Denied: No username');
      res.status(401).send('Denied: No username')
      return;
    }

    // Admin can access anything ...
    if(req.username == 'admin'){
      console.error('Granted: Admin');
      next();
      return;
    }

    // Users in this multi-tenant system are allowed to view their own user settings 
    if(req.params.collection == 'users' && req.params.id == req.username) {
      console.error('Granted: Own user settings');
      next();
      return;
    }

    // Users in this multi-tenant system are only allowed to access their own collection 
    if(req.params.collection == req.username) {
      console.error('Granted: Own collection');
      next();
      return;
    }

    // Users are allowed to access documents having id's that start with their user name
    // if((req.params.id || '').substr(0, req.username.length) == req.username) {
    //   console.error('Granted: ID begins with username');
    //   next();
    //   return;
    // }

    // Users are allowed to access documents having id's that start with their user name
    // if(req.params.collection == 'timeseries' && (!req.params.id || req.params.id.trim() == '')) {
    //   console.error('Granted: Listing timeseries');
    //   next();
    //   return;
    // }

    res.status(400).send('Denied: End');
    console.error('Denied: End')
  })


  // Password creator
  app.get('/api/:collection/:id/hash/:property', function (req, res) {

    if(!req.params.collection || !req.params.id || !req.params.property) {
      res.status(400).send('Missing collection, id and property parameters');
      return;
    }

    var projection = { _id: 1 };
    projection[req.params.property] = 1;

    var collection = db.collection(req.params.collection);
    collection.findOne({ _id: req.params.id }, projection, function (err, data) {

      if(err || !data || !data[req.params.property]) { res.status(400).send('Document or property not found'); return; }

      var password = data[req.params.property];

      // var hash = crypto.createHash('md5').update(password).digest('hex');
      var hash = sha1(password);

      var doc = {};
      doc[req.params.property] = hash;

      var collection = db.collection(req.params.collection);
      collection.update({ _id: req.params.id }, { $set: doc }, { upsert: false }, function(err, data){ 
        if(err || !data) { res.status(500).send('Database error'); return; }
        res.status(200).end();
        var ref = req.params.collection + '/' + req.params.id;
        trigger(ref, 'update'); // should be array of names of values changed... 
        return;
      });

    });

  });

};