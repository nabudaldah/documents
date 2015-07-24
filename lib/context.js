Fiber(function() {

  // HTTP functions (get, put and post)
  var get = function (url){
    var fiber = Fiber.current;
    var result;
    request(url, function (err, res, body) {
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
      if(err) result = null;
      else result = body;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

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
    db.find(query, fields, function (err, data) {
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
    db.findOne({ _id: id }, fields, function (err, data) {
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
    var id = object._id;
    delete object._id;
    db.update({ _id: id }, { $set: object }, { upsert: true }, function (err, data) {
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
    db.remove({ _id: id }, function (err, data) {
      if(err) result = null;
      else result = data;
      fiber.run();
    });
    Fiber.yield(result);
    return result;    
  }

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

  // Credits: http://stackoverflow.com/a/1144788/3514414
  function replace(string, find, replace) {
    function escapeRegExp(string) {return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");}
    return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
  }

  try{

/* SCRIPT */

    if(typeof(context.end) == 'function') context.end();

  } catch(exception){

    if(typeof(context.end) == 'function') context.end(exception);

  }
    
}).run();