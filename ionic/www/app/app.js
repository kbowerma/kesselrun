/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents main application module
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
(function() {
    angular.module('app', ['ionic', 'ngIOS9UIWebViewPatch'])
        .config(function ($logProvider, config) {
            $logProvider.debugEnabled(config.debug);
        })    
        .run(function($ionicPlatform, $state, oauthService, storeService, $rootScope, $localStorage, config, $ionicLoading, $ionicPopup) {
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
                    if($rootScope.pinCode){
                        inputPinCode().then(function(){
                            $state.go('app.contact-list');
                        });
                    } else {
                        $state.go('app.contact-list');
                    }
                }, function(err) {
                    $ionicLoading.show({
                        template: 'Failed to login: ' + err,
                        duration: config.toastDuration
                    });                    
                });
            });
            $rootScope.pinCode = $localStorage.get('pinCode') || '';
            $rootScope.pinSetting = {};
            $rootScope.setPinCode = setPinCode;
            $rootScope.changePinCode = changePinCode;

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
                        text: 'Cancel'
                    }, {
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
                                return true;
                            }
                        }
                    }]
                });
            }
        });
})();