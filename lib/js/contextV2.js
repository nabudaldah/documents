// var Fiber   = require('fibers'); // 0.1s
// var mongo   = require('mongojs'); // 0.1s
// var fs      = require('fs'); // 0.0s
// var request = require('request'); //0.2s
// var esprima = require('esprima'); // 0.1s

// var Timeseries = require('./lib/js/Timeseries.js');
// var Timeseries = require('./Timeseries.js'); // 0.1s

Fiber(function() {
  
  // HTTP functions (get, put and post)
  var get = function (url){
    var fiber = Fiber.current;
    var result;
    request(url, function (err, res, body) {
      if (!err) { result = body; }
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var put = function(data, url){
    var fiber = Fiber.current;
    var result;
    request.put({url: url, json: data }, function (err, res, body) {
      result = err;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var post = function(data, url){
    var fiber = Fiber.current;
    var result;
    request.post({url: url, json: data }, function (err, res, body) {
      result = err;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  // File functions (read, write and dir)
  var read = function(filename){
    var fiber = Fiber.current;
    var result;
    fs.readFile(filename, { encoding: 'utf8' }, function (err, data) {
      result = data;
      fiber.run();
    });      
    Fiber.yield(result);
    return result;
  };

  var write = function(data, filename){
    var fiber = Fiber.current;
    var result;
    fs.writeFile(filename, data, function (err) {
      fiber.run();
    });    
    Fiber.yield(result);
    return result;
  };

  var dir = function(path){
    var fiber = Fiber.current;
    var result;
    fs.readdir(path, function (err, files) {
      result = files;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  // Database functions (list, load and save)
  var list = function(collection, query) {
    var fiber = Fiber.current;
    var result;
    var dbc = db.collection(collection);
    dbc.find(query, function (err, data) {
      result = data;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };
  
  var load = function(collection, id, fields) {
    var fiber = Fiber.current;
    var result;
    fields = fields || {}
    var dbc = db.collection(collection);
    dbc.findOne({ _id: id }, fields, function (err, data) {
      result = data;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var save = function(collection, id, object) {
    var fiber = Fiber.current;
    var result;
    var dbc = db.collection(collection);
    dbc.update({ _id: id }, { $set: object }, { upsert: true }, function (err, data) {
      result = data;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var trigger = function(collection, id, variable){
    var message = collection + "/" + id;
    if(variable) message += "/" + variable
    var object = { event: 'update', message: message };
    var dbc = db.collection('triggers');
    dbc.insert(object);
  }

  /* Context aware functions! */
  var doc = function(id, collection){
    if(!collection && context && context.collection){ collection = context.collection; }
    if(!id && context && context.id){ id = context.id; }
    if(!id || !collection) return null;
    var object = load(collection, id);
    return object;
  }

  var me = function(){
    if(!context || !context.collection || !context.id) return null;
    var object = load(context.collection, context.id);
    return object;      
  }

  var my = function(variable, value){
    if(!variable || !context || !context.collection || !context.id) return null;
    if(value){
      var object = {}
      object[variable] = value;
      var result = save(context.collection, context.id, object);
      return result;
    } else {
      var fields = {};
      fields[variable] = 1;
      var object = load(context.collection, context.id, fields);
      return object[variable];
    }
  }

  var ts = function(name, id, collection){
    if(!name) return null;
    if(!collection){ collection = context.collection }
    if(!id){ id = context.id }

    var fields = { }
    fields['data.' + name] = 1;
    var object = load(collection, id, fields)
    var timeseries = object['data'][name];
    return timeseries;
  }

  var myts = function(name, timeseries, overwrite){
    if(!name) name = 'timeseries';
    
    if(timeseries && overwrite){
      var object = {};
      object['data.' + name] = timeseries;
      var result = save(context.collection, context.id, object)
      return result;
    }
    
    if(timeseries && !overwrite){
      var newTs = myts(name);
      var newTs = new Timeseries(newTs);
      var newTs = newTs.overlay(timeseries);
      var result = myts(name, newTs, true);
      return result;
    }

    if(!timeseries){
      var timeseries = ts(name);
      return timeseries;        
    }
  }
  
  var db;
  try{
    db = mongo.connect('files');
    if(!db) { console.error('no db'); throw 'no db'}

/* SCRIPT */

    db.close();
  } catch(e){
    db.close();
    console.error(e)
  }
    
}).run();
//console.log(JSON.stringify(esprima.parse('var answer = 42'), null, 4));

