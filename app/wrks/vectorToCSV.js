self.addEventListener('message', function(e) {

  importScripts('/lib/js/moment.js', '/lib/js/twix.js');

  var options  = e.data.options;
  var base     = e.data.base;
  var interval = e.data.interval;
  var vector   = e.data.vector;

  // Defaults
  if(!options || !base || !vector) return null;

  if(!options.separator) options.separator = '\t';

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var start = moment(base);
  var end   = moment(start)
  end.add(vector.length * delta, unit);

  var time = [];
  var iter = moment(start).twix(end).iterateInner(delta, unit);
  while(iter.hasNext()){ time.push(iter.next().format(options.format)); }

  var ts = new Array(time.length);
  time.map(function(x, i, a){ ts[i] = time[i] + options.separator + vector[i]; });
  var csv = ts.join('\r\n');

  self.postMessage(csv);

}, false);
