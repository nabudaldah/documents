app.directive('javascript', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    var id = uuid()
    element.find('textarea').attr('id', id)
    var editor = CodeMirror.fromTextArea(document.getElementById(id), {
      mode: "javascript",
      matchBrackets: true,
      lineNumbers: true,
      lint: true,
      tabSize: 2,
      gutters: ["CodeMirror-lint-markers", "errors"]
    });

    editor.setSize("100%", 130)

    editor.on('change', function(){
      if(!scope.ngModel) scope.ngModel = { javascript: '' }
      scope.ngModel.javascript = editor.getValue();

      editor.clearGutter('errors');

      JSHINT("/*jshint strict:true */\n" + editor.getValue());
      for (var i = 0; i < JSHINT.errors.length; ++i) {
        var err = JSHINT.errors[i];
        if (!err) continue;
        // var warning = document.createElement('div');
        var warning = document.createTextNode('>');
        // console.log(err)
        // warning.innerHTML = '<div style="position: absolute"></div>';
        // warning.appendChild(document.createTextNode(err.reason));
        editor.setGutterMarker(err.line - 2, "errors", warning);
        // editor.setBookmark({ line: err.line, ch: err.character}, {widget: warning})
      }

    });

    scope.name = attr.script;

    scope.execute = function(){
      var update = {};
      update[attr.script] = scope.ngModel;
      $http.put('/v1/' + attr.col + '/' + attr.id, update).success(function(data){
        $http.get('/v1/'+attr.col+'/'+attr.id+'/execute/' + attr.script).success(function(result) {
        });
      });
    }

    scope.reschedule = function(){
      if(scope.ngModel.runEvery) {
        var schedules = {
          "d" :  { recurs: true, year: null, month: null, date: null, dayOfWeek: null, hour:    0, minute:    0, second:    0 },
          "h" :  { recurs: true, year: null, month: null, date: null, dayOfWeek: null, hour: null, minute:    0, second:    0 },
          "m" :  { recurs: true, year: null, month: null, date: null, dayOfWeek: null, hour: null, minute: null, second:    0 },
          "5s" : { recurs: true, year: null, month: null, date: null, dayOfWeek: null, hour: null, minute: null, second: [0,5,10,15,20,25,30,35,40,45,50,55] }
        };
        scope.ngModel.schedule = schedules[scope.ngModel.runEvery];
      } else {
        delete scope.ngModel.schedule;
      }
      var update = {};
      update[attr.script] = scope.ngModel;
      $http.put('/v1/' + attr.col + '/' + attr.id, update).success(function(data){
        $http.get('/v1/' + attr.col + '/' + attr.id + '/schedule/' + attr.script).success(function(data){
          console.log('rescheduled')
        });
      });
    }

    var ngModelChanged = function(){
      if(scope.ngModel && scope.ngModel.javascript)
        editor.setValue(scope.ngModel.javascript);
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

  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/dir/javascript.html',
      scope: { ngModel: '=', ngDisabled: '=', col: '@col', id: '@id', script: '@script' },
      transclude: true,
      link: link
  };

  return directive;

});
