
/* Modules */
// var app = angular.module('app', ['ngRoute','ctrl', 'infinite-scroll', 'ui.bootstrap', 'messages', 'ui.tree']);
var app = angular.module('app', [
  'ngRoute',
  'ctrl',
  'Messages',
  'jsonFormatter'
]);

var ctrl = angular.module('ctrl', []);

/* Routes (Views and Controllers) */
app.config(['$routeProvider',

  function($routeProvider) {

  $routeProvider
    .when('/',                          { templateUrl: '/views/dashboard.html', controller: 'dashboard' })
    .when('/:collection',               { templateUrl: '/views/list.html',      controller: 'list' })
    .when('/:collection/pivot',         { templateUrl: '/views/pivot.html',     controller: 'pivot'})
    .when('/:collection/new',           { templateUrl: '/views/edit.html',      controller: 'edit' })
    .when('/:collection/new/:template', { templateUrl: '/views/edit.html',      controller: 'edit' })
    .when('/:collection/:id',           { templateUrl: '/views/edit.html',      controller: 'edit' })
    .when('/:collection/:id/raw',       { templateUrl: '/views/raw.html' ,      controller: 'raw'  })

    .otherwise({ redirectTo: '/'});

}]);

/* Relative time filter */
// Credits: http://stackoverflow.com/questions/14774486/use-jquery-timeago-or-momentjs-and-angularjs-together
app.filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  }
});

/* Main controller */

// Token based authentication
// https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/
ctrl.controller('index',
  ['$scope', '$http', '$window', '$location', '$route', '$interval', 'messages', 'socket',
  function ($scope, $http, $window, $location, $route, $interval, messages, socket) {

  // $scope.username = "admin@localhost";
  // $scope.password = "admin";

  $scope.currentCollection = function(){
    var collection = $location.path().split('/')[1];
    return collection;
  }

  $scope.currentDocument = function(){
    var doc = $location.path().split('/')[200];
    return doc;
  }

  $scope.loadCollections = function(){
    $http.get('/v1/settings?query=collection').success(function (data) { 
      $scope.collections = data.map(function(c){
        return c._id;
      });
    });
  };

  $scope.updateStars = function(){

    $http
      .get('/v1/settings/' + $scope.user._id)
      .success(function(data, status, headers, config){
        $scope.stars = data.starred;
      }).error(function(data, status, headers, config){
        $scope.stars = [];        
      });
  }

  $scope.showContent = function(){
    $scope.updateCollections();
    $scope.updateStars();
    
    socket.on('settings/' + $scope.user._id, function (data) {
      $scope.updateStars();
    });

    $scope.$on('$destroy', function () {
      socket.close('settings/' + $scope.user._id);
    });
  }

  $scope.showAuthentication = function(){
    delete $scope.collections;
    delete $window.localStorage.token;
    delete $window.localStorage.user;

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
  
  $scope.login = function() {
            
    var authentication = { username: $scope.username, password: $scope.password };
    delete $scope.username;
    delete $scope.password;

    $scope.authenticating = true;

    $http
      .post('/authenticate', authentication)
      .success(function (data, status, headers, config) {
        $window.localStorage.token = data.token;
        $window.localStorage.user  = JSON.stringify(data.profile);
        $scope.user = JSON.parse($window.localStorage.user);
        $scope.showContent();
        $scope.authenticating = false;
      })
      .error(function (data, status, headers, config) {
        $scope.authenticating = false;
        $scope.showAuthentication();
        $scope.error = "Sorry, try again";
        $('#login').addClass('animated wobble');
        $('#login').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
          $('#login').removeClass('animated wobble');
          $('#inputUsername').focus();
        });

        // messages.add('danger', 'Invalid username or password. Please try again.', { timeout: 5000 });
      });
  };

  $scope.logout = function () {
    $location.path('/');
    $scope.showAuthentication();
  };

  $scope.checkStatus = function(){
    if(!$scope.authenticated()) return;
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
      });
  }

  // Doesn't work well...
  // var statusInterval = 1000 * 60;
  // setInterval(function() {
  //   $scope.checkStatus();
  // }, statusInterval);

  // $scope.checkStatus();

  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="popover"]').popover()

}]);
