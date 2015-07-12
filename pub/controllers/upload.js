ctrl.controller('upload',
  ['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messages', 'Upload',
  function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messages, Upload) {

    $scope.user      = JSON.parse($window.localStorage.user || "{}");

    $scope.id         = $routeParams.id;
    $scope.collection = $location.path().split('/')[1];
    $scope.reference  = $scope.collection + '/' + $scope.id;
    $scope.api        = '/api/' + $scope.reference;

    $scope.$watch('files', function () {
        $scope.upload($scope.files);
        console.log('watch files!')
    });

    $scope.data = null
    // $scope.file = { name: "Upload.xlsx", size: 15323, rows: 1203, columns: 7 }

    $scope.upload = function (files) {
        if (files && files.length) {
            $scope.status = "Uploading data..."
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                Upload.upload({
                    url: '/api/' + $scope.collection + '/upload',
                    // fields: {'username': $scope.username},
                    file: file
                }).progress(function (evt) {
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                    console.log('progress: ' + progressPercentage + '% ' + evt.config.file.name);
                    $scope.progress = progressPercentage
                }).success(function (data, status, headers, config) {
                    //console.log('file ' + config.file.name + 'uploaded. Response: ' + data);
                    console.log('file ' + config.file.name + 'uploaded succes.');
                    $scope.file = config.file;
                    console.log(config)
                    console.log(config.file)
                    // $scope.data = data
                    console.log(data);
                    var columns = []
                    for(c in data[0]) columns.push(c)
                    console.log(columns)
                    var rows = data //.slice(1).map(function(row){ var obj = {}; for(var i = 0; i < columns.length; i++) obj[columns[i]] = row[i]; return(obj) })
                    console.log(rows)
                    $scope.data = rows
                    $scope.columns = columns
                    $scope.file.rows = rows.length
                    $scope.file.columns = columns.length
                    $scope.status = "Succesfully uploaded data."
                }).error(function (data, status, headers, config) {
                    $scope.status = "Failed to upload data (!)."
                    console.log('error status: ' + status);
                });
            }
        }
    };

    $scope.save = function (){

        $scope.status = "Saving ..."

        var extractTags = function(obj){
            var tags = JSON.parse(JSON.stringify($scope.tags));
            tags.push(obj._id.toString())
            for(key in obj){
                var str = obj[key].toString().toLowerCase();
                var strTags = str.split(/[^a-z0-9-_]/)
                strTags.map(function(tag){ if(tag != "") tags.push(tag)})
            }
            return(_.unique(tags))
        }

        var idcolumn = false;
        if(_.uniq($scope.data.map(function(obj){ return obj[$scope.columns[0]] })).length == $scope.data.length)
            idcolumn = true;
        var data = $scope.data.map(function(obj, k, m){
            if(idcolumn) obj._id = obj[$scope.columns[0]];
            else obj._id = uuid().split('-')[0];
            obj._tags = extractTags(obj)
            $scope.progress = Math.ceil((k + 1) / m.length * 100)
            return(obj)
        })

        var id;
        if($scope.tags && $scope.tags.length)
            id = 'upload_' + $scope.tags.join('_');
        else
            id = 'upload_' + uuid().split('-')[0]
        var tags;
        if($scope.tags && $scope.tags.length)
            tags = JSON.parse(JSON.stringify($scope.tags));
        else tags = []
        tags.push('template')
        var template = $scope.columns.map(function(column){ return ({type: 'text', name: column })})
        var templateObject = { _id: id, _tags: tags, _template: template }
        data.push(templateObject)

        var url = '/api/' + $scope.collection;
        $http.post(url, data)
        .success(function (data, status, headers, config){
            $scope.saved = true
            $scope.status = "Succesfully saved data."
        }).error(function (data, status, headers, config){
            $scope.saved = false
            $scope.status = "Failed to save data (!)."
          messages.add('danger', 'Error saving data');
        });

    }

    $scope.clear = function(){
        $scope.data = null;
        $scope.columns = null;
        $scope.file = null;
        $scope.progress = 0;
        $scope.status = "Reset upload."
        $scope.saved = false
    }

    $scope.undo = function(){
        // $http.delete ( ... )
    }

    $scope.accept = function(){
        var url = '/' + $scope.collection;
        $location.path(url);
    }

  }]);
