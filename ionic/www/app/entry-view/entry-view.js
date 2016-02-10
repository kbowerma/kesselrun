/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents the entry view controller
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */

(function() {
    'use strict';
    angular.module('app')
        .config(function($stateProvider) {
            $stateProvider
                .state('app.contact-view', {
                    url: '/contact-view/:id',
                    views: {
                        'menuContent': {
                            templateUrl: 'app/entry-view/contact-view.html',
                            controller: 'EntryViewCtrl'
                        }
                    },
                    entryName: 'contact',
                    pageTitle: 'Contact'
                })
                .state('app.product-view', {
                    url: '/product-view/:id',
                    views: {
                        'menuContent': {
                            templateUrl: 'app/entry-view/product-view.html',
                            controller: 'EntryViewCtrl'
                        }
                    },
                    entryName: 'product',
                    pageTitle: 'Product'
                })
                .state('app.request-view', {
                    url: '/request-view/:id',
                    views: {
                        'menuContent': {
                            templateUrl: 'app/entry-view/request-view.html',
                            controller: 'EntryViewCtrl'
                        }
                    },
                    entryName: 'request',
                    pageTitle: 'Sample Request'
                });
        })
        .controller('EntryViewCtrl', function ($scope, $stateParams, storeService, config, $state, $ionicLoading, $ionicPopup, $ionicNavBarDelegate) {
            $scope.entryName = $state.current.entryName;
            $scope.pageTitle = $state.current.pageTitle;
            var soup = config.soups[$scope.entryName];
            $scope.$on('$ionicView.enter', function() {
                storeService.getEntryById(soup.name, $stateParams.id).then(function(result){
                    $scope.entry = result;
                }, function(){
                    $ionicLoading.show({
                        template: 'Failed to get the ' + $scope.pageTitle.toLowerCase() + ' with id ' + $stateParams.id,
                        duration: config.toastDuration
                    });
                    $ionicNavBarDelegate.back();
                });
            });
            // delete the entry
            $scope.delete = function() {
                var deleteConfirmPopup = $ionicPopup.confirm({
                    title: 'Confirm Delete',
                    template: 'Are you sure you want to delete this ' + $scope.pageTitle.toLowerCase() + '?'
                });

                deleteConfirmPopup.then(function(res) {
                    if (res) {
                        storeService.deleteEntryLocal(soup.name, $scope.entry).then(function(result){
                            $ionicLoading.show({
                                template: 'Deleted',
                                duration: config.toastDuration
                            });
                            $ionicNavBarDelegate.back();
                        }, function(){
                            $ionicLoading.show({
                                template: 'Failed to delete the ' + $scope.pageTitle.toLowerCase(),
                                duration: config.toastDuration
                            });                            
                        });
                    }
                });
            };
        })
        .filter('userNamesFilter', function(){
            return function(input){
                if(input && input.records && input.records.length > 0){
                    var userNames = [];
                    angular.forEach(input.records, function(record){
                        userNames.push(record.User__r.Name);
                    });
                    return userNames.join(', ');
                } else {
                    return '';
                }
            }
        });
})();