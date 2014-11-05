self.addEventListener('message', function(e) {


  importScripts('/lib/js/moment.js', '/lib/js/twix.js');

  var options  = e.data.options;
  var base     = e.data.base;
  var interval = e.data.interval;
  var vector   = e.data.vector;
  var csv      = e.data.csv;

  if(!options || !base || !vector || !csv) return null;
  if(!options.separator) options.separator = '\t';

  var delta = parseInt(interval.match(/[0-9]+/));
  var unit  = interval.match(/m|h|d/).toString();

  var start = moment(base);
  var end   = moment(start)
  end.add(vector.length * delta, unit);

  var time = [];
  var iter = moment(start).twix(end).iterateInner(delta, unit);
  while(iter.hasNext()){ time.push(iter.next().format(options.format)); }

  var lines  = csv.match(/[^\r\n]+/g);
  lines.map(function(item, index, array){
    var line = item.split(options.separator);
    vector[index] = parseFloat(line[1]);
  });

  var ts = {
    base:     base,
    interval: interval,
    vector:   vector
  };

  self.postMessage(ts);

}, false);
