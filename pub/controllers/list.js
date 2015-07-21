ctrl.controller('list',
  ['$scope', '$http', '$window', '$location', 'socket', 'messages', '$timeout',
  function ($scope, $http, $window, $location, socket, messages, $timeout) {

  $scope.object = $location.path().split('/')[1];
  $scope.api  = '/api/' + $scope.object;
  $scope.route = '/#/' + $scope.object;
  $scope.query = $location.search()['query']
  if(!$scope.query) $scope.query = ''

  //$scope.query = $window.localStorage.query || '';

  $scope.col = parseInt($window.localStorage.col) || 3;

  $scope.open = function(id){
    console.log(id);
    var path = $location.path() + '/' + id;
    console.log(path);
    $location.path(path);
  }

  $scope.colInit = function(){
    setTimeout(function(){
      $('.col-var').removeClass('col-sm-3');
      $('.col-var').addClass('col-sm-' + $scope.col);
    }, 0 )
  }

  // 1, 2, 3, 4, 6, 12
  $scope.colDown = function(){
    var oldCol = $scope.col;
    $scope.col = { '2': 2, '3': 2, '4': 3, '6': 4, '12': 6 }[$scope.col];
    var newCol = $scope.col;
    $window.localStorage.col = $scope.col;
    $('.col-var').removeClass('col-sm-' + oldCol);
    $('.col-var').addClass('col-sm-' + newCol);
  }

  $scope.colUp = function(){
    var oldCol = $scope.col;
    $scope.col = { '2': 3, '3': 4, '4': 6, '6': 12, '12': 12 }[$scope.col];
    var newCol = $scope.col;
    $window.localStorage.col = $scope.col;
    $('.col-var').removeClass('col-sm-' + oldCol);
    $('.col-var').addClass('col-sm-' + newCol);
  }

  $scope.loadImmediate = function(){
    if(!$scope.query) $scope.query = ''
    var url = $scope.api + '/?query=' + $scope.query + '&limit=24';
    $http.get(url).success(function(data) { 
      $scope.list = data;
      $scope.colInit();
      if(!$scope.list.length) $scope.start = true;
    }).error(function(error){
      messages.add('danger', 'Error retrieving list of collection "' + $scope.object + '": ' + JSON.stringify(error, undefined, 2));
    });

    var url = $scope.api + '?count=true';
    $http.get(url).success(function(data) { 
      $scope.totalCount = data.count;
    }).error(function(error){
      console.log(error);
      messages.add('danger', 'Error retrieving count of collection "' + $scope.object + '": ' + JSON.stringify(error, undefined, 2));
    });

    var url = $scope.api + '/?count=true&query=' + $scope.query;
    $http.get(url).success(function(data) { 
      $scope.queryCount = data.count;
    }).error(function(error){
      console.log(error);
      messages.add('danger', 'Error retrieving query result count of collection "' + $scope.object + '": ' + JSON.stringify(error, undefined, 2));
    });

  };

  $scope.loading = null
  $scope.load = function(){
    if($scope.loading) {
      $timeout.cancel($scope.loading)
    }
    $scope.loading = $timeout($scope.loadImmediate, 100);
  }

  $scope.search = function(){

    $window.localStorage.query = $scope.query;
    $scope.selected = [];
    $scope.load();
    $location.search({ query: $scope.query });
  };

  $scope.selected = [];
  $scope.select = function(id){
    if($scope.selected.indexOf(id) == -1){
      $scope.selected.push(id);
    } else {
      $scope.selected.splice($scope.selected.indexOf(id), 1);      
    }
  }

  $scope.delete = function(){
    $http.delete($scope.api + '?query=' + $scope.query)
      .success(function(data){
        $scope.load()
      }).error(function(error){
        $scope.load()
      });
  }

  $scope.load();

  $scope.loadmore = function(){
    if($scope.list && $scope.list.length){
      var url = $scope.api + '/?query=' + $scope.query + '&skip=' + $scope.list.length + '&limit=24';
      $http.get(url).success( function (data) { 
        $scope.list = $scope.list.concat(data); 
        $scope.colInit(); 
      }).error(function(error){
        messages.add('danger', 'Error retrieving list of collection "' + $scope.object + '": ' + JSON.stringify(error, undefined, 2));
      });
    }
  }

  var url = '/api/' + $scope.object + '/?query=template&limit=24';
  $http.get(url).success(function(data) { $scope.templates = data; });

  $scope.new = function(template){
    var url = '/' + $scope.object + '/new/' + template;
    $location.path(url);
  }

  socket.on($scope.object, function (data) {
    $scope.refresh();
  });

  // $scope.$on('$locationChangeStart', function (event, next, current) {
  // });

  $scope.$on("$destroy", function() {
    // console.log('list.js: destroy');
    socket.close($scope.object);
    // scrollHandler.off();
  });


  $scope.refresh = function(){
    $scope.load();
  }

  // var scrollHandler = $(window).scroll(function () {
  //    if ($(window).scrollTop() >= $(document).height() - $(window).height() - 10) {
  //       $scope.loadmore();
  // 			$scope.$apply();
  //    }
  // });


}]);