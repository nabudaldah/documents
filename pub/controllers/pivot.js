ctrl.controller('pivot', function ($scope, $http, $window, $location, messages) {

  $scope.object = $location.path().split('/')[1];
  $scope.api  = '/api/' + $scope.object;
  $scope.route = '/' + $scope.object;

  $scope.gridOptions = { data: null }

  $http.get($scope.api + '/?query=template').success(function(list){
    $scope.templates = list.map(function(template){ return(template._id) });
    $scope.updateFields()
  });

  $scope.toggleSearch = function(){
    $scope.showSearch = (!$scope.showSearch)
    console.log($scope.showSearch)
  }

  $scope.showMaxFields = 5

  $scope.updateFields = function(){
    $scope.dimensions = [];
    $scope.selection = []
    for(var id in $scope.templates){
      if(($scope.template && $scope.template + '' == $scope.templates[id] + '') || !$scope.template)
        $http.get($scope.api + '/' + $scope.templates[id]).success(function(template){
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
  }

  $scope.$watch('tags', function(newValue, oldValue) {
    $scope.load()
  }, true);

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

    if($scope.tags && $scope.tags.length) query.tags = $scope.tags;

    $http.post(url, query)
    .success(function (data, status, headers, config){
      var columnsGroup   = [];
      var columnsMeasure = [];
      var flat = [];
      console.log(status)
      console.log(data)
      if(data && data.length){
        data.map(function(item){
          var record = {}
          for(key in item._id) { record[key] = item._id[key]; columnsGroup.push(key) }
          for(key in item) if(key != '_id') { record[key] = item[key]; columnsMeasure.push(key) }
          flat.push(record)
        })        
      }
      $scope.data = flat;
      $scope.dataFmt = JSON.stringify($scope.data, null, 2)
      columnsGroupUnique   = _.unique(columnsGroup)
      columnsMeasureUnique = _.unique(columnsMeasure)
      var columnDefsGroup    = columnsGroupUnique.map(  function(column){ return({ field: column })})
      var columnDefsMeasures = columnsMeasureUnique.map(function(column){ return({ field: column, cellFilter: 'number', cellClass: 'grid-align' })})
      var columnDefs = columnDefsGroup.concat(columnDefsMeasures)
      // $scope.gridOptions = { data: [{ a: 'a1', b: 'b1' }, { a: 'a2', b: 'b2' }], columnDefs: [{field: 'a'}, {field:'b'}] }
      $scope.gridOptions = { data: JSON.parse(JSON.stringify(flat)), columnDefs: columnDefs }

    }).error(function (data, status, headers, config){
      messages.add('danger', 'Error fetching pivot');
      console.log(data)
    });

  };

});