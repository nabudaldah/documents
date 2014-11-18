
/* Modules */
var app = angular.module('app', ['ngRoute','ctrl', 'infinite-scroll', 'ui.bootstrap', 'messages', 'google-maps'.ns(), 'ui.tree']);

/* Routes (Views and Controllers) */
app.config(['$routeProvider', function($routeProvider) { $routeProvider


  .when('/',            { templateUrl: '/view/home.html', controller: 'home' })

  .when('/error/0',   { template: '<div class="jumbotron"><h1>Connection lost</h1><p>Please try again later.</p></div>' })
  .when('/error/401', { template: '<div class="jumbotron"><h1>Unauthorized</h1><p>Please login.</p></div>' })

  // // Timeseries view en controller
  // .when('/timeseries/pivot', { templateUrl: '/view/object.pivot.html',    controller: 'object.pivot'    })
  // .when('/timeseries/new',   { templateUrl: '/view/timeseries.new.html',  controller: 'timeseries.new'  })
  // .when('/timeseries/:id',   { templateUrl: '/view/timeseries.edit.html', controller: 'timeseries.edit' })

  // Generieke views en controllers
  .when('/:collection',               { templateUrl: '/view/list.html',  controller: 'list' })
  .when('/:collection/pivot',         { templateUrl: '/view/pivot.html', controller: 'pivot'})
  .when('/:collection/new',           { templateUrl: '/view/edit.html',  controller: 'edit' })
  .when('/:collection/new/:template', { templateUrl: '/view/edit.html',  controller: 'edit' })
  .when('/:collection/:id',           { templateUrl: '/view/edit.html',  controller: 'edit' })
  .when('/:collection/:id/raw',       { templateUrl: '/view/raw.html' ,  controller: 'raw'  })

  .otherwise({ redirectTo: '/'});

}]);

/* Controller options (choose localStorage or sessionStorage) */

var ctrl = angular.module('ctrl', []);

app.factory('authInterceptor', ['$q', '$rootScope', '$location', '$window', 'messages',
  function ($q, $rootScope, $location, $window, messages) {
    return {
      request: function (config) {
        if ($window.localStorage.token) {
          config.headers.Authorization = 'Bearer ' + $window.localStorage.token;
        }
        return config || $q.when(config);
      },
      requestError: function(request){
        if(request && request.status == 0){
          messages.add('danger', 'Connection to server lost.')
          //$location.path('/error/0');
        };
        return $q.reject(request);
      },
      response: function (response) {
        return response || $q.when(response);
      },
      responseError: function (response) {
        if (response && response.status === 401) {
          console.log('401: Unauthorized.')
          messages.add('danger', 'Unauthorized: please login.')
          $location.path('/error/401');
          delete $window.localStorage.token;
          delete $window.localStorage.user;
        }
        if (response && response.status === 404) {
        }
        if (response && response.status >= 500) {
        }
        return $q.reject(response);
      }
    };
}]);

ctrl.config(function ($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
});

/* Main controller */

// Token based authentication
// https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/
ctrl.controller('main', function ($scope, $http, $window, $location, messages, $route, socket, $interval) {

  $scope.authUser = "admin@localhost";
  $scope.authPass = "admin";

  $scope.loadCollections = function(){
    $http.get('/v1/settings?query=collection').success(function (data) { 
      $scope.collections = data.map(function(c){
        return c._id;
      });
    });
  };

  $scope.showContent = function(){
    $scope.updateCollections();
    $("#page-content").removeClass("hidden")
    $("#page-authentication").addClass("hidden")
    $("#wrapper").removeClass("toggled");
    $("#menubtn").removeClass("toggled");    
  }

  $scope.showAuthentication = function(){
    delete $scope.collections;
    delete $window.localStorage.token;
    delete $window.localStorage.user;
    console.log('not authenticated...')
    $("#page-content").addClass("hidden")
    $("#page-authentication").removeClass("hidden")
    $("#wrapper").addClass("toggled");
    $("#menubtn").addClass("toggled");    
  }

  $scope.authenticated = function(){
    if($window.localStorage.token && $window.localStorage.user){
      $scope.user = JSON.parse($window.localStorage.user);
      return true;
    } else {
      delete $scope.user;
      return false;
    }
  };

  $scope.updateCollections = function(){
    $http.get('/v1/settings?query=collection').success(function (data) {
      $scope.collections = data.map(function(c){
        return c._id;
      });
    });
  };

  if($scope.authenticated()){
    $scope.showContent();
  } else {
    $scope.showAuthentication();
  }
  
  $scope.login = function () {

    var authentication = { username: $scope.authUser, password: $scope.authPass };

    $http
      .post('/authenticate', authentication)
      .success(function (data, status, headers, config) {
        $window.localStorage.token = data.token;
        $window.localStorage.user  = JSON.stringify(data.profile);
        $scope.user = JSON.parse($window.localStorage.user);
        $route.reload();
        $scope.showContent(); 
      })
      .error(function (data, status, headers, config) {
        $scope.showAuthentication();
        messages.add('danger', 'Invalid username or password. Please try again.', { timeout: 5000 });
      });
  };

  $scope.logout = function () {
    $location.path('/');
    $scope.showAuthentication();
  };

  $scope.menu = function(){
    if($scope.authenticated()){
      $("#wrapper").toggleClass("toggled");
      $("#menubtn").toggleClass("toggled");
      setTimeout(function(){ $(window).resize(); }, 500);
    }
  }

  $scope.checkStatus = function(){
    $http
      .get('/v1/status')
      .success(function(data, status, headers, config){
        var txt = "";

        txt =       "NodeJS " + data.version + "\n"
        txt = txt + data.platform + " (" + data.arch  + ")\n";
        txt = txt + "Up:  " + numeral(data.uptime).format('00:00:00') + "\n";
        txt = txt + "Mem: " + numeral(data.memory).format('0.0 b') + "\n";

        $scope.status = txt;

      }).error(function(data, status, headers, config){
        $scope.status = null;
        //messages.add('danger', 'Server not responding.', {timeout: statusInterval })
      });
  }

  var statusInterval = 1000 * 60;
  setInterval(function() {
    $scope.checkStatus();
  }, statusInterval);

  $scope.checkStatus();

});
