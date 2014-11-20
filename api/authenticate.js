module.exports = function(app, config, db){

  var expressJwt = require('express-jwt');
  var jwt        = require('jsonwebtoken');
  var bcrypt     = require('bcrypt-nodejs');
  var uuid       = require('node-uuid');

  /* Token based Authentication (// https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/) */
  var secret;
  if(config.development){
    secret = 'development';
  } else {
    secret = uuid.v1();
    app.use('/api', expressJwt({secret: secret}));
    setInterval(function(){ secret = uuid.v1(); }, config.authExpiration * 60 * 1000);
  }

  app.post('/authenticate', function (req, res) {
    var denied = function(status, message) { res.send(status, message); return; };
    if(!req.body.username || !req.body.password) { denied(400, 'No username and password provided.'); return; }
    db.collection('settings').findOne( { _id: req.body.username }, function(err, data){
      if(err || !data) { denied(401, 'Access denied.'); return; }
      bcrypt.compare(req.body.password, data.password, function(err, match) {      
        if(err || !match) { denied(401, 'Access denied.'); return; }
        res.json({ token: jwt.sign(data, secret, { expiresInMinutes: config.authExpiration }), profile: data });
      });
    });
  });

};