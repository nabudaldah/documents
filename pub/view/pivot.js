ctrl.controller('pivot', function ($scope, $http, $window, $location) {

  $scope.object = $location.path().split('/')[1];
  $scope.api  = '/v1/' + $scope.object;
  $scope.route = '/' + $scope.object;

  $scope.dimensions = [];
  $scope.aggregation = "COUNT";

  $http.get($scope.api + '/?query=template').success(function(list){
    for(var l in list){
      $http.get($scope.api + '/' + list[l]._id).success(function(template){
        if(template.template){
          console.log(template.template);
          for(key in template.template){
            var field = template.template[key].name;
            if($scope.dimensions.indexOf(field) == -1)
              $scope.dimensions.push(field);
          };              
        }
      });
    };
  });

  $scope.load = function(){

    if(!$scope.variable) delete $scope.row;
    if(!$scope.row)      delete $scope.column;

    if($scope.aggregation && $scope.variable)
      $scope.measure = $scope.aggregation + "(" + $scope.variable + ")";
    else delete $scope.measure;

    if($scope.measure){

      $scope.query = "The "
      switch($scope.aggregation.toString()) {
        case "COUNT": $scope.query += "total number"; break;
        case "SUM":   $scope.query += "total sum";    break;
        case "AVG":   $scope.query += "average";      break;
        case "MIN":   $scope.query += "minimum";      break;
        case "MAX":   $scope.query += "maximum";      break;
        default: break;
      }
      $scope.query += " of " + $scope.variable;
      if($scope.row    && $scope.row    != '') $scope.query += " per " + $scope.row
      if($scope.column && $scope.column != '') $scope.query += " and " + $scope.column

      $scope.data       = {};

      var url = "/v1/" + $scope.object + "/pivot?q=1";

      if($scope.row)     url += "&row="     + $scope.row;
      if($scope.column)  url += "&column="  + $scope.column
      if($scope.measure) url += "&measure=" + $scope.measure
      if($scope.where)   url += "&where="   + $scope.where;

      var query = {
        filters: [  ],
        aggregations: $scope.aggregation,
        dimensions: [$scope.row, $scope.column]
      }

      $http.get(url).success(function (data, status, headers, config) {
        $scope.data = data;
      });

    }

  };

  $scope.rebuild = function(){
    $scope.rebuilding = true;
    $http.get('/v1/' + $scope.object + '/pivot-update').success(function (data, status, headers, config) {
      if(status == 200){ $scope.load(); }
      else { console.log('failed to rebuild: ' + status)};
      $scope.rebuilding = false;
    });
  };

  //$scope.load();

});