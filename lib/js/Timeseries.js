
var moment = require('moment'); require('twix');

// var ts = new Timeseries({ id: 'ts001', base: '2014-01-01T00:00+01:00', interval: '15m', vector: [1,2,3,4] })
Timeseries = function(ts) {
  if(ts && ts.base)     this.base     = ts.base;
  if(ts && ts.interval) this.interval = ts.interval;
  if(ts && ts.vector)   this.vector   = ts.vector;
}

Timeseries.prototype.fromCSV = function(){
}

Timeseries.prototype.toCSV = function(){
}

Timeseries.prototype.isValid = function(){
  
  var err = [];
  if(!this)      { err.push('No timeseries object provided.'); return err; }
  
  if(!this.base) {
    err.push('No base date object provided.'); 
  } else {
    if(!moment(this.base).isValid()) {
      err.push('Incorrect base date provided.');
    }
  }

  if(!this.interval) {
    err.push('No interval provided.'); 
  } else {
    if(typeof(this.interval) != 'string' || !this.interval.match("([0-9]+)(m|h|d)", "gi")) {
      err.push('Incorrect interval date provided.');
    }
  }

  if(!this.vector) {
    err.push('No vector provided.'); 
  } else {
    if(typeof(this.vector) != 'object' || !this.vector.length) {
      err.push('Incorrect vector provided.');
    }
  }

  return err;
}

Timeseries.prototype.isCompatible = function(ts){
}

Timeseries.prototype.add = function(ts){
}

Timeseries.prototype.subtract = function(){
}

// returns [ start, length ] for MongoDB
Timeseries.prototype.slice = function(from, to){

  if(!this.base || !this.interval || !from || !to) return null;

  from = this.roundUp(from);
  //to   = this.roundDown(to);

  var base = moment(this.base);
  var from = moment(from);
  var to   = moment(to);

  if(to.isSame(from)) return [];
  if(to.isBefore(base)) return [];
  if(to.isBefore(from)) return [];
  if(from.isBefore(base)) from = moment(base);

  var delta = this.delta();
  var unit  = this.unit();

  var start = Math.floor((from.valueOf() - base.valueOf()) / moment.duration(delta, unit).valueOf());
  var length = Math.floor((to.valueOf() - from.valueOf()) / moment.duration(delta, unit).valueOf()) + 1;

  return [ start, length ];

}

// Number of intervals
Timeseries.prototype.length = function(from, to, interval){

  var from = moment(from);
  var to   = moment(to);

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var length = Math.floor((to.valueOf() - from.valueOf()) / moment.duration(delta, unit).valueOf()) + 1;

  if(length < 1) length = 0;
  
  return length;
}

Timeseries.prototype.delta = function(){
  if(!this || !this.interval) return null;
  return parseInt(this.interval.match(/[0-9]+/));
}

Timeseries.prototype.unit = function(){
  if(!this || !this.interval) return null;
  return this.interval.match(/m|h|d/).toString();
}

// paste ts1 onto ts0
Timeseries.prototype.overlay = function(timeseries){

  if(!timeseries || !timeseries.interval || !timeseries.base || !timeseries.vector) return null;
  if(!this       || !this.interval       || !this.base       || !this.vector      ) return null;

  ts0 = { interval: this.interval, base: this.base, vector: this.vector };
  ts1 = timeseries;
  
  if(ts0.interval != ts1.interval) return null;

  var ts = new Timeseries({ base: "", interval: ts0.interval, vector: []});

  var base0 = moment(ts0.base);
  var base1 = moment(ts1.base);

  if(base1.isBefore(base0))
    ts.base = ts1.base;
  else
    ts.base = ts0.base;

  var base = moment(ts.base);

  var last0 = moment(base0);
  var last1 = moment(base1);
  last0.add(ts.delta() * ts0.vector.length, ts.unit());
  last1.add(ts.delta() * ts1.vector.length, ts.unit());

  var last;
  if(last1.isBefore(last0)) last = last0;
    else                    last = last1;

  var l = Timeseries.prototype.length(base, last, ts.interval) - 1;
  ts.vector = new Array(l);

  var d = Timeseries.prototype.length(base, base0, ts.interval) - 1;
  for(var i = 0; i < ts0.vector.length; i++) {
    ts.vector[d+i] = ts0.vector[i];
  }

  var d = Timeseries.prototype.length(base, base1, ts.interval) - 1;
  for(var i = 0; i < ts1.vector.length; i++) ts.vector[d+i] = ts1.vector[i];

  return ts;
}

Timeseries.prototype.NaNs = function(n){
  if(!n || n < 1) return [];
  var v = new Array(n);
  for(var i = 0; i < n; i++) v[i] = NaN;
  return v;
}

//test();*/

Timeseries.prototype.ones = function(n){
  if(!n || n < 1) return [];
  var v = new Array(n);
  for(var i = 0; i < n; i++) v[i] = 1;
  return v;
}

Timeseries.prototype.zeros = function(n){
  if(!n || n < 1) return [];
  var v = new Array(n);
  for(var i = 0; i < n; i++) v[i] = 0;
  return v;
}

// Distance between two timepoints ... edge case: from 2014-01-01T00:00+01:00 to 2014-01-02T00:00+01:00 is 24, not 25
Timeseries.prototype.distance = function(start, end, interval, float){

  var start = moment(start);
  var end   = moment(end);

  if(start.isSame(end)) return 0;

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var time1 = end.valueOf();
  var time0 = start.valueOf();
  var diff  = moment.duration(delta, unit).valueOf();

  var distance = (time1 - time0) / diff;

  if(!float){
    if(distance % 1 > 0) distance = Math.floor(distance) + 1;
    if(distance < 1) distance = 0;    
  }
  
  return distance;
}

/* Padding */
Timeseries.prototype.pad = function(from, to){
  
  if(!from || !to) return null;

  //var newBase = this.distance(from, base);

  from = this.roundUp(from);
  //to   = this.roundDown(to);

  if(!this.vector.length || moment(to).isBefore(this.base)){
    var padding = this.distance(from, to, this.interval);
    return new Timeseries({ base: from, interval: this.interval, vector: this.NaNs(padding) });
  }

  if(this.vector.length != this.distance(from, to, this.interval)){
    var before = this.distance(from, this.base, this.interval);
    var after  = this.distance(from, to, this.interval) - this.vector.length - before;
    var before = this.NaNs(before);
    var after  = this.NaNs(after);
    var vector = before.concat(this.vector).concat(after);
    return new Timeseries({ base: from, interval: this.interval, vector: vector});
  }

  return new Timeseries({ base: from, interval: this.interval, vector: this.vector});
}

Timeseries.prototype.patch = function(object){
  if(!object) return this;
  object.base     = this.base;
  object.interval = this.interval;
  object.vector   = this.vector;
  return object;
}

/*var request = require('request');
var ts0 = new Timeseries({ base: '2014-01-01T00:00+01:00', interval: '15m', vector: [1,2,3,4] });
var ts1 = { _id: "ts001", tags: ["ts", "test"] };
var ts = ts0.patch(ts1);
console.log(ts)
request.put({url: 'http://localhost/api/timeseries/ts001', json: ts }, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body);
  }
});
*/

Timeseries.prototype.roundUp = function(date){
  var unit  = this.unit();
  var delta = this.delta();
  var diff  = this.distance(this.base, date, this.interval, true) % 1;
  var shift = (diff>0?1-diff:0-diff) * delta;
  var nbase = moment(date).add(shift, unit).format();
  return nbase;
}

Timeseries.prototype.roundDown = function(date){
  var unit  = this.unit();
  var delta = this.delta();
  var diff  = this.distance(this.base, date, this.interval, true) % 1;
  var shift = (diff<0?1+diff:0+diff) * delta;
  var nbase = moment(date).subtract(shift, unit).format();
  return nbase;
}

/* Unit tests */
Timeseries.prototype.test = function(){

  /* Timeseries.prototype.overlay() */
  var ts0 = { "id":"ts0", "base" : "2013-01-01T00:00:00+01:00", "interval" : "1h", "vector" : [ 1, 1, 1, 1 ] };
  var ts1 = { "id":"ts1", "base" : "2013-01-01T02:00:00+01:00", "interval" : "1h", "vector" : [ 2, 2, 2, 2 ] };

  var ts = new Timeseries(ts0).overlay(ts1);

  if(ts.vector.toString() != "1,1,2,2,2,2"){
    console.error('Timeseries.prototype.overlay(): failed test!');
  }

  /* Timeseries.prototype.isValid() */
  var ts = new Timeseries({ id: 'ts001', base: '2014-01-01T00:00+01:00', interval: '15m', vector: [1,2,3,4] });
  if(!ts.isValid()){
    console.error('Timeseries.prototype.isValid(): failed test!');
  }

  /* Timeseries.prototype.length() */
  if(Timeseries.prototype.length("2003-12-31T00:00+01:00", "2004-01-01T00:00+01:00", "1h") != 25){
    console.error('Timeseries.prototype.length(): failed test 1!');
  }
  if(Timeseries.prototype.length("2003-12-31T00:00+01:00", "2004-01-01T23:59+01:00", "1h") != 48){
    console.error('Timeseries.prototype.length(): failed test 2!');
  }
  if(Timeseries.prototype.length("2004-02-01T00:00+01:00", "2004-01-01T00:00+01:00", "1h") != 0){
    console.error('Timeseries.prototype.length(): failed test 3!');
  }
  if(Timeseries.prototype.length("2004-02-01T00:00+01:00", "2004-02-01T23:59+01:00", "1h") != 24){
    console.error('Timeseries.prototype.length(): failed test 4!');
  }
  if(Timeseries.prototype.length("2014-01-01T00:00+01:00", "2014-01-01T23:59+01:00", "6h") != 4){
    console.error('Timeseries.prototype.length(): failed test 5!');
  }

  /* Slice */
  var ts = new Timeseries({ id: "ts", base: "2014-01-01T00:00+01:00", interval: "1d", vector: [1,2,3] })
  if(ts.slice("2013-12-31", "2014-01-02").toString() != "0,2"){
    console.error('Timeseries.prototype.slice(): failed test!');
  }

  /* Timeseries.prototype.roundUp() */
  var base = "2014-01-01T" +     "00:01:00"    + "+01:00";
  var interval = '4m';
  var date = "2013-01-04T" +     "00:04:00"    + "+01:00";
  var ts = new Timeseries({base:base, interval:interval, vector:[]});

  if(ts.roundUp(date) != ("2013-01-04T00:05:00+01:00")){
    console.error('Timeseries.prototype.roundUp(): failed test!');
  };

  /* Timeseries.prototype.roundDown() */
  var base = "2014-01-01T" +     "00:01:00"    + "+01:00";
  var interval = '4m';
  var date = "2013-01-04T" +     "00:04:00"    + "+01:00";
  var ts = new Timeseries({base:base, interval:interval, vector:[]});

  if(ts.roundDown(date) != ("2013-01-04T00:01:00+01:00")){
    console.log(ts.roundDown(date));
    console.error('Timeseries.prototype.roundDown(): failed test!');
  };

}

Timeseries.prototype.toJSON = function(){
  return {id: (this.id || ''), base: (this.base || ''), interval: (this.interval || ''), vector: (this.vector || [])};
}

Timeseries.prototype.fromJSON = function(object) {
  if(object && object.base)     this.base     = object.base;
  if(object && object.interval) this.interval = object.interval;
  if(object && object.vector)   this.vector   = object.vector;
}


Timeseries.prototype.test();

module.exports = Timeseries;
