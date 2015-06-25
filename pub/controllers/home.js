ctrl.controller('home',
  ['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messages',
  function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messages) {

    $location.path('/' + $scope.user._id);
    console.log($scope.user._id)

    $scope.N     = 100;
    $scope.edit  = true;
    $scope.items = [];

    var dice1 = function(n){
      return(Math.round(1 + Math.random() * (n - 1)))
    }

    var indexDice = function(n){
      return(Math.round(Math.random() * (n - 1)))
    }

    $scope.addItem = function(itemId){
      $scope.items.push({
        id: itemId,
        columns: dice1(4),
        height: 100 * dice1(2),
        color: ["red", "green", "blue", "yellow", "purple" ][indexDice(5)]
      });
    }

    $scope.bindItem = function(itemId){

      // Anonymous function to copy itemId, instead of referencing it: credits: http://stackoverflow.com/a/5226333
      (function(itemId){
        setTimeout(function(){

          //Set the draggable elements
          $("#" + itemId).draggable({
            helper: 'clone',
            appendTo: 'body',
            start: function(){
              $(this).css({display: 'none'});
              $scope.dragging = itemById(this.id);
              $scope.$apply();
            },
            stop: function(){
              $(this).css({display: 'block'});
              $scope.squeezeBefore($scope.dragging, $scope.hovering);
              $scope.$apply();
            }
          });

          $("#" + itemId).droppable({
            over: function (event, ui) {
              // $(this).css('border', '1px solid red');
              $scope.hovering = itemById(this.id);
              $scope.previewBefore($scope.dragging, $scope.hovering);
              $scope.$apply();

            },
            out: function( event, ui ) {
              // $(this).css('border', '2px solid blue');
              $scope.$apply();
            }
          });

        }, 10);
      })(itemId);

    }

    var itemIndex = function(id){
      for(var i = 0; i < $scope.items.length; i++)
        if($scope.items[i].id == id) return(i);      
      return(null);
    }

    var itemById = function(id){
      var i = itemIndex(id);
      if(i != null) return($scope.items[i]);
      else return(null);
    }


    $scope.moveItem = function(fromId, toId){


      var fromIdx  = itemIndex(fromId);
      var fromItem = itemById(fromId);

      $scope.items.splice(fromIdx, 1);

      //var toIdx    = itemIndex(toId) + 1;
      var toIdx    = itemIndex(toId);
      $scope.items.splice(toIdx, 0, fromItem);


    }

    for(var i = 0; i < $scope.N; i++) {
      var itemId = 'nabi_' + i;
      $scope.addItem(itemId);
      $scope.bindItem(itemId);
    }


    $scope.previewBefore = function(dragging, hovering){
      $('.before-item').css('display', 'none');
      var before = $('#before-' + hovering.id);
      before.css('display', 'block');
      before.addClass('col-md-' + dragging.columns);
      before.css('height', dragging.height + 'px')
    }

    $scope.squeezeBefore = function(dragging, hovering){
      $scope.moveItem(dragging.id, hovering.id);
      $('.before-item').css('display', 'none');      
    }


  }]);
