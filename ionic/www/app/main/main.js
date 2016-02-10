/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents the main controller
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */

(function() {
    'use strict';
    angular.module('app')
        .config(function($stateProvider) {
            $stateProvider
                .state('app', {
                    url: "/app",
                    abstract: true,
                    templateUrl: "app/main/main.html",
                    controller: 'MainCtrl'
                });
        })
        .controller('MainCtrl', function ($scope, $rootScope, oauthService, storeService, config, $ionicPopup, $localStorage, $log) {
            $scope.syncInFlight = false;

            // logout
            $scope.logout = function() {
                oauthService.logout();
            };

            // remove soups
            $scope.removeSoups = function() {
                angular.forEach(config.soups, function(soup){
                    storeService.removeSoup(soup.name);
                });
            };   

            // show DB inspector
            $scope.showInspector = function() {
                storeService.showInspector();
            };        

            // listen to the sync event when sync down or sync up
            document.addEventListener("sync", function(event) {
                    $log.debug('sync', event.detail);
                    $rootScope.$broadcast('sync', event.detail);
                }
            );
        });
})();