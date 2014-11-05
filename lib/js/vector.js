var moment = require('moment'); require('twix');

/*
// returns [ start, length ] for MongoDB
exports.slice = function(base, interval, from, to){

  var base = moment(base);
  var from = moment(from);
  var to   = moment(to);

  if(to.isSame(from)) return null;
  if(to.isBefore(base)) return null;
  if(to.isBefore(from)) return null;
  if(from.isBefore(base)) from = moment(base);

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var length   = 0;
  var iterator = from.twix(to).iterate(delta, unit);
  while(iterator.hasNext()){ length++; iterator.next();}

  var start    = 0;
  var iterator = base.twix(from).iterateInner(delta, unit);
  while(iterator.hasNext()){ start++; iterator.next();}

  return [ start, length ];

}
*/

// returns [ start, length ] for MongoDB
exports.slice = function(base, interval, from, to){

  var base = moment(base);
  var from = moment(from);
  var to   = moment(to);

  if(to.isSame(from)) return null;
  if(to.isBefore(base)) return null;
  if(to.isBefore(from)) return null;
  if(from.isBefore(base)) from = moment(base);

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var start = Math.floor((from.valueOf() - base.valueOf()) / moment.duration(delta, unit).valueOf());
  var length = Math.floor((to.valueOf() - from.valueOf()) / moment.duration(delta, unit).valueOf()) + 1;

  return [ start, length ];

}


/*
// Number of intervals b
exports.length = function(from, to, interval){

  var from = moment(from);
  var to   = moment(to);

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var length   = 0;
  var iterator = from.twix(to).iterate(delta, unit);
  while(iterator.hasNext()){ length++; iterator.next(); }
  
  return length;
}
*/

// Number of intervals
exports.length = function(from, to, interval){

  var from = moment(from);
  var to   = moment(to);

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var length = Math.floor((to.valueOf() - from.valueOf()) / moment.duration(delta, unit).valueOf()) + 1;

  if(length < 1) length = 0;
  
  return length;
}



// paste ts1 onto ts0
exports.paste = function(ts0, ts1){

  if(!ts0 || !ts0.interval || !ts0.base || !ts0.vector ||
     !ts1 || !ts1.interval || !ts1.base || !ts1.vector) return null;
  
  if(ts0.interval != ts1.interval) return null;

  var ts = {
    base:     "",
    interval: ts0.interval,
    vector:   []
  };

  var interval = ts.interval;
  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var base0 = moment(ts0.base);
  var base1 = moment(ts1.base);

  if(base1.isBefore(base0))
    ts.base = ts1.base;
  else
    ts.base = ts0.base;

  var base = moment(ts.base);

  var last0 = moment(base0);
  last0.add(delta * ts0.vector.length, unit);
  var last1 = moment(base1);
  last1.add(delta * ts1.vector.length, unit);

  var last;
  if(last1.isBefore(last0))
    last = last0;
  else
    last = last1;

  var l = exports.length(base, last, interval) - 1;
  ts.vector = new Array(l);

  var d = exports.length(base, base0, interval) - 1;
  for(var i = 0; i < ts0.vector.length; i++) {
    ts.vector[d+i] = ts0.vector[i];
  }

  var d = exports.length(base, base1, interval) - 1;
  for(var i = 0; i < ts1.vector.length; i++) ts.vector[d+i] = ts1.vector[i];

  return ts;
}

/*
function test(){

  var ts0 = {
      "base" : "2013-01-01T00:00:00+01:00",
      "interval" : "1d",
      "vector" : [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
      ]
  }

  var ts1 = {
      "base" : "2013-01-01T00:00:00+01:00",
      "interval" : "1d",
      "vector" : [
      2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
      ]
  }

  var c = paste(ts0, ts1);



}

test();*/

exports.nulls = function(n){
  if(!n || n < 1) return [];
  var v = new Array(n);
  for(var i = 0; i < n; i++) v[i] = null;
  return v;
}


/*
// returns [ start, length ] for MongoDB
slice = function(base, interval, from, to){

  var base = moment(base);
  var from = moment(from);
  var to   = moment(to);

  if(to.isSame(from)) return null;
  if(to.isBefore(base)) return null;
  if(to.isBefore(from)) return null;
  if(from.isBefore(base)) from = moment(base);

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var length = Math.round((to.valueOf() - from.valueOf()) / moment.duration(delta, unit).valueOf());
  var start = Math.round((from.valueOf() - base.valueOf()) / moment.duration(delta, unit).valueOf());

  return [ start, length ];

}


var s = new Date();
var slice0 = vector.slice("2000-01-01T00:00+01:00", "1h", "2009-06-01T00:00+01:00", "2013-06-30T23:59+01:00");
var t0 = (new Date() - s);

console.log('slice0: ' + slice0)
console.log('time0: ' + t0)

var s = new Date();
var slice1 = slice("2000-01-01T00:00+01:00", "1h", "2009-06-01T00:00+01:00", "2013-06-30T23:59+01:00");
var t1 = (new Date() - s);
console.log('slice1: ' + slice1)
console.log('time1: ' + t1)
*/



/*

// Number of intervals b
length = function(from, to, interval){

  var from = moment(from);
  var to   = moment(to);

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var length = Math.floor((to.valueOf() - from.valueOf()) / moment.duration(delta, unit).valueOf()) + 1;
  
  return length;
}


var s = new Date();
var length0 = vector.length("2000-01-01T00:00+01:00", "2009-06-01T00:00+01:00", "1h");
var t0 = (new Date() - s);

console.log('length0: ' + length0)
console.log('time0: ' + t0)

var s = new Date();
var length1 = length("2000-01-01T00:00+01:00", "2009-06-01T00:00+01:00", "1h");
var t1 = (new Date() - s);
console.log('length1: ' + length1)
console.log('time1: ' + t1)



*/

/*
var b = exports.length("2003-12-31T00:00+01:00", "2004-01-01T00:00+01:00", "1h");
console.log(b)
var a = exports.length("2003-12-31T00:00+01:00", "2004-01-01T23:59+01:00", "1h");
console.log(a)

var b = exports.length("2004-02-01T00:00+01:00", "2004-01-01T00:00+01:00", "1h");
if(b<1) b=0;
console.log(b)
var a = exports.length("2004-02-01T00:00+01:00", "2004-02-01T23:59+01:00", "1h");
console.log(a)


console.log('---')
var b = exports.length("2014-01-01T00:00+01:00", "2014-01-01T23:59+01:00", "6h");
console.log(b)
*/

// Distance between two timepoints ... edge case: from 2014-01-01T00:00+01:00 to 2014-01-02T00:00+01:00 is 24, not 25
exports.distance = function(start, end, interval){

  var start = moment(start);
  var end   = moment(end);

  if(start.isSame(end)) return 0;

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var time1 = end.valueOf();
  var time0 = start.valueOf();
  var diff  = moment.duration(delta, unit).valueOf();

  var distance = (time1 - time0) / diff;

  if(distance % 1 > 0) distance = Math.floor(distance) + 1;

  if(distance < 1) distance = 0;
  
  return distance;
}

/*setInterval(function(){
  var d = exports.distance("2014-01-01T00:00+01:00", "2014-01-02T00:00+01:00", "15m");
  console.log(d);
}, 100);*/

