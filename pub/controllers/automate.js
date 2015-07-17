ctrl.controller('automate',
  ['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messages',
  function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messages) {

    $scope.user      = JSON.parse($window.localStorage.user || "{}");

    $scope.id         = $routeParams.id;
    $scope.collection = $location.path().split('/')[1];
    $scope.reference  = $scope.collection + '/' + $scope.id;
    $scope.api        = '/api/' + $scope.reference;

    $scope.hour = [
        { name: 'Get latest price data from www.tomatotrade.com' },
        { name: 'Optimize intra-day trading' }
    ]
    $scope.day  = [
        { name: 'Email the best course of action to all farmers based on today\'s weather', at: '6:30'}
    ]
    $scope.week = [
        { name: 'Create weekly investors report and email it', at: 'Friday\'s at 18:00' }
    ]


    $scope.hourAdd = function(){
        console.log('hourAdd')
        $scope.hour.push({ name: Math.random() } )
    }

    $scope.dayAdd = function(){
        console.log('dayAdd')
        $scope.day.push({ name: Math.random(), at: '13:00' } )
    }

    $scope.weekAdd = function(){
        console.log('weekAdd')
        $scope.week.push({ name: Math.random(), at: 'Friday\'s at 17:00' } )
    }

    $scope.hourSave = function(){
        console.log('hourSave')
        $scope.hour.push({ name: $scope.new.hour.name, script: $scope.new.hour.script })
    }

  }]);
