'use strict';

angular.module('qldarchApp').controller(
    'InterviewCtrl',
    function($scope, interview, $state, $http, Uris, relationships, $stateParams, $location, $anchorScroll, $timeout, toaster, types, $filter,
        entities) {
      /* globals $:false */
      $scope.interview = interview;
      if (interview.transcript[0]) {
        $scope.title = interview.label;
        $scope.isShowingTranscript = true;
      } else {
        $scope.title = 'Unknown Date';
        $scope.isShowingTranscript = false;
      }

      $scope.isSyncingTranscript = false;
      var mediaPlayerId = 'intvwmediaplayer';
      var playerDom = document.getElementById(mediaPlayerId);
      $scope.player = {};

      // Look for our external locations
      $scope.playerPlaylist = [];

      var preferredMediaExist = false;
      var videoExist = false;
      angular.forEach(interview.media, function(med) {
        if (angular.isDefined(med.preferred)) {
          preferredMediaExist = true;
        }
        if (med.type === 'Video') {
          videoExist = true;
        }
      });
      if (preferredMediaExist) {
        interview.media = $filter('orderBy')(interview.media, function(med) {
          return (med.preferred || '');
        }, true);
      } else if (videoExist) {
        interview.media = $filter('orderBy')(interview.media, function(med) {
          return (med.type === 'Video' || '');
        });
      } else {
        interview.media = $filter('orderBy')(interview.media, function(med) {
          return (med.type === 'Audio' || '');
        });
      }
      if (interview.media[0].type === 'Audio' || interview.media[0].type === 'Video') {
        $scope.playerPlaylist.push({
          src : Uris.WS_MEDIA + interview.media[0].id,
          type : interview.media[0].mimetype
        });
        if (interview.media[0].type === 'Audio') {
          jQuery('#' + mediaPlayerId).attr('style', 'width: 100%;height: 40px;');
        } else {
          jQuery('.player-video').hide();
          jQuery('#' + mediaPlayerId).attr('style', 'width: 100%;');
        }
      }

      $scope.currentSpeaker = {};
      $scope.isSyncing = true;
      $scope.isSearching = false;

      function scrollToTime(time, duration) {
        console.log('scrolling to time!');
        console.log(time);
        if (!duration) {
          duration = 2000;
        }
        jQuery('html, body').animate({
          scrollTop : jQuery('#' + time).offset().top - 20
        }, duration);
      }

      $scope.$watch('isSyncing', function(isSyncing, isSyncingOld) {
        if (isSyncing === false && isSyncingOld === true) {
          // Its been turned off, check if there is a time and scroll
          if (angular.isDefined($scope.currentExchange)) {
            $timeout(function() {
              var startTime = $scope.currentExchange.startTime;
              scrollToTime(startTime, 1);
            }, 0);

          }
        }
      });

      // Amount of exchanges to display
      var exchangeDisplayCountDefault = 10;
      if ($stateParams.time) {
        $scope.startTime = $stateParams.time;
        angular.forEach(interview.transcript, function(exchange, index) {
          if (exchange.startTime.toString() === $stateParams.time.toString()) {
            console.log('once');
            $scope.exchangeDisplayCount = index + 20;
          }
        });
        setTimeout(function() {
          scrollToTime($stateParams.time, 2000);
          console.log('there is a time', $stateParams.time);
        }, 0);
      } else {
        $scope.exchangeDisplayCount = exchangeDisplayCountDefault;
      }

      /**
       * Sets the current exchange based on the current time
       * 
       * @param currentTime
       */
      function setCurrentExchangeFromTime(currentTime) {
        var index;
        if (interview.transcript) {
          angular.forEach($scope.interview.transcript, function(exchange, exchangeIndex) {
            if (currentTime < exchange.endTime && !angular.isDefined(index)) {
              index = exchangeIndex;
            }
          });
          if (index >= 0) {
            $scope.currentExchangeIndex = index;
            $scope.currentExchange = $scope.interview.transcript[index];
            // change request #36, only show photos of the interviewees.
            // i think the currentSpeaker is used for the photo on the
            // interview page and for nothing else (Andre)
            if ($scope.currentExchange.speaker && !$scope.currentExchange.speaker.isInterviewer) {
              $scope.currentSpeaker = $scope.currentExchange.speaker;
            } else {
              $scope.currentSpeaker = interview.interviewee[0].label;
            }
          }
        } else {
          $scope.currentSpeaker = interview.interviewee[0].label;
        }
      }

      /**
       * Cancels searching
       */
      function playing() {
        $scope.isSearching = false;
        $scope.transcriptSearchInput = '';
      }

      // Updates the current exchange from player
      $scope.$watch('player.currentTime', setCurrentExchangeFromTime);
      // Cancels any searching when the play button is clicked
      $scope.$on('player.playing', playing);

      /**
       * Adds more exchanges to the UI
       */
      $scope.addMoreExchanges = function() {
        $scope.exchangeDisplayCount += 10;
      };

      /**
       * Shows the add relationship box.
       * 
       * Shows the controls and pauses the audio.
       * 
       * @param {Object}
       *          exchange The exchange to add the relationship
       */
      $scope.showAddRelationship = function(exchange) {
        angular.forEach($scope.interview.transcript, function(exchange) {
          $scope.hideAddRelationship(exchange);
        });
        $scope.player.pause();
        exchange.isAddingRelationship = true;
      };

      /**
       * Removes the add relationship box for an exchange.
       * 
       * @param {Object}
       *          exchange The exchange to close the exchange on
       */
      $scope.hideAddRelationship = function(exchange) {
        exchange.isAddingRelationship = false;
        $scope.relationship = {};
        $scope.relationship.subject = {
          id : interview.interviewee[0].id,
          text : interview.interviewee[0].label
        };
      };

      $scope.showEditRelationships = function(exchange) {
        // Close any other ones that may be open
        angular.forEach($scope.interview.transcript, function(exchange) {
          $scope.hideAddRelationship(exchange);
        });
        $scope.player.pause();
        exchange.isEditingRelationships = true;
      };
      $scope.hideEditRelationships = function(exchange) {
        exchange.isEditingRelationships = false;
      };

      /**
       * Show exchanges that haven't already been spoken
       * 
       * @param exchange
       * @returns {boolean}
       */
      $scope.timeFilter = function(exchange) {
        if ($scope.isSyncing && !$scope.isSearching) {
          if ($scope.player.currentTime === 0) {
            return true;
          } else if (angular.isUndefined($scope.player.currentTime) && angular.isDefined(exchange.endTime)) {
            return true;
          } else {
            return $scope.player.currentTime < exchange.endTime;
          }
        } else {
          return true;
        }
      };

      var nextMatch = 0;

      /**
       * Search for text in the exchanges
       * 
       * @param transcriptSearchInput
       */
      $scope.transcriptSearchInputChanged = function(transcriptSearchInput) {
        $scope.isSearching = true;
        nextMatch = 0;
        $scope.player.pause();
        $scope.exchangeDisplayCount = interview.transcript.length;

        if (transcriptSearchInput === '') {
          // cleared
          playing();
        }
      };

      $scope.transcriptSearchKeydown = function(e) {
        if (e.keyCode === 13) {
          var m = jQuery('.ui-match');
          if (m.length > 0) {
            if (nextMatch >= m.length) {
              nextMatch = 0;
            }
            jQuery('html, body').scrollTop(jQuery(m[nextMatch++]).offset().top - 20);
          }
        }
      };

      /**
       * Start playing the audio from a specific exchange
       * 
       * @param exchange
       */
      $scope.playFromExchange = function(exchange) {
        $scope.player.pause();
        console.log('play from exchange');
        jQuery('html, body').animate({
          scrollTop : jQuery('.player').offset().top + 'px'
        }, 500, 'swing', function() {
          playerDom.currentTime = exchange.startTime;
          $scope.player.currentTime = exchange.startTime;
          $scope.isSyncing = true;
          playing();
          $scope.player.play();
        });
      };

      $scope.getSpeakerArchitect = function(id) {
        var architect;
        var interviewee = angular.copy(interview.interviewee);
        var interviewer = angular.copy(interview.interviewer);
        var speakers = interviewee.concat(interviewer);
        angular.forEach(speakers, function(speaker) {
          if (id === speaker.id) {
            architect = speaker.architect;
          }
        });
        return architect;
      };

      $scope.relationship = {};
      $scope.relationship.subject = {
        id : interview.interviewee[0].id,
        text : interview.interviewee[0].label
      };

      var relationshiptypes = {
        results : []
      };

      for ( var type in types) {
        relationshiptypes.results.push({
          id : type,
          text : types[type]
        });
      }

      $scope.relationshiptypeSelect = {
        placeholder : 'Select a Relationship Type',
        dropdownAutoWidth : false,
        multiple : false,
        initSelection : true,// https://github.com/angular-ui/ui-select2/issues/153
        data : relationshiptypes
      };

      entities = $filter('orderBy')(entities, function(entity) {
        return entity.label;
      });

      var dataEntitySelect = {
        results : []
      };

      angular.forEach(entities, function(e) {
        if (e.label && !(/\s/.test(e.label.substring(0, 1)))) {
          var entitytype = 'unknown';
          if (e.hasOwnProperty('type')) {
            entitytype = e.type.charAt(0).toUpperCase() + e.type.slice(1);
          } else if (e.hasOwnProperty('firstname') || e.hasOwnProperty('lastname')) {
            entitytype = 'Person';
          } else if (e.hasOwnProperty('lat') || e.hasOwnProperty('lng')) {
            entitytype = 'Structure';
          }
          dataEntitySelect.results.push({
            id : e.id,
            text : e.label + ' (' + entitytype + ')'
          });
        }
      });

      $scope.subjObjSelect = {
        placeholder : 'Select an Entity',
        dropdownAutoWidth : false,
        multiple : false,
        initSelection : true,// https://github.com/angular-ui/ui-select2/issues/153
        data : dataEntitySelect
      };

      var createRelationship = function(data, exchange, interviewid) {
        var payload = angular.copy(data);
        payload.interview = interviewid;
        payload.utterance = exchange.id;
        payload.source = 'interview';
        delete payload.subject;
        delete payload.type;
        delete payload.object;
        delete payload.from;
        delete payload.until;
        if (angular.isDefined(data.subject.id)) {
          payload.subject = data.subject.id;
        }
        if (angular.isDefined(data.type.id)) {
          payload.type = data.type.id;
        }
        if (angular.isDefined(data.object.id)) {
          payload.object = data.object.id;
        }
        if (data.from !== null && angular.isDefined(data.from) && data.from !== '') {
          payload.from = data.from.getFullYear();
        }
        if (data.until !== null && angular.isDefined(data.until) && data.until !== '') {
          payload.until = data.until.getFullYear();
        }
        return $http({
          method : 'PUT',
          url : Uris.WS_ROOT + 'interviewrelationship',
          headers : {
            'Content-Type' : 'application/x-www-form-urlencoded'
          },
          withCredentials : true,
          transformRequest : function(obj) {
            return $.param(obj);
          },
          data : payload
        }).then(function(response) {
          if (!angular.isDefined(exchange.relationships)) {
            exchange.relationships = [];
          }
          response.data.subjectlabel = data.subject.text;
          response.data.relationship = data.type.text;
          response.data.objectlabel = data.object.text;
          response.data.relationshipid = response.data.id;
          response.data.fromyear = response.data.from;
          response.data.untilyear = response.data.until;
          exchange.relationships.push(response.data);
          $scope.relationship = {};
          $scope.relationship.subject = {
            id : interview.interviewee[0].id,
            text : interview.interviewee[0].label
          };
          toaster.pop('success', 'Interview relationship created');
          console.log('created interview relationship id: ' + response.data.id);
          return response.data;
        }, function(response) {
          toaster.pop('error', 'Error occured', response.data.msg);
          console.log('error message: ' + response.data.msg);
        });
      };

      $scope.addRelationshipToExchange = function(relationship, exchange, interviewid) {
        if (angular.isDefined(relationship)) {
          createRelationship(relationship, exchange, interviewid).then(function(data) {
            relationships.push(data);
          });
        }
        $scope.hideAddRelationship(exchange);
      };

      var deleteRelationship = function(relationship, exchange) {
        var r = window.confirm('Delete this interview relationship?');
        if (r === true) {
          return $http.delete(Uris.WS_ROOT + 'relationship/' + relationship.id, {
            withCredentials : true
          }).then(function(response) {
            var index = exchange.relationships.indexOf(response.data);
            exchange.relationships.splice(index, 1);
            toaster.pop('success', 'Interview relationship deleted');
            console.log('deleted interview relationship id: ' + response.data.id);
            return response.data;
          }, function(response) {
            toaster.pop('error', 'Error occured', response.data.msg);
            console.log('error message: ' + response.data.msg);
          });
        }
      };

      $scope.deleteRelationship = function(relationship, exchange) {
        deleteRelationship(relationship, exchange).then(function(data) {
          var index = relationships.indexOf(data);
          relationships.splice(index, 1);
        });
      };

      var deleteTranscript = function(interview) {
        var r = window.confirm('Delete ' + interview.label + ' transcript and transcript file?');
        if (r === true) {
          return $http.delete(Uris.WS_ROOT + 'interview/transcript/' + interview.id, {
            withCredentials : true
          }).then(function(response) {
            delete interview.transcript;
            toaster.pop('success', 'Transcript deleted', response.data.label + ' transcript deleted');
            console.log('deleted transcript for interview id: ' + response.data.id);
            return response.data;
          }, function(response) {
            toaster.pop('error', 'Error occured', response.data.msg);
            console.log('error message: ' + response.data.msg);
          });
        }
      };

      $scope.deleteTranscript = function(interview) {
        deleteTranscript(interview);
      };
    });