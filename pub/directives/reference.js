app.directive('reference', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    scope.name = attr.name;

    scope.select = function(item){
      var parts = scope.ngModel.split('/');
      parts[parts.length - 1] = item;
      scope.ngModel = parts.join('/');
      // if(p.length < 3) scope.ngModel = scope.ngModel + '/'
      scope.search();
    }

    scope.search = function(){

      var parts = scope.ngModel.split('/');

      var collection = parts[0];
      var object     = parts[1];
      var field      = parts[2];

      if(parts.length == 3){
        scope.level = 'fields';
        $http.get('/v1/' + collection + '/' + object)
          .success(function (data) { 
            scope.results = [];
            if(!data || !data._template) return;
            data._template.map(function(item){
              if((new RegExp(field)).test(item.name))
                scope.results.push(item.name);
            });
          });
        return;
      };

      if(parts.length == 2){
        scope.level = 'documents';
        $http.get('/v1/' + collection + '?query=' + object + '&limit=10')
          .success(function (data) { 
            scope.results = data.map(function(c){ return c._id; });
          });
        return;
      };

      scope.level = 'collections';
      $http.get('/v1/settings?query=collection')
        .success(function (data) { 
          scope.results = [];
          if(!data) return;
          data.map(function(item){
            if((new RegExp(collection)).test(item._id))
              scope.results.push(item._id);
          });
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
      scope: { ngModel: '=', ngDisabled: '=' },
      transclude: true,
      link: link
  };

  return directive;

});
