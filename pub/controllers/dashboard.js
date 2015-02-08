ctrl.controller('dashboard', function ($scope, $http, $window, $location) {

  if($window.localStorage.user){
    $scope.user = JSON.parse($window.localStorage.user);

    $http.get('/v1/settings/' + $scope.user._id).success(function (data, status, headers, config) {
      if(data && data.starred){
        var reference = $scope.object + '/' + $scope.id;
        if(typeof(data.starred) == 'string') data.starred = data.starred.split(',');
        $scope.fetchStars(data.starred);
        $scope.ready = true;
      } else {
        $scope.ready = true;
      }
    });

    $scope.open = function(id){
      console.log(id);
      var path = $location.path() + '/' + id;
      var path = id;
      console.log(path);
      $location.path(path);
    }

    $scope.fetchStars = function(starred){

      $scope.list = [];

      starred.map(function(star){

        var typeMatch = star.match(/([^\/]+)/);
        if(!typeMatch) return null;
        var type = typeMatch[0];
        var idMatch = star.match(/([^\/]+)$/);
        if(!idMatch) return null;
        var id   = idMatch[0];

        var item = {type: type, _id: id};

        $http.get('/v1/' + item.type + '/' + item._id)
        .success(function (data, status, headers, config) {
          if(data){
            item._tags = data._tags || [];
            item.name = data.name || '';
            $scope.list.push(item);
          };
        }).error(function(data, status){
          $scope.unstar(star)
        });
      });

    };

    $scope.unstar = function(star){
      var reference = star;
      $http.get('/v1/settings/' + $scope.user._id).success(function (data) {
        if(data && data.starred){
          if(typeof(data.starred) == 'string') data.starred = data.starred.split(',');
          data.starred.splice(data.starred.indexOf(reference), 1);
          $http.put('/v1/settings/' + $scope.user._id, {starred: data.starred});
        }
      });
    };

  }






    $scope.remove = function(scope) {
      scope.remove();
    };

    $scope.toggle = function(scope) {
      scope.toggle();
    };

    $scope.moveLastToTheBegginig = function () {
      var a = $scope.data.pop();
      $scope.data.splice(0,0, a);
    };

    $scope.newSubItem = function(scope) {
      var nodeData = scope.$modelValue;
      nodeData.nodes.push({
        id: nodeData.id * 10 + nodeData.nodes.length,
        title: nodeData.title + '.' + (nodeData.nodes.length + 1),
        nodes: []
      });
    };

    var getRootNodesScope = function() {
      return angular.element(document.getElementById("tree-root")).scope();
    };

    $scope.collapseAll = function() {
      var scope = getRootNodesScope();
      scope.collapseAll();
    };

    $scope.expandAll = function() {
      var scope = getRootNodesScope();
      scope.expandAll();
    };

    $scope.data = [{
      "id": 1,
      "title": "node1",
      "nodes": []
    }];

});