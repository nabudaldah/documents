ctrl.controller('list', function ($scope, $http, $window, $location, socket, messages) {

  $scope.object = $location.path().split('/')[1];
  $scope.api  = '/v1/' + $scope.object;
  $scope.route = '/#/' + $scope.object;

  $scope.query = $window.localStorage.query || '';

  $scope.col = parseInt($window.localStorage.col) || 3;

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

  $scope.load = function(){
    var url = $scope.api + '/?query=' + $scope.query + '&limit=24';
    $http.get(url).success(function(data) { 
      $scope.list = data;
      $scope.colInit();
    }).error(function(error){
      messages.add('danger', 'Error retrieving list of collection "' + $scope.object + '": ' + JSON.stringify(error, undefined, 2));
    });
  };

  $scope.search = function(){
    $window.localStorage.query = $scope.query;
    $scope.selected = [];
    $scope.load();
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
    if($scope.selected.length){
      $scope.selected.map(function(id){
        $http.delete($scope.api + '/' + id).success(function(){
          $scope.selected.splice($scope.selected.indexOf(id), 1);      
        });
      })
    }
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

  var url = '/v1/' + $scope.object + '/?query=template&limit=24';
  $http.get(url).success(function(data) { $scope.templates = data; });

  $scope.new = function(template){
    var url = '/' + $scope.object + '/new/' + template;
    $location.path(url);
  }

  socket.on($scope.object, function (data) {
    $scope.refresh();
  });

  $scope.$on('$locationChangeStart', function (event, next, current) {
    socket.close($scope.object);
  });

  $scope.refresh = function(){
    $scope.load();
  }

});