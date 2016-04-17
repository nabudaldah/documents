ctrl.controller('upload',
  ['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messages', 'Upload',
  function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messages, Upload) {

    $scope.user      = JSON.parse($window.localStorage.user || "{}");

    $scope.id         = $routeParams.id;
    $scope.collection = $location.path().split('/')[1];
    $scope.reference  = $scope.collection + '/' + $scope.id;
    $scope.api        = '/api/' + $scope.reference;

    // Sensible defaults
    $scope.options = { tags: true, parse: true, trim: true }


    $scope.$watch('files', function () {
        $scope.upload($scope.files);
        console.log('watch files!')
    });

    $scope.data = null
    // $scope.file = { name: "Upload.xlsx", size: 15323, rows: 1203, columns: 7 }

    var copy = function(obj){
        return(JSON.parse(JSON.stringify(obj)))
    }

    var tokenize = function(str){ if(typeof(str) == "string") return(str.replace(/\s+/g, '_').replace(/\W+/g, '')); else return(str) }

    var tokenizeDocuments = function(documents){
        return(documents.map(function(doc){
            for(oldKey in doc){
                var newKey = tokenize(oldKey)
                if(newKey != oldKey) {
                    doc[newKey] = copy(doc[oldKey]);
                    delete doc[oldKey]
                    console.log('old: '+oldKey+', new: ' + newKey)
                }
            }
            return(doc)
        }))
    }

    $scope.upload = function (file) {
        console.log('received file for upload: ')
        console.log(file)
        if (file) {
            $scope.status = "Uploading data..."
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
                var tokenizedData = tokenizeDocuments(copy(data));
                console.log(tokenizedData);
                var columns = []
                for(c in tokenizedData[0]) columns.push(c)
                console.log(columns)
                var rows = tokenizedData //.slice(1).map(function(row){ var obj = {}; for(var i = 0; i < columns.length; i++) obj[columns[i]] = row[i]; return(obj) })
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
    };

    $scope.save = function (){

        $scope.status = "Saving ..."

        var isNumeric = function(str){
            return((/^\d+$/).test(str.toString()) || (/^\d+\.\d+$/).test(str.toString()))
        }

        var extractTags = function(obj){
            var tags = [];
            if($scope.tags) tags = JSON.parse(JSON.stringify($scope.tags));
            // tags.push(obj._id.toString())
            for(key in obj){
                var str = obj[key].toString().toLowerCase().trim();
                var strTags = str.split(/[^a-z0-9-_]/)
                strTags.map(function(tag){ if(tag != "" && tag.length > 1 && !isNumeric(tag)) tags.push(tag)})
            }
            return(_.unique(tags))
        }

        var idcolumn = false;
        if(_.uniq($scope.data.map(function(obj){ return obj[$scope.columns[0]] })).length == $scope.data.length)
            idcolumn = true;

        var templateId;
        if($scope.tags && $scope.tags.length)
            templateId = $scope.tags.join('_');
        else
            templateId = uuid().split('-')[0]
        var tags;
        if($scope.tags && $scope.tags.length)
            tags = JSON.parse(JSON.stringify($scope.tags));
        else tags = []
        tags.push('template')
        var template = $scope.columns.map(function(column){ return ({type: 'text', name: column })})
        var templateObject = { _id: templateId, _tags: tags, _template: template }

        var data = $scope.data.map(function(obj, i, m){
            if($scope.options.trim) for(k in obj) obj[k] = obj[k].toString().trim();
            if($scope.options.parse) for(k in obj) {
                if(isNumeric(obj[k].toString())){
                    obj[k] = parseFloat(obj[k].toString())
                }
            }
            if(idcolumn) obj._id = tokenize(obj[$scope.columns[0]]);
            else obj._id = uuid().split('-')[0];
            obj._tags = []
            obj._template = templateId;
            if($scope.tags) obj._tags = obj._tags.concat(JSON.parse(JSON.stringify($scope.tags)));
            if($scope.options.tags) obj._tags = obj._tags.concat(extractTags(obj))
            obj._tags.push('template:' + templateId)
            $scope.progress = Math.ceil((i + 1) / m.length * 90)
            console.log($scope.progress)
            return(obj)
        })

        data.push(templateObject)

        var url = '/api/' + $scope.collection;
        $http.post(url, data)
        .success(function (data, status, headers, config){
            $scope.saved = true
            $scope.status = "Succesfully saved data."
            $scope.progress = 100
            $scope.accept()
        }).error(function (data, status, headers, config){
            $scope.saved = false
            $scope.progress = 0
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
