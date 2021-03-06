// app.factory('auth', ['$q', '$rootScope', '$location', '$window', 'messages',
  // function ($q, $rootScope, $location, $window, messages) {
app.factory('auth', ['$q', '$rootScope', '$location', '$window', 'messages',
  function ($q, $rootScope, $location, $window, messages) {
    return {
      request: function (config) {
        if ($window.localStorage.token) {
          config.headers.Authorization = 'Bearer ' + $window.localStorage.token;
        }
        return config || $q.when(config);
      },
      requestError: function(request){
        console.log('000: Connection lost.');
        messages.add('danger', '000: Connection lost.');
        if(request && request.status == 0){
          messages.add('danger', 'Connection to server lost.');
          //$location.path('/error/0');
        };
        return $q.reject(request);
      },
      response: function (response) {
        return response || $q.when(response);
      },
      responseError: function (response) {
        if (response && response.status === 401) {
          console.log('401: Unauthorized.');
          messages.add('danger', '401: Unauthorized.');
          //$location.path('/error/401');
          delete $window.localStorage.token;
          delete $window.localStorage.user;
        }
        if (response && response.status === 404) {
          console.log('404: Not found.');
          messages.add('danger', '404: Not found.');
        }
        if (response && response.status >= 500) {
          console.log('500: Internal Error.');
          messages.add('danger', '500: Internal Error.');
        }
        return $q.reject(response);
      }
    };
}]);

ctrl.config(function ($httpProvider) {
  $httpProvider.interceptors.push('auth');
});