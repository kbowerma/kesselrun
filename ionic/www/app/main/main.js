/*
* Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
*/

/**
* Represents the main controller
*
* Changes in 1.1:
* - Added offline/online event handler
* - Added interval synchronization and orphaned record check
* - All data synchronization is now handled in Main controller
*
* @author TCSASSEMBLER, pvmagacho
* @version 1.1
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
        .controller('MainCtrl', function ($scope, $rootScope, $q, oauthService, syncService, storeService, config, $cordovaToast, $interval,
            $ionicPopup, $localStorage, $filter, $log, $cordovaNetwork) {
            $scope.syncInFlight = false;
            $scope.needNewSync = false;

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
            });

            // listen to the sync event
            $scope.$on('sync', function(event, args) {
                    var soup = $scope.getSoup(args.soupName);
                    $scope.syncProgress = args.progress;
                    if (!$scope.syncType) {
                        $scope.syncType = args.type === 'syncDown' ? 'Sync down started' : 'Sync up started';
                        $cordovaToast.showShortBottom($scope.syncType);
                    }
                    if (args.status === 'DONE') {
                        $scope.syncType = null;
                        if (args.type === 'syncDown') {
                            $cordovaToast.showShortBottom('Synchronization has finished');
                            $rootScope.$broadcast('syncdown:complete');
                        } else if (args.type === 'syncUp') {
                            if (!soup.writeOnly) {
                                syncService.syncDown(soup.name, soup.fields, $rootScope.whereClause[soup.name]);
                            } else {
                                $rootScope.$broadcast('syncdown:complete');
                            }
                        }
                    }
                    if (args.status === 'FAILED') {
                        $scope.syncType = null;
                        $cordovaToast.showLongBottom('Synchronization has failed');
                        $rootScope.$broadcast('syncdown:complete');
                    }
            });

            // sync data with server
            $scope.sync = function(soup){
                if ($cordovaNetwork.isOffline()) {
                    $cordovaToast.showShortBottom('Can not sync with server when off line, please check your network');
                    return;
                }
                syncService.syncDown(soup.name, soup.fields, $scope.whereClause);
            }

            // force sync with all soups or one soup only
            $scope.forceSync = function(event, args) {
                if ($cordovaNetwork.isOffline()) {
                    // ignore when offline
                    return;
                }

                if ($scope.syncInFlight) {
                    if (args && args.name == 'Attachment' && !$scope.needNewSync) {
                        $scope.needNewSync = true;
                        return;
                    }
                    $cordovaToast.showShortBottom("Still synchronizing. Try again later.");
                    return;
                }
                $scope.syncInFlight = true;

                if (args) {
                    var soup = args;
                    storeService.getModifiedEntriesCount(soup.name).then(function(countToSyncUp) {
                            var turnOff = $scope.$on('syncdown:complete', function() {
                                    turnOff();
                                    $scope.syncInFlight = false;
                                    $rootScope.$broadcast('syncdown:allcomplete');

                                    if (soup.name == 'Attachment' && $scope.needNewSync) {
                                        $scope.needNewSync = false;
                                        $scope.forceSync(null, soup);
                                    }
                                    if (soup.name == 'SampleRequest__c' && countToSyncUp > 0) {
                                        $cordovaToast.showLongTop(countToSyncUp + ' sample request(s) were synchronized to server');
                                    }
                            });
                            if (countToSyncUp > 0 && !soup.readOnly) {
                                syncService.syncUp(soup.name, soup.updatedFields || soup.fields);
                            } else if (!soup.writeOnly) {
                                syncService.syncDown(soup.name, soup.fields, $rootScope.whereClause[soup.name]);
                            } else {
                                $rootScope.$broadcast('syncdown:complete');
                            }
                    }, function(err) {
                        $cordovaToast.showShortBottom("Failed to calculate entries' count for upload");
                    });
                } else {
                    var promises = [];
                    angular.forEach(config.soups, function(soup) {
                            var task = function() {
                                var deferred = $q.defer();
                                storeService.getModifiedEntriesCount(soup.name).then(function(countToSyncUp) {
                                        var turnOff = $scope.$on('syncdown:complete', function() {
                                                turnOff();
                                                deferred.resolve();
                                        });
                                        if (countToSyncUp > 0 && !soup.readOnly) {
                                            syncService.syncUp(soup.name, soup.updatedFields || soup.fields);
                                        } else if (!soup.writeOnly) {
                                            syncService.syncDown(soup.name, soup.fields, $rootScope.whereClause[soup.name]);
                                        } else {
                                            $rootScope.$broadcast('syncdown:complete');
                                        }
                                }, function(err) {
                                    $cordovaToast.showShortBottom("Failed to calculate entries' count for upload");
                                    deferred.reject();
                                });
                                return deferred.promise;
                            }
                            promises.push(task);
                    });
                    $q.serial(promises).then(function() {
                            $scope.syncInFlight = false;
                            $rootScope.$broadcast('syncdown:allcomplete');
                    });
                }
            }
            $scope.$on('forceSync', $scope.forceSync);

            // check orphaned records
            $scope.checkRemoved = function() {
                var soql = 'SELECT Id FROM SampleRequest__c';
                var promises = [], serverRecords, soupName = 'SampleRequest__c';
                promises.push(function() {
                        return oauthService.query(soql);
                });
                promises.push(function(serverResult) {
                        serverRecords = serverResult.records;
                        return storeService.getAllEntries(soupName);
                });

                if ($cordovaNetwork.isOffline()) { // ignore when offline
                    return;
                }

                $q.serial(promises).then(function(localResult) {
                        var localRecords = _.flatten(localResult.currentPageOrderedEntries);
                        angular.forEach(localRecords, function(localSample) {
                                if (!localSample.__local__) { // only remove non-local records
                                    var value = _.findWhere(serverRecords, {Id: localSample.Id});
                                    if (!value) { // orphaned value
                                        $log.debug('CheckRemoved', 'Removed orphaned sample: ' + localSample.Name);
                                        storeService.removeEntryById(soupName, localSample._soupEntryId);
                                    }
                                }
                        });
                        $rootScope.$broadcast('syncdown:allcomplete');
                });
            }

            // periodic synchronization
            var stop;
            $scope.startSync = function() {
                if (angular.isDefined(stop)) return;
                stop = $interval(function() {
                        $scope.forceSync();
                }, config.syncOptions.syncInterval);
            };
            $scope.stopSync = function() {
                if (angular.isDefined(stop)) {
                    $interval.cancel(stop);
                    stop = undefined;
                }
            };

            // periodic removal of orphaned records
            var stopRemoval;
            $scope.startRemoval = function() {
                if (angular.isDefined(stopRemoval)) return;
                stopRemoval = $interval(function() {
                        $scope.checkRemoved();
                }, config.syncOptions.removalInterval);
            };
            $scope.stopRemoval = function() {
                if (angular.isDefined(stopRemoval)) {
                    $interval.cancel(stopRemoval);
                    stopRemoval = undefined;
                }
            };

            $scope.$on('$destroy', function() {
                    // Make sure that the interval is destroyed too
                    $scope.stopSync();
                    $scope.stopRemoval();
            });

            // check offline/online events
            $rootScope.$on('$cordovaNetwork:online', function(event, networkState) {
                    if (!$rootScope.online) {
                        $rootScope.$broadcast('forceSync');
                    }
                    if ($scope.pinPopup) {
                        $scope.pinPopup.close();
                    }
                    // start periodic methods
                    $scope.startSync();
                    $scope.startRemoval();
                    $rootScope.online = true;
            });

            $rootScope.$on('$cordovaNetwork:offline', function(event, networkState) {
                    $scope.pinPopup = $rootScope.inputPinCode();
                    // stop periodic methods
                    $scope.stopSync();
                    $scope.stopRemoval();
                    $rootScope.online = false;
            });

            // enter event
            $scope.$on('$ionicView.enter', function() {
                    $rootScope.online = $cordovaNetwork.isOnline();
                    if ($cordovaNetwork.isOnline()) {
                        // start periodic methods
                        $scope.startSync();
                        $scope.startRemoval();
                    }
            });

            $scope.getSoup = function(input) {
                var p = config.soups;
                for (var key in p) {
                    if (p.hasOwnProperty(key)) {
                        if (p[key].name == input) {
                            return p[key];
                        }
                    }
                }
                return {};
            }

            });
})();