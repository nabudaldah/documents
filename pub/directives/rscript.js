app.directive('rscript', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    var id = uuid()
    element.find('textarea').attr('id', id)
    var editor = CodeMirror.fromTextArea(document.getElementById(id), {
      //mode: "r",
      matchBrackets: false,
      lineNumbers: true,
      lint: false,
      tabSize: 2,
      gutters: []
    });

    editor.setSize("100%", 400);

    editor.on('change', function(){
    if(!scope.ngModel) scope.ngModel = '';
      scope.ngModel = editor.getValue();
    });

    editor.on('blur', function(){
      // scope.$apply();
    });

    scope.name = attr.script;

    scope.compute = function(){
      scope.message = "Computing..."
      scope.computing = true;
      var update = {};
      update[attr.script] = scope.ngModel;
      $http.put('/api/'+attr.col+'/'+attr.id, update)
        .success(function(data){
          $http.get('/api/'+attr.col+'/'+attr.id+'/compute/' + attr.script)
            .success(function(data, status, headers, config) {
              scope.message = data;
              scope.computing = false;
        })
            .error(function(data, status, headers, config){
              scope.message = data;
              scope.computing = false;
        });
      })
        .error(function(data, status, headers, config){
          scope.message = "Error computing rscript on server."
          scope.computing = false;
      });
    };

    scope.insert = function(string){
      editor.replaceSelection(string);
    }

    var ngModelChanged = function(){
      if(scope.ngModel)
        editor.setValue(scope.ngModel);
    }

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) {
        element.find('select, button, textarea').attr("disabled", "disabled");
      } else {
        element.find('select, button, textarea').removeAttr("disabled");
      }
    };

    scope.$watch('ngModel',    ngModelChanged,    true);
    scope.$watch('ngDisabled', ngDisabledChanged, true);

    ngModelChanged();
    ngDisabledChanged();

    scope.$on('$destroy', function() {
      editor = undefined;
    });

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
