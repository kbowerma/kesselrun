/*
* Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
*/

/**
* Represents the entry list controller
*
* Changes in 1.1:
* - Moved synchronization to main controller
* - Filter sample request by OwnerId or using Authorized Users relationship
*
* @author TCSASSEMBLER, pvmagacho
* @version 1.1
*/
(function() {
        'use strict';
        angular.module('app')
        .config(function($stateProvider) {
                $stateProvider
                .state('app.contact-list', {
                        url: '/contact-list',
                        views: {
                            'menuContent': {
                                templateUrl: 'app/entry-list/contact-list.html',
                                controller: 'EntryListCtrl'
                            }
                        },
                        entryName: 'contact',
                        pageTitle: 'Contacts',
                        sortBy: 'FirstName'
                })
                .state('app.product-list', {
                        url: '/product-list',
                        views: {
                            'menuContent': {
                                templateUrl: 'app/entry-list/product-list.html',
                                controller: 'EntryListCtrl'
                            }
                        },
                        entryName: 'product',
                        pageTitle: 'Products',
                        sortBy: 'Name'
                })
                .state('app.request-list', {
                        url: '/request-list',
                        views: {
                            'menuContent': {
                                templateUrl: 'app/entry-list/request-list.html',
                                controller: 'EntryListCtrl'
                            }
                        },
                        entryName: 'request',
                        pageTitle: 'Sample Requests',
                        sortBy: 'Name'
                });
        })
        .controller('EntryListCtrl', function ($scope, $rootScope, syncService, storeService, config, $filter, $state, $cordovaToast) {
                $scope.entryName = $state.current.entryName;
                $scope.pageTitle = $state.current.pageTitle;
                $scope.loading = false;
                $scope.searchText = '';
                $scope.syncupAble = $state.current.syncupAble;
                $scope.syncProgress = 0;
                $scope.syncType = null;
                var sortBy = $state.current.sortBy;
                var soup = config.soups[$scope.entryName];

                // sync data with server
                $scope.sync = function() {
                    $rootScope.$broadcast('forceSync', soup);
                }

                $scope.$on('syncdown:allcomplete', function() {
                        loadLocalData();
                });

                $scope.$on('$ionicView.enter', function() {
                        loadLocalData();
                });

                // load data from local DB
                function loadLocalData() {
                    if($scope.loading){
                        return;
                    }
                    $scope.loading = true;
                    storeService.getAllEntries(soup.name, sortBy, 'ascending').then(function(result) {
                            if ($scope.entryName == 'request') {
                                var filtered = [];
                                angular.forEach(result.currentPageOrderedEntries, function(currentEntry) {
                                        var foundUser = $filter('userIdsFilter')(currentEntry['Authorized_Users__r'], $rootScope.currentUserId);
                                        if (currentEntry.__local__ || currentEntry['OwnerId'] == $rootScope.currentUserId || foundUser.length > 0) {
                                            filtered.push(currentEntry);
                                        }
                                });
                                $scope.entries = filtered;
                            } else {
                                $scope.entries = result.currentPageOrderedEntries;
                            }
                            $scope.loading = false;
                    }, function(err){
                        $scope.loading = false;
                    });
                }
        });
})();