/*
* Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
*/

/**
* Represents main application module
*
* Changes in 1.1:
* - Added $q.serial
* - Fixed pin code flow
* - Register all soups (once only) and force all soups sync
*
* @author TCSASSEMBLER, pvmagacho
* @version 1.1
*/
(function() {
        angular.module('app', ['ionic', 'ngCordova', 'ngIOS9UIWebViewPatch'])
        .config(function ($logProvider, config) {
                $logProvider.debugEnabled(config.debug);
        })
        .config(function ($provide) {
                $provide.decorator("$q", function ($delegate) {
                        //Helper method copied from q.js.
                        var isPromiseLike = function (obj) { return obj && angular.isFunction(obj.then); }

                        /*
                        * @description Execute a collection of tasks serially.  A task is a function that returns a promise
                        *
                        * @param {Array.<Function>|Object.<Function>} tasks An array or hash of tasks.  A tasks is a function
                        *   that returns a promise.  You can also provide a collection of objects with a success tasks, failure task, and/or notify function
                        * @returns {Promise} Returns a single promise that will be resolved or rejected when the last task
                        *   has been resolved or rejected.
                        */
                        function serial(tasks) {
                            //Fake a "previous task" for our initial iteration
                            var prevPromise;
                            var error = new Error();
                            angular.forEach(tasks, function (task, key) {
                                    var success = task.success || task;
                                    var fail = task.fail;
                                    var notify = task.notify;
                                    var nextPromise;

                                    //First task
                                    if (!prevPromise) {
                                        nextPromise = success();
                                        if (!isPromiseLike(nextPromise)) {
                                            error.message = "Task " + key + " did not return a promise.";
                                            throw error;
                                        }
                                    } else {
                                        //Wait until the previous promise has resolved or rejected to execute the next task
                                        nextPromise = prevPromise.then(
                                            /*success*/function (data) {
                                                if (!success) { return data; }
                                                var ret = success(data);
                                                if (!isPromiseLike(ret)) {
                                                    error.message = "Task " + key + " did not return a promise.";
                                                    throw error;
                                                }
                                                return ret;
                                            },
                                            /*failure*/function (reason) {
                                                if (!fail) { return $delegate.reject(reason); }
                                                var ret = fail(reason);
                                                if (!isPromiseLike(ret)) {
                                                    error.message = "Fail for task " + key + " did not return a promise.";
                                                    throw error;
                                                }
                                                return ret;
                                            },
                                            notify);
                                    }
                                    prevPromise = nextPromise;
                            });

                            return prevPromise || $delegate.when();
                        }

                        $delegate.serial = serial;
                        return $delegate;
                });
        })
        .run(function($ionicPlatform, $state, oauthService, storeService, $q, $rootScope, $localStorage, config, $cordovaToast, $ionicPopup, $cordovaNetwork) {
                $ionicPlatform.ready(function() {
                        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                        // for form inputs)
                        if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
                            window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                            window.cordova.plugins.Keyboard.disableScroll(true);
                        }
                        if (window.StatusBar) {
                            // org.apache.cordova.statusbar required
                            StatusBar.styleDefault();
                        }

                        oauthService.login().then(function(creds) {
                                $rootScope.credentials = creds;
                                if (!$rootScope.pinCode) {
                                    checkSoup(setPinCode);
                                } else if ($cordovaNetwork.isOffline()) {
                                    checkSoup(inputPinCode);
                                } else {
                                    checkSoup();
                                }
                        }, function(err) {
                            $log.debug('login', 'Failed to login: ' + err);
                            $cordovaToast.showShortBottom('Failed to login');
                        });
                });
                $rootScope.pinCode = $localStorage.get('pinCode') || '';
                $rootScope.pinSetting = {};
                $rootScope.setPinCode = setPinCode;
                $rootScope.inputPinCode = inputPinCode;
                $rootScope.changePinCode = changePinCode;

                // register all soups
                $rootScope.whereClause = {};
                function checkSoup(firstTask) {
                    var promises = [];
                    if (firstTask) {
                        promises.push(firstTask);
                    }
                    promises.push(function() {
                            var deferred = $q.defer();
                            cordova.require("com.salesforce.plugin.sfaccountmanager").getCurrentUser(function(currentUser) {
                                    $rootScope.currentUserId = currentUser.idUrl.split('/').pop();
                                    deferred.resolve();
                            });
                            return deferred.promise;
                    });
                    angular.forEach(config.soups, function(soup) {
                            var task = function() {
                                var deferred = $q.defer();
                                $rootScope.whereClause[soup.name] = (soup.name == 'Contact') ? "OwnerId='" + $rootScope.currentUserId + "'" : '';
                                storeService.soupExists(soup.name).then(function(exist){
                                        if(!exist) {
                                            storeService.registerSoup(soup.name, soup.indexes).then(function() {
                                                    deferred.resolve();
                                            });
                                        } else {
                                            deferred.resolve();
                                        }
                                }, function(){
                                    $cordovaToast.showShortBottom('Failed to check local database state for soup: ' + soup.name);
                                    deferred.reject();
                                });
                                return deferred.promise;
                            };
                            promises.push(task);
                    });
                    promises.push(function() {
                            return $state.go('app.contact-list');
                    });
                    $q.serial(promises).then(function() {
                            $rootScope.$broadcast('forceSync');
                    });
                }

                // input pin code popup
                function inputPinCode(){
                    return $ionicPopup.show({
                            templateUrl: 'app/common/templates/input-pin-popup.html',
                            title: 'Input Pin Code',
                            scope: $rootScope,
                            buttons: [ {
                                    text: '<b>OK</b>',
                                    type: 'button-positive',
                                    onTap: function(e) {
                                        if ($rootScope.pinSetting.pinCodeInput !== $rootScope.pinCode) {
                                            $rootScope.pinSetting.pinIncorrect = true;
                                            e.preventDefault();
                                        } else {
                                            $rootScope.pinSetting = {}; // clear local data
                                            return true;
                                        }
                                    }
                            }]
                    });
                }

                // set pin code popup
                function setPinCode(){
                    return $ionicPopup.show({
                            templateUrl: 'app/common/templates/set-pin-popup.html',
                            title: 'Please Enter Pin Code',
                            scope: $rootScope,
                            buttons: [{
                                    text: '<b>Save</b>',
                                    type: 'button-positive',
                                    onTap: function(e) {
                                        if (!$rootScope.pinSetting.pinCodeInputFirst) {
                                            $rootScope.pinSetting.pinRequired = true;
                                            e.preventDefault();
                                        } else if($rootScope.pinSetting.pinCodeInputFirst !== $rootScope.pinSetting.pinCodeInputSecond){
                                            $rootScope.pinSetting.pinNotConsistent = true;
                                            e.preventDefault();
                                        } else {
                                            $rootScope.pinCode = $rootScope.pinSetting.pinCodeInputFirst;
                                            $localStorage.set('pinCode', $rootScope.pinCode);
                                            $rootScope.pinSetting = {}; // clear local data
                                            return true;
                                        }
                                    }
                            }]
                    });
                }

                // change pin code popup
                function changePinCode(){
                    return $ionicPopup.show({
                            templateUrl: 'app/common/templates/change-pin-popup.html',
                            title: 'Change Pin Code',
                            scope: $rootScope,
                            buttons: [{
                                    text: 'Cancel'
                            }, {
                                text: '<b>Change</b>',
                                type: 'button-positive',
                                onTap: function(e) {
                                    if ($rootScope.pinSetting.pinCodeOld !== $rootScope.pinCode) {
                                        $rootScope.pinSetting.pinIncorrect = true;
                                        e.preventDefault();
                                    } else {
                                        $rootScope.pinCode = $rootScope.pinSetting.pinCodeNew || '';
                                        $localStorage.set('pinCode', $rootScope.pinCode);
                                        $rootScope.pinSetting = {}; // clear local data
                                        return true;
                                    }
                                }
                            }]
                    });
                }
        })
        .filter('userNamesFilter', function() {
                return function(input){
                    if (input && input.records && input.records.length > 0) {
                        var userNames = [];
                        angular.forEach(input.records, function(record){
                                userNames.push(record.User__r.Name);
                        });
                        return userNames.join(', ');
                    } else {
                        return '';
                    }
                }

        })
        .filter('userIdsFilter', function() {
                return function(input, currentUserId){
                    if (input && input.records && input.records.length > 0) {
                        var userIds = [];
                        angular.forEach(input.records, function(record){
                                userIds.push(record.User__c);
                        });
                        return (userIds.indexOf(currentUserId) != -1) ? currentUserId : '';
                    } else {
                        return '';
                    }
                }

        }).filter('parseDate', function() {
            return function(input) {
                if (!input) {
                    return null;
                }
                var parts = input.split('T')[0].split('-');
                return new Date(parts[0], parts[1]-1, parts[2]);
            }
        });
})();