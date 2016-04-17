app.directive('reference', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    $(function () { $('[data-toggle="tooltip"]').tooltip() })

    scope.col   = attr.col;
    scope.name  = attr.name;
    scope.id    = attr.id;
    scope.limit = 10;

    scope.select = function(item){
      scope.ngModel = item;
      scope.editing = false;
      scope.limit   = 10;
    }

    scope.more = function(){
      scope.limit = scope.limit + 10;
      scope.search();
    }

    scope.search = function(){

      $http.get('/api/' + scope.col + '/?query=' + scope.ngModel + '&limit=' + scope.limit)
        .success(function (data) { 
          scope.limit   = 10;
          scope.results = data;
          if(!data) { scope.results = []; return; }
        });
    };

    scope.search();

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) {
        element.find('select, button, input').attr("disabled", "disabled");
      } else {
        element.find('select, button, input').removeAttr("disabled");
      }
    };
    scope.$watch('ngDisabled', ngDisabledChanged, true);
    ngDisabledChanged();

  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/directives/reference.html',
      scope: { ngModel: '=', ngDisabled: '=', col: '@col', id: '@id', name: '@name' },
      transclude: true,
      link: link
  };

  return directive;

});
