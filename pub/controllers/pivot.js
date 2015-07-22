ctrl.controller('pivot', function ($scope, $http, $window, $location, messages) {

  $scope.collection = $location.path().split('/')[1];
  $scope.api  = '/api/' + $scope.collection;
  $scope.route = '/' + $scope.collection;

// ({ by: $scope.group.join(','), measures: $scope.measures.map(function(m){return(m[0] + '(' + m[1] + ')')}).join(',') });
  // console.log()

  $scope.group = []
  $scope.measures = []

  if($location.search().by){
    $scope.group = $location.search().by.split(',')
    console.log($scope.group)    
  }

  if($location.search().measures){
    $scope.measures = $location.search().measures.split(',').map(function(str){
      var aggregation = str.match(/sum|avg|min|max/)[0]
      var field = str.match(/\(([\w]+)\)/)[1]
      return([aggregation,  field])
    })
    console.log($scope.measures)    
  }

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

    var url = "/api/" + $scope.collection + "/pivot";

    var query = { by: $scope.group, measures: $scope.measures }
    $scope.query = query

    if($scope.tags && $scope.tags.length) query.tags = $scope.tags;

    $location.search({ by: $scope.group.join(','), measures: $scope.measures.map(function(m){return(m[0] + '(' + m[1] + ')')}).join(',') });

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

  $scope.savePivot = function(){
    console.log('savePivot()')
    var id = 'pivot-' + uuid().split('-')[0]
    var obj = {
      _id: id,
      _tags: ['pivot'],
      _tags: ['date:' + moment().format('YYYY-MM-DD'), 'time:' + moment().format('HH:mm')],
      _template: [
        { name: 'table', type: 'table' },
        { name: 'query',  type: 'json' }
      ],
      table: $scope.data,
      query: $scope.query
    }
    console.log(obj)
    
    $http.post('/api/' + $scope.collection + '/' + id, obj)
    .success(function (data, status, headers, config){
      // all ok
      console.log('pivot saved')
      $scope.message = "Pivot saved as document '" + id + "'"
      $scope.savedId = id
    }).error(function (data, status, headers, config){
      messages.add('danger', 'Error saving doc "' + id + '".');
    });
  }

});