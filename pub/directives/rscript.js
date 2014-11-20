app.directive('rscript', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    if(!scope.ngModel) scope.ngModel = '';

    scope.compute = function(){
      scope.message = 'Computing...'
      scope.computing = true;
      var update = {};
      update[attr.script] = scope.ngModel.toString();
      $http.put('/v1/'+attr.col+'/'+attr.id, update)
      .success(function(result) {
        $http.get('/v1/'+attr.col+'/'+attr.id+'/compute/' + attr.script)
        .success(function(result) {
          scope.message   = result;
          scope.computing = false;
        })
        .error(function(result){
          scope.message   = result;
          scope.computing = false;
        });
      })
      .error(function(result){
        scope.message   = result;
        scope.computing = false;
      });
    };

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) {
        element.find('select, button, input').attr("disabled", "disabled");
      } else {
        element.find('select, button, input').removeAttr("disabled");
      }
    };

    scope.$watch('ngDisabled', ngDisabledChanged, true);

    ngDisabledChanged();

    $('[data-toggle="tooltip"]').tooltip();
  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/directives/rscript.html',
      scope: { ngModel: '=', ngDisabled: '=', col: '@col', id: '@id', script: '@script' },
      transclude: true,
      link: link
  };

  return directive;

});
