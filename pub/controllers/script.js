ctrl.controller('script', function($scope, $routeParams, $http, $location, $window, socket, $timeout, messages) {

  $scope.user      = JSON.parse($window.localStorage.user || "{}");

  $scope.id  = $routeParams.id;
  $scope.collection = $location.path().split('/')[1];
  $scope.docRef = $scope.collection + '/' + $scope.id;
  $scope.docApi = '/api/' + $scope.docRef;
  $scope.docUrl = '/' + $scope.docRef;

  $scope.doc   = {};
  $scope.script = '';

  $scope.init = function(){

    var textarea = $('#editor').get(0);
    $scope.editor = CodeMirror.fromTextArea(textarea, { mode: "r", matchBrackets: false, lineNumbers: true, lint: false, tabSize: 2, gutters: [] });

    $scope.editor.setSize("100%", 400);

    $scope.editor.on('change', function(){
    if(!$scope.script) $scope.script = '';
      $scope.script = $scope.editor.getValue();
    });

    $scope.editor.on('blur', function(){
      // $scope.$apply();
    });

  }

  $scope.init();

  $scope.refresh = function(){  
    $http.get($scope.docApi).success(function (data, status, headers, config) {

      $('#main-panel').addClass('panel-update');
      $timeout(function(){
        $('#main-panel').removeClass('panel-update');
      }, 100)

      $scope.doc    = data;
      $scope.script = data['_script'];
      $scope.ready  = true;

      console.log(data)
      console.log($scope.script)
      $scope.editor.setValue($scope.script);

    });
  }

  // Load data
  $scope.refresh();

  $scope.compute = function(){
    $scope.message = "Computing..."
    $scope.computing = true;
    console.log($scope.script)
    var update = { '_script': '' + $scope.script };
    console.log(update)
    $http.put($scope.docApi, update)
      .success(function(data){
        $http.get($scope.docApi+'/compute/_script')
          .success(function(data, status, headers, config) {
            $scope.message = data;
            $scope.computing = false;
      })
          .error(function(data, status, headers, config){
            $scope.message = data;
            $scope.computing = false;
      });
    })
      .error(function(data, status, headers, config){
        $scope.message = "Error computing rscript on server."
        $scope.computing = false;
    });
  };

  $scope.insert = function(string){
    $scope.editor.replaceSelection(string);
  }


  $scope.close =function(){
    $location.path($scope.docUrl);
  }

  $scope.save = function(){
    $scope.message = "Saving script..."
    $scope.saving = true;
    console.log($scope.script)
    var update = { '_script': '' + $scope.script };
    console.log(update)
    $http.put($scope.docApi, update).success(function(data){
        $scope.message = 'Saved script!';
        $scope.saving = false;
    }).error(function(data, status, headers, config){
        $scope.message = "Error saving!"
        $scope.saving = false;
    });
  }

  $scope.form = function(){
    $location.path('/' + $scope.collection + '/' + $scope.id);
  }

  socket.on($scope.docRef, function (data) {
    $scope.refresh();
  });

  $scope.$on('$destroy', function () {
    socket.close($scope.docRef);
    $scope.doc = null;
  });

});
