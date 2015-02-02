
/* Modules */
// var app = angular.module('app', ['ngRoute','ctrl', 'infinite-scroll', 'ui.bootstrap', 'messages', 'ui.tree']);
var app = angular.module('app', [
  'ngRoute',
  'ctrl',
  'MessageCenterModule',
  'infinite-scroll'
]);

var ctrl = angular.module('ctrl', []);

/* Routes (Views and Controllers) */
app.config(['$routeProvider', function($routeProvider) { $routeProvider


  .when('/',          { templateUrl: '/views/home.html', controller: 'home' })

  .when('/error/0',   { template: '<div class="jumbotron"><h1>Connection lost</h1><p>Please try again later.</p></div>' })
  .when('/error/401', { template: '<div class="jumbotron"><h1>Unauthorized</h1><p>Please login.</p></div>' })

  .when('/:collection',               { templateUrl: '/views/list.html',  controller: 'list' })
  .when('/:collection/pivot',         { templateUrl: '/views/pivot.html', controller: 'pivot'})
  .when('/:collection/new',           { templateUrl: '/views/edit.html',  controller: 'edit' })
  .when('/:collection/new/:template', { templateUrl: '/views/edit.html',  controller: 'edit' })
  .when('/:collection/:id',           { templateUrl: '/views/edit.html',  controller: 'edit' })
  .when('/:collection/:id/raw',       { templateUrl: '/views/raw.html' ,  controller: 'raw'  })

  .otherwise({ redirectTo: '/'});

}]);

/* Relative time filter */
// Credits: http://stackoverflow.com/questions/14774486/use-jquery-timeago-or-momentjs-and-angularjs-together
app.filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  }
});