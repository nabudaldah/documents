ctrl.controller('pivot', function ($scope, $http, $window, $location, messages) {

  $scope.object = $location.path().split('/')[1];
  $scope.api  = '/api/' + $scope.object;
  $scope.route = '/' + $scope.object;

  $scope.dimensions = [];
  $scope.selection = []
  $scope.aggregation = "COUNT";

  $scope.gridOptions = { data: null }

  $http.get($scope.api + '/?query=template').success(function(list){
    for(var l in list){
      $http.get($scope.api + '/' + list[l]._id).success(function(template){
        if(template._template){
          for(key in template._template){
            var field = template._template[key].name;
            if($scope.dimensions.indexOf(field) == -1){
              $scope.dimensions.push(field);
              $scope.selection.push(field);
            }
          };
        }
      });
    };
  });

  $scope.filter = function(){
    $scope.selection = []
    $scope.dimensions.map(function(dimension){
      if(dimension.match($scope.search)) $scope.selection.push(dimension)
    })
  }

  $scope.group = []
  $scope.measures = []

  $scope.addGroup = function(item){
    $scope.group.push(item);
    $scope.load();
  }

  $scope.removeGroup = function(item){
    var idx = $scope.group.indexOf(item)
    if(idx >= 0) $scope.group.splice(idx, 1);
    $scope.load();
  }

  $scope.addMeasure = function(item){
    $scope.measures.push(item);
    $scope.load();
  }

  $scope.removeMeasure = function(item){
    var idx = null;
    $scope.measures.map(function(measure, i){ if(measure[0] == item[0] && measure[1] == item[1]) idx = i; })
    if(idx != null) $scope.measures.splice(idx, 1);
    $scope.load();
  }

  $scope.load = function(){

    $scope.data = {};

    var url = "/api/" + $scope.object + "/pivot";

    var query = { measures: $scope.measures, by: $scope.group }

    $http.post(url, query)
    .success(function (data, status, headers, config){
      var columns = [];
      var flat = [];
      console.log(status)
      console.log(data)
      if(data && data.length){
        data.map(function(item){
          var record = {}
          for(key in item._id) { record[key] = item._id[key]; columns.push(key) }
          for(key in item) if(key != '_id') { record[key] = item[key]; columns.push(key) }
          flat.push(record)
        })        
      }
      $scope.data = flat;
      $scope.dataFmt = JSON.stringify($scope.data, null, 2)
      columns = _.unique(columns)
      var columnDefs = columns.map(function(column){ return({ field: column })})
      console.log(columnDefs)
      // $scope.gridOptions = { data: [{ a: 'a1', b: 'b1' }, { a: 'a2', b: 'b2' }], columnDefs: [{field: 'a'}, {field:'b'}] }
      $scope.gridOptions = { data: JSON.parse(JSON.stringify(flat)), columnDefs: columnDefs }

    }).error(function (data, status, headers, config){
      messages.add('danger', 'Error fetching pivot');
      console.log(data)
    });

  };

});