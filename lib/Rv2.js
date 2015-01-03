var uuid    = require('node-uuid');
var process = require('child_process');
var assert  = require('assert');
var fs      = require('fs');

exports.new = function(bin){

  var session = {
    bin: bin,
    id: null,
    process: null,
    queue:   [],
    running: null,
    ready: false
  };

  function start(callback){

    assert(fs.existsSync(session.bin), 'R executable should exist.');
    assert(typeof(callback) == 'function', 'Callback should be a function(err, data)');
    
    session.process = process.spawn(session.bin, ['--vanilla', '--slave'], { cwd: __dirname });

    session.id = uuid.v4(); 
    session.process.stdin.write('cat("ready:'+ session.id +'");' + '\n');

    // Exception:
    session.process.on('exit', function (code) {
      if(code) console.log('Warning: R process died (' + code + ')');
    });

    // After stop()
    session.process.on('close', function (code, signal) {
      session.ready = false;
      delete session.process;
      delete session.id;
    });

    // When receiving data from R process
    session.process.stdout.on('data', function (data) {
      var text = new Buffer(data).toString('utf8');

      // If we have a process ready
      if(session.ready){

        var pattern = '[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}';

        if(session.running) {
          var log = text.replace(new RegExp('(begin|end|error):' + pattern, 'gi'), '');
          session.running.log += log;
        }

        if(new RegExp('end:' + pattern).test(text)) {
          var id = text.match(pattern)[0];
          if(id != session.running.id) console.log('Warning: job id mismatch.')
          session.running.end = new Date();
          var running = session.running;
          delete session.running;
          if(running.callback && typeof(running.callback) == 'function') running.callback(running);
          if(session.queue.length){
            var job = session.queue.shift();
            execute(job);
          }
        }
      } else {
        // Else wait for acknowledgment of R process being ready
        var match = text.match('ready:([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})');
        if(match && match[1]){
          var id = match[1];
          session.ready = true;
          if(callback && typeof(callback) == 'function') callback();
        }      
      }
    });

    // Receiving an error
    session.process.stderr.on('data', function (data) {
      var text = new Buffer(data).toString('utf8');
      if(session.running) session.running.err += text;
    });
  };

  // Stop R process
  function stop(){
    if(session.running || session.queue.length){
      console.log('Warning: running job or jobs in queue.')
    }
    session.process.kill();
  };

  // Execute job ({ id: 'id', script: 'R script', callback: function() })
  function execute(job){

    if(!session.process) { console.log('Warning: no R instance to execute script.'); return; }

    job.start = new Date();
    job.log   = '';
    job.err   = '';

    if(session.running) {
      session.queue.push(job);
    } else {
      session.running = job;

      var _id     = job.id;
      var _script = job.script.replace(/\"/g,'\\\"');
      var exec    = 'tryCatch({ cat("begin:' + _id + '"); eval(parse(text="' + _script + '")); },' +
                    'error   = function(e){ print(e); cat("error:'   + _id + '"); },' + 
                    'finally = { cat("end:' + _id + '"); });';

      session.process.stdin.write(exec + '\n');
    }
  };

  // Run R script with optional callback (simplified interface)
  function run(script, callback){
    if(!script  || script == '') { console.log('Warning: no script to run.'); return; }
    if(callback && typeof(callback) != 'function') { console.log('Warning: callback not a function.'); return; }
    execute({ id: uuid.v4(), script: script, callback: callback });
  };

  return {
      session: session,
      start:   start,
      stop:    stop,
      execute: execute,
      run:     run
  };

};
