var moment = require('moment');
var moment = require('moment-timezone');
var twix   = require('twix');

// var ts = new Timeseries({ base: '2014-01-01T00:00+01:00', interval: '15m', vector: [1,2,3,4] })
var Timeseries = function(ts) {
  if(ts){
    if(ts.base)     this.base     = ts.base;
    if(ts.interval) this.interval = ts.interval;
    if(ts.vector)   this.vector   = ts.vector;
    if(ts.changes)  this.changes  = ts.changes;
  }
}

Timeseries.prototype.fromCSV = function(csv){
  // return(ts);
}

Timeseries.prototype.toCSV = function(separator, format, timezone){

    if(!this || !this.base || !this.interval || !this.vector) return null;

    if(!separator) separator = ',';
    if(!timezone) timezone = "";

    var delta = parseInt(this.interval.match(/[0-9]+/));
    var unit  = this.interval.match(/s|m|h|d/).toString();

    var start = moment(this.base);
    var end   = moment(start)
    end.add(this.vector.length * delta, unit);

    var time = [];
    var iter = moment(start).twix(end).iterateInner(delta, unit);
    if(!timezone) while(iter.hasNext()) time.push(moment(iter.next()).format(format));
    if( timezone) while(iter.hasNext()) time.push(moment(iter.next()).tz(timezone).format(format));

    var lines = new Array(time.length);
    for(var i = 0; i < time.length; i++) lines[i] = time[i] + separator + this.vector[i];
    var csv = lines.join('\n');

    return(csv);
}

Timeseries.prototype.isValid = function(){
  
  if(!this)
    return false;

  if(!this.base)
    return false;

  if(!moment(this.base).isValid())
    return false;

  if(!this.interval)
    return false;

  if(typeof(this.interval) != 'string' || !this.interval.match("([0-9]+)(s|m|h|d)", "gi"))
    return false;

  if(!this.vector)
    return false;

  if(!(this.vector instanceof Array) || !this.vector.length)
    return false;

  return true;

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
  var unit  = interval.match(/s|m|h|d/).toString();

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
  return this.interval.match(/s|m|h|d/).toString();
}

// paste ts1 onto ts0
Timeseries.prototype.overlay = function(ts1){

  if(!ts1 || !ts1.interval || !ts1.base || !ts1.vector) return null;
  if(!this       || !this.interval       || !this.base       || !this.vector      ) return null;
  
  if(this.interval != ts1.interval) return null;

  var nts = new Timeseries({ base: "", interval: this.interval, vector: [], changes: this.changes });

  var base0 = moment(this.base);
  var base1 = moment(ts1.base);

  if(base1.isBefore(base0))
    nts.base = ts1.base;
  else
    nts.base = this.base;

  var base = moment(nts.base);

  var last0 = moment(base0);
  var last1 = moment(base1);
  last0.add(nts.delta() * this.vector.length, nts.unit());
  last1.add(nts.delta() * ts1.vector.length, nts.unit());

  var last;
  if(last1.isBefore(last0)) last = last0;
    else                    last = last1;

  var l = Timeseries.prototype.length(base, last, nts.interval) - 1;
  nts.vector = new Array(l);

  var d = Timeseries.prototype.length(base, base0, nts.interval) - 1;
  for(var i = 0; i < this.vector.length; i++) {
    nts.vector[d+i] = this.vector[i];
  }

  var d = Timeseries.prototype.length(base, base1, nts.interval) - 1;
  for(var i = 0; i < ts1.vector.length; i++) nts.vector[d+i] = ts1.vector[i];

  return nts;
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
  var unit  = interval.match(/s|m|h|d/).toString();

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
var ts1 = { _id: "ts001", _tags: ["ts", "test"] };
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

Timeseries.prototype.change = function(timeseries){
  if(!this.changes) this.changes = [];
  timeseries.timestamp = moment().format();
  this.changes.push(timeseries);
}

Timeseries.prototype.reconstruct = function(to){
  if(this.changes && this.changes.length){
    var ts0 = new Timeseries({ base: this.changes[0].base, interval: this.changes[0].interval, vector: this.changes[0].vector });
    this.changes.map(function(ts1){ 
      if(!to || (to && moment(ts1.timestamp).before(moment(to)))) ts0 = ts0.overlay(ts1);
    })
    this.base     = ts0.base;
    this.interval = ts0.interval;
    this.vector   = ts0.vector;   
  }
}

Timeseries.prototype.toJSON = function(nan){

  var ts = { base: (this.base || ''), interval: (this.interval || ''), vector: (this.vector || []), changes: (this.changes || undefined)};

  if(nan) {
    // NaN handling... (always use NaN's, not null's): JSON does not have 
    ts.vector = ts.vector.map(function(x){
      if(x === null || x == 'NaN') return NaN;
      return x;
    });    
  }

  return(ts);
}

Timeseries.prototype.fromJSON = function(object) {
  if(object && object.base)     this.base     = object.base;
  if(object && object.interval) this.interval = object.interval;
  if(object && object.vector)   this.vector   = object.vector;
  if(object && object.changes)  this.changes  = object.changes;
}

module.exports = Timeseries;
