
app.factory('socket', function ($rootScope) {
  var socket = io.connect();

  var on = function (eventName, callback) {
    // console.log('Socket.io, started listening for: ' + eventName)
    socket.removeListener(eventName);
    socket.on(eventName, function () {  
      var args = arguments;
      $rootScope.$apply(function () {
        callback.apply(socket, args);
      });
    });
  }; 

  var emit = function (eventName, data, callback) {
    socket.emit(eventName, data, function () {
      var args = arguments;
      $rootScope.$apply(function () {
        if (callback) {
          callback.apply(socket, args);
        }
      });
    })
  };

  var close = function(eventName){
    // console.log('Socket.io, stopped listening for: ' + eventName)
    socket.removeListener(eventName);
  }

  return { on: on, emit: emit, close: close };
});
