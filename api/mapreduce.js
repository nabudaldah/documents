module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var shards   = context.shards;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  stdout('Initializing mapreduce API ...')

  var uuid     = require('node-uuid');
  var async    = require('async');
  var request  = require('request');

  app.get('/api/:collection/:id/mapreduce', function (req, res) {

    if(!req.params.collection || !req.params.id) {
      res.status(400).send('Missing collection and id parameters.'); return;
    }

    var collection = db.collection(req.params.collection);
    collection.findOne({ _id: req.params.id }, function (err, data) {

      if(err)          { res.status(500).send('Database error.');               return; }
      if(!data)        { res.status(500).send('Object not found in database.'); return; }
      if(!data.map)    { res.status(500).send('Map script not found.');         return; }
      if(!data.reduce) { res.status(500).send('Reduce script not found.');      return; }
    
      if(!data._tags) data._tags = [];
      data._tags.push('mapreduce');
      data._tags.push(data._id);

      // clone to shards
      // map on nodes
      // reduce here
      var clone = function(callbackOuter){

        var i = 0;
        async.each(config.cluster.nodes, function(node, callback){

          stdout('cloning for every node... ');

          var clone = data;
          clone._id = req.params.id + '-mr-' + (i++);
          clone._id = clone._id.replace(/[\.:]/g,'');

          db.collection(req.params.collection).insert(clone, function(err, data){
            if(err) {
              stderr('mapreduce.js: Could not clone object!');
              callback(err);
            } else {
              callback();
            }
          });

        }, function(err){
          if(err) {
            stderr('mapreduce.js: Could not clone object to all shards!');
          }
          callbackOuter(err);
        });
      
      }

      var map = function(callbackOuter){
        stdout('mapreduce.js: mapping on nodes ... computing');

        var i = 0;
        async.each(config.cluster.nodes, function(node, callback){

          stdout('computing on node: ' + node.host + ':' + node.apiport);

          var id = req.params.id + '-mr-' + (i++);
          id = id.replace(/[\.:]/g,'');

          var url = 'http://' + node.host + ':' + node.apiport + '/api/' + req.params.collection + '/' + id + '/compute/map';
          stdout(url);
          request(url, function (err, res, body) {
            if (err) stderr('mapreduce.js: ' + err);
            else stdout('computed map on node ...')
            callback(err);
          });

        }, function(err){
          if(err) {
            stderr('mapreduce.js: Could not compute on all nodes!');
          } else {
            stdout('mapreduce.js: OK, done now.')
          }
          callbackOuter(err);
        });

      }

      var reduce = function(callbackOuter){
        stdout('mapreduce.js: reducing now ... computing');

        var url = 'http://' + config.host + ':' + config.port + '/api/' + req.params.collection + '/' + req.params.id + '/compute/reduce';
        request(url, function (err, res, body) {
          if (err) stderr('mapreduce.js: ' + err);
          else stdout('reduced all!');
          callbackOuter(err);
        });
      }

      async.series([ clone, map, reduce ],
        function(err, results){
          if(err) { stderr(err); res.send(err); }
          else res.send('done');
        });

    });

  });

};