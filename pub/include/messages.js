/*jshint strict:false */
'use strict';

// Create a new angular module.
var Messages = angular.module('Messages', []);

// Define a service to inject.
Messages.
  service('messages', ['$rootScope', '$sce', '$timeout',
    function ($rootScope, $sce, $timeout) {
      return {
        mcMessages: this.mcMessages || [],
        status: {
          unseen: 'unseen',
          shown: 'shown',
          /** @var Odds are that you will show a message and right after that
           * change your route/state. If that happens your message will only be
           * seen for a fraction of a second. To avoid that use the "next"
           * status, that will make the message available to the next page */
          next: 'next',
          /** @var Do not delete this message automatically. */
          permanent: 'permanent'
        },
        add: function (type, message, options) {
          var availableTypes = ['info', 'warning', 'danger', 'success'],
            service = this;
          options = options || {};
          if (availableTypes.indexOf(type) == -1) {
            throw "Invalid message type";
          }
          var messageObject = {
            type: type,
            status: options.status || this.status.unseen,
            processed: false,
            close: function() {
              return service.remove(this);
            }
          };
          messageObject.message = options.html ? $sce.trustAsHtml(message) : message;
          messageObject.html = !!options.html;
          if (angular.isDefined(options.timeout)) {
            messageObject.timer = $timeout(function () {
              messageObject.close();
            }, options.timeout);
          }
          this.mcMessages.push(messageObject);
          return messageObject;
        },
        remove: function (message) {
          var index = this.mcMessages.indexOf(message);
          this.mcMessages.splice(index, 1);
        },
        reset: function () {
          this.mcMessages = [];
        },
        removeShown: function () {
          for (var index = this.mcMessages.length - 1; index >= 0; index--) {
            if (this.mcMessages[index].status == this.status.shown) {
              this.remove(this.mcMessages[index]);
            }
          }
        },
        markShown: function () {
          for (var index = this.mcMessages.length - 1; index >= 0; index--) {
            if (!this.mcMessages[index].processed) {
              if (this.mcMessages[index].status == this.status.unseen) {
                this.mcMessages[index].status = this.status.shown;
              }
              else if (this.mcMessages[index].status == this.status.next) {
                this.mcMessages[index].status = this.status.unseen;
              }
              this.mcMessages[index].processed = true;
            }
          }
        },
        flush: function () {
          $rootScope.mcMessages = this.mcMessages;
        }
      };
    }
  ]);

Messages.
  directive('mcMessages', ['$rootScope', 'messages', function ($rootScope, messages) {
    /*jshint multistr: true */
    var templateString = '\
    <div id="mc-messages-wrapper">\
      <div class="alert alert-{{ message.type }} {{ animation }}" ng-repeat="message in mcMessages">\
        <a class="close" ng-click="message.close();" data-dismiss="alert" aria-hidden="true">&times;</a>\
        <span ng-switch on="message.html">\
        <span ng-switch-when="true">\
          <span ng-bind-html="message.message"></span>\
        </span>\
        <span ng-switch-default>\
          {{ message.message }}\
        </span>\
      </div>\
    </div>\
    ';
    var templateString = '\
    <a ng-show="mcMessages.length" class="btn btn-{{mcMessages[0].type}}" trigger="hover" data-container="body" data-toggle="popover" data-placement="top" data-content="{{mcMessages[0].message}}" data-title="Message">\
      <span class="glyphicon glyphicon-exclamation-sign"></span>\
    </a>\
    ';
    return {
      restrict: 'EA',
      template: templateString,
      link: function(scope, element, attrs) {
        // Bind the messages from the service to the root scope.
        messages.flush();
        var changeReaction = function (event, to, from) {
          // Update 'unseen' messages to be marked as 'shown'.
          messages.markShown();
          // Remove the messages that have been shown.
          messages.removeShown();
          $rootScope.mcMessages = messages.mcMessages;
          messages.flush();
        };
        $rootScope.$on('$locationChangeStart', changeReaction);

        $('[data-toggle="popover"]').popover()

        scope.animation = attrs.animation || 'fade in';
      }
    };
  }]);
