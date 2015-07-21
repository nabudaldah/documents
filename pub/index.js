
/* Modules */
// var app = angular.module('app', ['ngRoute','ctrl', 'infinite-scroll', 'ui.bootstrap', 'messages', 'ui.tree']);
var app = angular.module('app', [
  'ngRoute',
  'ctrl',
  'Messages',
  'jsonFormatter',
  'ngFileUpload',
  'ui.grid',
  'ui.grid.autoResize',
  'infinite-scroll'
]);

var ctrl = angular.module('ctrl', []);

/* Routes (Views and Controllers) */
app.config(['$routeProvider', '$locationProvider',

  function($routeProvider, $locationProvider) {

  $routeProvider
    .when('/',                          { templateUrl: '/views/home.html',     controller: 'home'     })
    .when('/home',                      { templateUrl: '/views/home.html',     controller: 'home'     })
    .when('/:collection',               { templateUrl: '/views/list.html',     controller: 'list',    reloadOnSearch: false })
    .when('/:collection/pivot',         { templateUrl: '/views/pivot.html',    controller: 'pivot',   reloadOnSearch: false })
    .when('/:collection/new',           { templateUrl: '/views/edit.html',     controller: 'edit'     })
    .when('/:collection/new/:template', { templateUrl: '/views/edit.html',     controller: 'edit'     })
    .when('/:collection/upload',        { templateUrl: '/views/upload.html',   controller: 'upload'   })
    .when('/:collection/automate',      { templateUrl: '/views/automate.html', controller: 'automate' })
    .when('/:collection/share',         { templateUrl: '/views/share.html',    controller: 'share'    })
    .when('/:collection/:id',           { templateUrl: '/views/edit.html',     controller: 'edit'     })
    .when('/:collection/:id/raw',       { templateUrl: '/views/raw.html' ,     controller: 'raw'      })

    .otherwise({ redirectTo: '/home'});

  $locationProvider.html5Mode(true);

}]);

/* Relative time filter */
// Credits: http://stackoverflow.com/questions/14774486/use-jquery-timeago-or-momentjs-and-angularjs-together
app.filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  }
});

// Credits: https://gist.github.com/thomseddon/3511330
app.filter('bytes', function() {
  return function(bytes, precision) {
    if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
    if (typeof precision === 'undefined') precision = 1;
    var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
      number = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
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

  $scope.expandedView = JSON.parse('' + $window.localStorage['expandedView']);

  $scope.expandedViewToggle = function(){
    $scope.expandedView = !$scope.expandedView;
    $window.localStorage['expandedView'] = '' + $scope.expandedView;
  }


  $scope.currentCollection = function(){
    var collection = $location.path().split('/')[1];
    return collection;
  }

  $scope.currentDocument = function(){
    var doc = $location.path().split('/')[200];
    return doc;
  }

  $scope.loadCollections = function(){
    $scope.collections = ['timeseries'];
    // $http.get('/api/settings?query=collection').success(function (data) { 
    //   $scope.collections = data.map(function(c){
    //     return c._id;
    //   });
    // });
  };

  $scope.updateStars = function(){

    $http
      .get('/api/users/' + $scope.user._id)
      .success(function(data, status, headers, config){
        $scope.stars = data.starred;
      }).error(function(data, status, headers, config){
        $scope.stars = [];        
      });
  }

  $scope.showContent = function(){
    $scope.updateCollections();
    $scope.updateStars();
    
    socket.on('users/' + $scope.user._id, function (data) {
      $scope.updateStars();
    });

    $scope.$on('$destroy', function () {
      socket.close('users/' + $scope.user._id);
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
    $scope.collections = ['timeseries']
    // $http.get('/api/settings?query=collection').success(function (data) {
    //   $scope.collections = data.map(function(c){
    //     return c._id;
    //   });
    // });
  };

  if($scope.authenticated()){
    $scope.showContent();
  } else {
    $scope.showAuthentication();
  }
  
  $scope.signup = function() {

    // $scope.signinup = false;
            
    var authentication = { username: $scope.username, name: $scope.name, password: $scope.password, email: $scope.email };
    // delete $scope.username;
    // delete $scope.password;

    $scope.authenticating = true;

    $http
      .post('/signup', authentication)
      .success(function (data, status, headers, config) {
        $scope.signinup = false;
        $scope.login();
      })
      .error(function (data, status, headers, config) {
        $scope.authenticating = false;
        $scope.showAuthentication();
        $scope.error = "Sorry, try again (" + data+ ")";
        $('#login').addClass('animated wobble');
        $('#login').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
          $('#login').removeClass('animated wobble');
          $('#inputUsername').focus();
        });

        // messages.add('danger', 'Invalid username or password. Please try again.', { timeout: 5000 });
      });
  };

  $scope.login = function() {
            
    var authentication = { username: $scope.username, password: $scope.password };
    delete $scope.username;
    delete $scope.password;

    $scope.authenticating = true;

    $http
      .post('/login', authentication)
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
      .get('/status')
      .success(function(data, status, headers, config){
        console.log(data);
      }).error(function(data, status, headers, config){
        console.error(data);
      });
  }

  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="popover"]').popover()

}]);

