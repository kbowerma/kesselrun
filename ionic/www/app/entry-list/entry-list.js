/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents the entry list controller
 *
 * @author TCSASSEMBLER
 * @version 1.0
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
                    syncupAble: false,
                    pageTitle: 'Contacts',
                    sortBy: 'FirstName',
                    onlyMy: true
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
                    syncupAble: false,
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
                    syncupAble: true,
                    pageTitle: 'Sample Requests',
                    sortBy: 'Name',
                    onlyMy: true
                });
        })
        .controller('EntryListCtrl', function ($scope, $rootScope, syncService, storeService, config, $state, $ionicLoading) {
            $scope.entryName = $state.current.entryName;
            $scope.pageTitle = $state.current.pageTitle;
            $scope.loading = false;
            $scope.searchText = '';
            $scope.syncupAble = $state.current.syncupAble;
            $scope.syncProgress = 0;
            $scope.syncType = null;
            var sortBy = $state.current.sortBy;     
            var soup = config.soups[$scope.entryName];
            var onlyMy = $state.current.onlyMy;
            var whereClause = onlyMy ? ("OwnerId='" + $rootScope.credentials.userId) + "'": "";
            
            // sync data with server
            $scope.sync = function(){
                if(navigator.connection && navigator.connection.type === window.Connection.NONE){
                    $ionicLoading.show({
                        template: 'Can not sync with server when off line, please check your network',
                        duration: config.toastDuration
                    });
                    return;
                }                
                storeService.getModifiedEntriesCount(soup.name).then(function(countToSyncUp){
                    if($scope.syncupAble && countToSyncUp > 0){
                        syncService.syncUp(soup.name, soup.updatedFields || soup.fields);
                    } else {
                        syncService.syncDown(soup.name, soup.fields, whereClause);
                    }
                }, function(err){
                    $ionicLoading.show({
                        template: "Failed to calculate entries' count for upload",
                        duration: config.toastDuration
                    }); 
                });
            }
            $scope.$on('$ionicView.enter', function() {
                storeService.soupExists(soup.name).then(function(exist){
                    if(!exist) {
                        storeService.registerSoup(soup.name, soup.indexes).then(function(){
                            $scope.sync();
                        }, function(){
                            $ionicLoading.show({
                                template: 'Failed to create local database',
                                duration: config.toastDuration
                            }); 
                        });
                    } else {
                        loadLocalData();
                    }
                }, function(){
                    $ionicLoading.show({
                        template: 'Failed to check local database state',
                        duration: config.toastDuration
                    });                   
                });
            });

            // listen to the sync event
            $scope.$on('sync', function(event, args){
                if(args.soupName === soup.name){
                    $scope.syncProgress = args.progress;
                    if(!$scope.syncType){
                        $scope.syncType = args.type === 'syncDown' ? 'Sync down' : 'Sync up';
                        $ionicLoading.show({
                            template: '{{syncType}}...',
                            scope: $scope
                        });
                    }
                    if(args.status === 'DONE'){
                        $scope.syncType = null;
                        $ionicLoading.hide();                        
                        if(args.type === 'syncDown'){
                            $ionicLoading.show({
                                template: 'Sync finished',
                                duration: config.toastDuration
                            });                            
                            loadLocalData();
                        } else if(args.type === 'syncUp') {
                            syncService.syncDown(soup.name, soup.fields, whereClause);
                        }
                    }
                    if(args.status === 'FAILED'){
                        $scope.syncType = null;
                        $ionicLoading.hide();
                        $ionicLoading.show({
                            template: 'Sync failed',
                            duration: config.toastDuration
                        }); 
                    }
                }
            });
            // load data from local DB
            function loadLocalData(){
                if($scope.loading){
                    return;
                }
                $scope.loading = true;
                storeService.getAllEntries(soup.name, sortBy, 'ascending').then(function(result){
                    $scope.entries = result.currentPageOrderedEntries;
                    console.log('entries', $scope.entries);
                    $scope.loading = false;
                }, function(err){
                    $scope.loading = false;
                });
            } 
        });
})();