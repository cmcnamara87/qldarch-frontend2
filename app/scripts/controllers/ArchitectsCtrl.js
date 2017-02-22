'use strict';

angular.module('qldarchApp').controller('ArchitectsCtrl',
    function($scope, $http, architects, Uris, GraphHelper, LayoutHelper, $stateParams, $location, $filter, $state) {
      var DEFAULT_ARCHITECT_ROW_COUNT = 5;
      $scope.architectRowDisplayCount = DEFAULT_ARCHITECT_ROW_COUNT;
      $scope.$stateParams = $stateParams;
      $scope.indexes = {
        'A' : false,
        'B' : false,
        'C' : false,
        'D' : false,
        'E' : false,
        'F' : false,
        'G' : false,
        'H' : false,
        'I' : false,
        'J' : false,
        'K' : false,
        'L' : false,
        'M' : false,
        'N' : false,
        'O' : false,
        'P' : false,
        'Q' : false,
        'R' : false,
        'S' : false,
        'T' : false,
        'U' : false,
        'V' : false,
        'W' : false,
        'X' : false,
        'Y' : false,
        'Z' : false
      };

      function isLetter(char) {
        return char.match(/[a-z]/i);
      }

      architects = $filter('filter')(architects, function(architect) {
        $scope.indexes[architect.label.substring(0, 1).toUpperCase()] = true;
        if ($stateParams.index && $stateParams.index.length === 1) {
          if (isLetter($stateParams.index) && architect.label.substring(0, 1).toUpperCase() === $stateParams.index) {
            return true;
          }
          return false;
        }
        return true;
      });

      architects = $filter('orderBy')(architects, function(architect) {
        return (architect.label || '');
      });

      $scope.architectRows = LayoutHelper.group(GraphHelper.graphValues(architects), 6);
      $scope.Uris = Uris;

      $scope.goToIndex = function(index) {
        $state.go('architects.queensland', {
          index : index
        });
      };

      /**
       * Adds more exchanges to the UI
       */
      $scope.addMoreArchitectRows = function() {
        $scope.architectRowDisplayCount += 5;
      };

    });