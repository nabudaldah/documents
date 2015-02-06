/* Main controller */

// Token based authentication
// https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/
ctrl.controller('index',
  ['$scope', '$http', '$window', '$location', '$route', '$interval', 'messageCenterService',
  function ($scope, $http, $window, $location, $route, $interval, messageCenterService) {

  // $scope.authUser = "admin@localhost";
  // $scope.authPass = "admin";

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
  
  $scope.login = function() {
            
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
        messageCenterService.add('danger', 'Invalid username or password. Please try again.', { timeout: 5000 });
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

  // var statusInterval = 1000 * 60;
  // setInterval(function() {
  //   $scope.checkStatus();
  // }, statusInterval);

  setInterval(function(){
    $scope.checkStatus();
  }, 5000)

  $('[data-toggle="tooltip"]').tooltip();

}]);
