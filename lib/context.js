Fiber(function() {

  // HTTP functions (get, put and post)
  var get = function (url){
    var fiber = Fiber.current;
    var result;
    request(url, function (err, res, body) {
      // if(err) result = err;
      if(err) result = null;
      else result = body;

      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var put = function(json, url){
    var fiber = Fiber.current;
    var result;
    request.put({url: url, json: json }, function (err, res, body) {
      // if(err) result = err;
      if(err) result = null;
      else result = body;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var post = function(json, url){
    var fiber = Fiber.current;
    var result;
    request.post({url: url, json: json }, function (err, res, body) {
      // if(err) result = err;
      if(err) result = null;
      else result = body;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  // // File functions (read, write and dir)
  // var read = function(filename){
  //   var fiber = Fiber.current;
  //   var result;
  //   fs.readFile(filename, { encoding: 'utf8' }, function (err, data) {
  //     result = data;
  //     fiber.run();
  //   });      
  //   Fiber.yield(result);
  //   return result;
  // };

  // var write = function(data, filename){
  //   var fiber = Fiber.current;
  //   var result;
  //   fs.writeFile(filename, data, function (err) {
  //     fiber.run();
  //   });    
  //   Fiber.yield(result);
  //   return result;
  // };

  // var dir = function(path){
  //   var fiber = Fiber.current;
  //   var result;
  //   fs.readdir(path, function (err, files) {
  //     result = files;
  //     fiber.run();
  //   });
  //   Fiber.yield(result);
  //   return result;
  // };

  // var mkdir;
  // var copy;
  // var move; // rename // ren
  // var erase; // del

  // Database functions (list, load, save and remove)
  var list = function(search) {

    var regex;
    try     { regex = new RegExp(search, 'i'); }
    catch(e){ regex = search; }

    var _tags = search?search.split(' '):[];
    var query = { $or: [  { _id: regex }, { name: regex }, { _tags: { $all: _tags } } ] };

    var fiber = Fiber.current;
    var result;
    var fields = { _id: 1 };
    // var db = db.collection(context.collection);
    db.find(query, fields, function (err, data) {
      // if(err) result = err;
      if(err) result = null;
      else {
        if(data) result = data.map(function(d){ return d._id });
        else result = [];
      }
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };
  
  var load = function(id, fields) {
    var fiber = Fiber.current;
    var result;
    fields = fields || {}
    // var db = db.collection(context.collection);
    db.findOne({ _id: id }, fields, function (err, data) {
      // if(err) result = err;
      if(err) result = null;
      else result = new Doc(id, data);
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var Doc = function(id, data){
    this._id = id
    this._tags = []
    this._template = []
    this._update = moment().format()
    if(data) for(key in data) this[key] = data[key]
  }

  Doc.prototype.tag = function(tag){
    if(this._tags.indexOf(tag) == -1) this._tags.push(tag)
  }

  Doc.prototype.untag = function(tag){
    if(this._tags.indexOf(tag) != -1) this._tags.splice(this._tags.indexOf(tag), 1)
  }

  Doc.prototype.add = function(field, type, value){
    this._template.push({ name: field, type: type?type:'text' })
    if(value) this[field] = value;
  }

  Doc.prototype.save = function(){
    save(this)
  }

  Doc.prototype.remove = function(){
    remove(this._id)
  }

  var save = function(object) {
    var fiber = Fiber.current;
    var result;
    // var db = db.collection(context.collection);
    var id = object._id;
    delete object._id;
    db.update({ _id: id }, { $set: object }, { upsert: true }, function (err, data) {
      // if(err) result = err;
      if(err) result = null;
      else result = data;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var remove = function(id){
    var fiber = Fiber.current;
    var result;
    // var db = db.collection(context.collection);
    db.remove({ _id: id }, function (err, data) {
      // if(err) result = err;
      if(err) result = null;
      else result = data;
      fiber.run();
    });
    Fiber.yield(result);
    return result;    
  }

/*  var trigger = function(id, variable){
    if(!id) id = context.id;
    var fiber = Fiber.current;
    var result;
    var db = db.collection('triggers');
    var message = context.collection + "/" + id;
    if(variable) message += "/" + variable;
    db.insert({ event: 'update', message: message }, function (err, data) {
      if(err) result = err;
      if(err) result = null;
      else result = data;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  }

  var triggermy = function(variable){
    if(!context || !context.collection || !context.id) return null;
    trigger(context.collection, context.id, variable);    
  }

  var triggerme = function(){ 
    triggermy();
  }*/

  var me = function(){
    if(!context || !context.collection || !context.id) return null;
    var object = load(context.id);
    return object;      
  }

  var my = function(variable, value){
    if(!variable || !context || !context.collection || !context.id) return null;
    if(value){
      var object = { _id: context.id }
      object[variable] = value;
      var result = save(object);
      return result;
    } else {
      var fields = {};
      fields[variable] = 1;
      var object = load(context.id, fields);
      return object[variable];
    }
  }

  // var ts = function(name, id, collection, timeseries, overwrite){

  //   if(!name) name = 'timeseries';
  //   if(!collection){ collection = context.collection }
  //   if(!id){ id = context.id }
    
  //   if(timeseries && overwrite){
  //     var object = {};
  //     object['_data.' + name] = timeseries;
  //     var result = save(collection, id, object)
  //     return result;
  //   }
    
  //   if(timeseries && !overwrite){
  //     var newTs = ts(name, id, collection);
  //     if(newTs){
  //       var newTs = new Timeseries(newTs);
  //       var newTs = newTs.overlay(timeseries);        
  //     } else {
  //       newTs = timeseries;
  //     }
  //     var result = ts(name, id, collection, newTs, true);
  //     return result;
  //   }

  //   if(!timeseries){
  //     var fields = { }
  //     fields['_data.' + name] = 1;
  //     var object = load(collection, id, fields)
  //     if(object && object['_data'] && object['_data'][name]){
  //       var timeseries = object['_data'][name];
  //       return timeseries;        
  //     }
  //     return(null);
  //   }
  // }

  // var myts = function(name, timeseries, overwrite){
  //   if(!name) name = 'timeseries';
    
  //   if(timeseries && overwrite){
  //     var object = {};
  //     object['_data.' + name] = timeseries;
  //     var result = save(context.collection, context.id, object)
  //     return result;
  //   }
    
  //   if(timeseries && !overwrite){
  //     var newTs = myts(name);

  //     if(newTs){
  //       var newTs = new Timeseries(newTs);
  //       var newTs = newTs.overlay(timeseries);        
  //     } else {
  //       newTs = timeseries;
  //     }

  //     var result = myts(name, newTs, true);
  //     return result;
  //   }

  //   if(!timeseries){
  //     var timeseries = ts(name);
  //     return timeseries;        
  //   }
  // }
  
  // var csv = function(text){
  //   var fiber = Fiber.current;
  //   var result;
  //   parse(text, {comment: '#'}, function (err, data) {
  //     result = data;
  //     fiber.run();
  //   });
  //   Fiber.yield(result);
  //   return result;
  // }

  // Credits: http://stackoverflow.com/a/1144788/3514414
  function replace(string, find, replace) {
    function escapeRegExp(string) {return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");}
    return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
  }

  // var db;
  try{
    // db = mongo.connect(context.host + ':' + context.port + '/' + context.database);
    // if(!db) { console.error('no db'); throw 'no db'}

/* SCRIPT */

    // db.close();

    if(typeof(context.end) == 'function') context.end();

  } catch(exception){
    // db.close(exception);

    // console.error("context.js: " + exception)

    if(typeof(context.end) == 'function') context.end(exception);

  }
    
}).run();