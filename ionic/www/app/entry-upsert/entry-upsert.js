/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents the entry update or create controller
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */

(function() {
    'use strict';
    angular.module('app')
        .config(function($stateProvider) {
            $stateProvider
                .state('app.contact-upsert', {
                    url: '/contact-upsert/:id?',
                    views: {
                        'menuContent': {
                            templateUrl: 'app/entry-upsert/contact-upsert.html',
                            controller: 'EntryUpsertCtrl'
                        }
                    },
                    entryName: 'contact',
                    pageTitle: 'Contact'                    
                })
                .state('app.product-upsert', {
                    url: '/product-upsert/:id?',
                    views: {
                        'menuContent': {
                            templateUrl: 'app/entry-upsert/product-upsert.html',
                            controller: 'EntryUpsertCtrl'
                        }
                    },
                    entryName: 'product',
                    pageTitle: 'Product'                    
                })
                .state('app.request-upsert', {
                    url: '/request-upsert/:id?',
                    views: {
                        'menuContent': {
                            templateUrl: 'app/entry-upsert/request-upsert.html',
                            controller: 'EntryUpsertCtrl'
                        }
                    },
                    entryName: 'request',
                    pageTitle: 'Sample Request'                    
                });                                
        })
        .controller('EntryUpsertCtrl', function ($scope, $stateParams, $state, storeService, config, $ionicNavBarDelegate, $ionicLoading, $filter) {
            $scope.entryName = $state.current.entryName;
            $scope.pageTitle = $state.current.pageTitle;
            $scope.id = $stateParams.id;
            $scope.requestStatuses = config.requestStatuses;
            var soup = config.soups[$scope.entryName];
            $scope.entry = {};
            if(!$stateParams.Id){
                var allFields = soup.updatedFields || soup.fields;
                allFields = _.difference(allFields, config.syncOptions.withoutFieldsWhenSyncUp);
                _.each(allFields, function(fieldName){
                    $scope.entry[fieldName] = null;
                });
            }
            $scope.contacts = [];
            $scope.products = [];
            $scope.newRequest = {selectedContact: {}, selectedProduct:{}, deliveryDate: null};
            $scope.$on('$ionicView.enter', function() {
                if($stateParams.id){
                    storeService.getEntryById(soup.name, $stateParams.id).then(function(result){
                        $scope.entry = result;
                        if($scope.entryName === 'request'){
                            $scope.newRequest.deliveryDate = new Date($scope.entry.Delivery_Date__c);
                            if(result.Contact__c && result.Contact__r && result.Contact__r.Name){
                                $scope.newRequest.selectedContact = {Id: result.Contact__c, Name: result.Contact__r.Name};
                                $scope.contacts.push($scope.newRequest.selectedContact);
                            }
                            if(result.Product__c && result.Product__r && result.Product__r.Name){
                                $scope.newRequest.selectedProduct = {Id: result.Product__c, Name: result.Product__r.Name};
                                $scope.products.push($scope.newRequest.selectedProduct);                                
                            }                            
                        }
                    }, function(){
                        $ionicLoading.show({
                            template: 'Failed to get the ' + $scope.pageTitle.toLowerCase() + ' with id ' + $stateParams.id,
                            duration: config.toastDuration
                        });
                        $ionicNavBarDelegate.back();
                    });
                } 
                if($scope.entryName === 'request') {
                    storeService.getAllEntries(config.soups.contact.name).then(function(result){
                        var contacts = _.map(result.currentPageOrderedEntries, function(contact){
                            return {Id: contact.Id, Name: contact.FirstName + ' ' + contact.LastName};
                        });
                        $scope.contacts = $scope.contacts.concat(contacts);
                    }, function(){
                        $ionicLoading.show({
                            template: 'Failed to get the contacts from local store',
                            duration: config.toastDuration
                        });                                
                    });
                    storeService.getAllEntries(config.soups.product.name).then(function(result){
                        var products = _.map(result.currentPageOrderedEntries, function(product){
                            return {Id: product.Id, Name: product.Name};
                        });
                        $scope.products = $scope.products.concat(products);
                    }, function(){
                        $ionicLoading.show({
                            template: 'Failed to get the products from local store',
                            duration: config.toastDuration
                        });                                
                    });
                }
            }); 
            $scope.showError = false;
            // save the entry
            $scope.save = function(form) {
                if(form && form.$invalid){
                    $scope.showError = true;
                    return;
                }
                var func = $stateParams.id ? storeService.updateEntryLocal : storeService.createEntryLocal;
                if($scope.entryName === 'request'){
                    $scope.entry.Delivery_Date__c = $scope.newRequest.deliveryDate ? ($filter('date')($scope.newRequest.deliveryDate, config.dateFormat) + '+0000') : null;
                    if($scope.newRequest.selectedContact.Id){
                        $scope.entry.Contact__c = $scope.newRequest.selectedContact.Id;
                        $scope.entry.Contact__r = $scope.entry.Contact__r || {};
                        $scope.entry.Contact__r.Name = $scope.newRequest.selectedContact.Name;
                    }
                    if($scope.newRequest.selectedProduct.Id){
                        $scope.entry.Product__c = $scope.newRequest.selectedProduct.Id;
                        $scope.entry.Product__r = $scope.entry.Product__r || {};
                        $scope.entry.Product__r.Name = $scope.newRequest.selectedProduct.Name;                 
                    }
                }
                $scope.entry.LastModifiedDate = $filter('date')(new Date(), config.dateFormat) + '+0000';
                func.call(storeService, soup.name, $scope.entry).then(
                    function (result) {
                        $ionicLoading.show({
                            template: 'Saved',
                            duration: config.toastDuration
                        });                        
                        $ionicNavBarDelegate.back();
                    }, function() {
                        $ionicLoading.show({
                            template: 'Failed to save the ' + $scope.pageTitle.toLowerCase(),
                            duration: config.toastDuration
                        });
                    });
            };
        });
})();