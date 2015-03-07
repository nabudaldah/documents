module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  var expressJwt = require('express-jwt');
  var jwt        = require('jsonwebtoken');
  var bcrypt     = require('bcrypt-nodejs');
  var uuid       = require('node-uuid');
  var basicAuth  = require('basic-auth');

  // Restricted area
  var restricted = '/v1';
  var secret = 'development';  

  var authBearerHandler = expressJwt({secret: secret});

  // Credits: https://davidbeath.com/posts/expressjs-40-basicauth.html 
  var authBasicHandler = function (req, res, next) {
    var user = basicAuth(req);
    if (!user || !user.name || !user.pass) return res.sendStatus(401);
    db.collection('settings').findOne( { _id: user.name }, function(err, data){      
      if(err || !data) { return res.sendStatus(401); }
      bcrypt.compare(user.pass, data.password, function(err, match) {
        if(err || !match) { return res.sendStatus(401); }
        next();
      });
    });
  };

  // Check wether user would like to use Basic Auth or Token Based Auth
  // Credits: https://davidbeath.com/posts/expressjs-40-basicauth.html 
  app.use(restricted, function (req, res, next) {

    // Always allow local connections unauthenticated
    if(req.ip == '127.0.0.1') { next(); return; }

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


  /* Token based Authentication (// https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/) */
  // var secret = 'development';  
  // app.use(restricted, expressJwt({secret: secret}));

  // Authenticate and request token
  app.post('/authenticate', function (req, res) {
    var denied = function(status, message) { res.status(status).send(message); return; };
    if(!req.body.username || !req.body.password) { denied(400, 'No username and password provided.'); return; }
    db.collection('settings').findOne( { _id: req.body.username }, function(err, data){
      if(err || !data) { denied(401, 'Access denied.'); return; }
      bcrypt.compare(req.body.password, data.password, function(err, match) {
        if(err || !match) { denied(401, 'Access denied.'); return; }
        res.json({ token: jwt.sign(data, secret, { expiresInMinutes: config.authExpiration }), profile: data });
      });
    });
  });

  // Password creator
  app.get('/v1/:collection/:id/:field/hash', function (req, res) {

    if(!req.params.collection || !req.params.id || !req.params.field) {
      res.status(400).send('Missing collection, id and field parameters.');
      return;
    }

    var fields = { _id: 1 };
    fields[req.params.field] = 1;

    var collection = db.collection(req.params.collection);
    collection.findOne({ _id: req.params.id }, fields, function (err, data) {

      if(err || !data || !data[req.params.field]) { res.status(400).send('Document or field not found.'); return; }

      var password = data[req.params.field];
      bcrypt.hash(password, null, null, function(err, hash) {
          // Store hash in your password DB.

          var doc = {};
          doc[req.params.field] = hash;

          var collection = db.collection(req.params.collection);
          collection.update({ _id: req.params.id }, { $set: doc }, { upsert: false }, function(err, data){ 
            if(err || !data) { res.status(500).send('Database error.'); return; }
            res.status(200).end();
            var ref = req.params.collection + '/' + req.params.id;
            trigger(ref, 'update'); // should be array of names of values changed... 
            return;
          });


      });

    });

  });

};