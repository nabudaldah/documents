module.exports = function(app, config, db, trigger){

  var expressJwt = require('express-jwt');
  var jwt        = require('jsonwebtoken');
  var bcrypt     = require('bcrypt-nodejs');
  var uuid       = require('node-uuid');

  /* Token based Authentication (// https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/) */

  app.post('/authenticate', function (req, res) {
    console.log('/authenticate1 req.body: ' + JSON.stringify(req.body));
    console.log('/authenticate2 req.body: ' + req.body.username + ':' + req.body.password);
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

  var secret;
  if(config.development){
    secret = 'development';
    app.use('/v1', expressJwt({secret: secret}));
  } else {
    secret = uuid.v1();
    app.use('/v1', expressJwt({secret: secret}));
    setInterval(function(){ secret = uuid.v1(); }, config.authExpiration * 60 * 1000);
  }

  // Credits: https://davidbeath.com/posts/expressjs-40-basicauth.html 
  var basicAuth = require('basic-auth');

  var auth = function (req, res, next) {
    function unauthorized(res) {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
      return res.sendStatus(401);
    };

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
      return unauthorized(res);
    };

    db.collection('settings').findOne( { _id: user.name }, function(err, data){
      
      // user not found
      if(err || !data) { unauthorized(res); return; }

      bcrypt.compare(user.pass, data.password, function(err, match) {
        
        // pass mismatch
        if(err || !match) { unauthorized(res); return; }

        // All ok, user authorized
        next();

      });
    });

  };

  app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
      //res.send(401, 'invalid token...');
      // If user has no authentication token ... allow him to authenticate using basic auth
      auth(req, res, next);
    }
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