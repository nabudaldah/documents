app.directive('rscript', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    if(!scope.ngModel) scope.ngModel = {
      script: '',
      schedule: null
    };

    var input = element.find('input#rscript');
    input.change(function(event){
      scope.ngModel = input.val();
      scope.$apply();
    });

    var button = element.find('button#compute');
    button.click(function(event){
      var update = {}
      var input = element.find('input#rscript');
      var script = input.val();
      update[attr.script] = script;
      $http.put('/v1/'+attr.col+'/'+attr.id, update).success(function(result) {
        $http.get('/v1/'+attr.col+'/'+attr.id+'/compute/' + attr.script).success(function(result) {
          console.log(result);
          scope.message = result;
          // scope.popoverTrigger = "click";
        });
      });

    });

    var ngModelChanged = function(){
      var input = element.find('input#rscript');
      input.val(scope.ngModel);
    }

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) {
        element.find('select, button, input').attr("disabled", "disabled");
      } else {
        element.find('select, button, input').removeAttr("disabled");
      }
    };

    scope.$watch('ngModel',    ngModelChanged,    true);
    scope.$watch('ngDisabled', ngDisabledChanged, true);

    ngModelChanged();
    ngDisabledChanged();

  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/comp/rscript.html',
      scope: { ngModel: '=', ngDisabled: '=', col: '@col', id: '@id', script: '@script' },
      transclude: true,
      link: link
  };

  return directive;

});
