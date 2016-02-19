/*
* Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
*/

/**
* Represents the entry view controller
*
* Changes in 1.1:
* - Added signature
* - Save sample request to PDF and synchronize with Salesforce Org
*
* @author TCSASSEMBLER, pvmagacho
* @version 1.1
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
        .controller('EntryViewCtrl', function ($scope, $rootScope, $sce, $stateParams, $filter, $state, $cordovaNetwork, $ionicModal, $localStorage,
            $ionicScrollDelegate, $cordovaToast, $ionicPopup, $ionicNavBarDelegate, storeService, config) {
            $scope.entryName = $state.current.entryName;
            $scope.pageTitle = $state.current.pageTitle;
            $scope.hasSignature = $state.current.hasSignature;
            var soup = config.soups[$scope.entryName];
            $scope.$on('$ionicView.enter', function() {
                    storeService.getEntryById(soup.name, $stateParams.id).then(function(result) {
                            $scope.entry = result;
                            if ($scope.entryName == 'request') {
                                $scope.showSignature = true; // can be changed to something more meaningful (use Status)
                                if ($localStorage.get($scope.entry.Id)) {
                                    $scope.signaturePad.fromDataURL($localStorage.get($scope.entry.Id));
                                }
                            }
                    }, function() {
                        $cordovaToast.showShortBottom('Failed to get the ' + $scope.pageTitle.toLowerCase() + ' with id ' + $stateParams.id);
                        $ionicNavBarDelegate.back();
                    });
            });
            $scope.showSignature = false;
            if ($scope.entryName == 'request') {
                var canvas = document.getElementById('signatureCanvas');
                $scope.signaturePad = new SignaturePad(canvas);

                canvas.addEventListener('touchstart', function() {
                        $ionicScrollDelegate.freezeAllScrolls(true);
                });
                document.addEventListener('touchend', function() {
                        $ionicScrollDelegate.freezeAllScrolls(false);
                });

                $scope.clearCanvas = function() {
                    $scope.signaturePad.clear();
                }

                var centeredText = function(doc, text, y) {
                    var textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                    var textOffset = (doc.internal.pageSize.width - textWidth) / 2;
                    doc.text(textOffset, y, text);
                }

                var printTextToSize = function(doc, label, value, initialPos, x, size) {
                    var linePos = initialPos, lineSpacing = 9;

                    doc.setDrawColor(0);
                    doc.setFillColor(230, 230, 230);
                    doc.rect(0, linePos - lineSpacing + 2, 210, lineSpacing, 'F');
                    doc.text(x, linePos, label); linePos += lineSpacing;

                    if (value && value.length > 0) {
                        var text = doc.splitTextToSize(value, size);
                        doc.text(x, linePos, text); linePos += text.length * lineSpacing;
                    } else {
                        doc.text(x, linePos, '-'); linePos += lineSpacing;
                    }
                    return linePos;
                }

                $scope.createPdf = function() {
                    var doc = new jsPDF('p', 'mm', [297, 210]), linePos = 50, xPos = 25, lineSize = 160;

                    // Title
                    doc.setFontSize(40);
                    centeredText(doc, 'Receipt', 30);

                    // Body
                    doc.setFontSize(20);
                    linePos = printTextToSize(doc, 'Name', $scope.entry.Name, linePos, xPos, lineSize);
                    linePos = printTextToSize(doc, 'Contact', $scope.entry.Contact__r ? $scope.entry.Contact__r.Name : '', linePos, xPos, lineSize);
                    linePos = printTextToSize(doc, 'Product', $scope.entry.Product__r ? $scope.entry.Product__r.Name : '', linePos, xPos, lineSize);
                    linePos = printTextToSize(doc, 'Quantity', String($scope.entry.Quantity__c), linePos, xPos, lineSize);
                    linePos = printTextToSize(doc, 'Status', $scope.entry.Status__c, linePos, xPos, lineSize);
                    linePos = printTextToSize(doc, 'Delivery Date', $filter('date')($scope.entry.Delivery_Date__c, 'MMM d, y'), linePos,
                        xPos, lineSize);
                    linePos = printTextToSize(doc, 'Authorized Users', $filter('userNamesFilter')($scope.entry.Authorized_Users__r), linePos,
                        xPos, lineSize);

                    // Signature
                    linePos += 20;
                    var originalCanvas = $scope.signaturePad._canvas;

                    // Create canvas for resizing
                    var resizeCanvas = document.createElement("canvas");
                    resizeCanvas.height = originalCanvas.height;
                    resizeCanvas.width = originalCanvas.width;

                    var resizeCtx = resizeCanvas.getContext('2d');
                    // Put original canvas contents to the resizing canvas
                    resizeCtx.drawImage(originalCanvas, 0, 0);

                    resample_hermite(resizeCanvas, resizeCanvas.width, resizeCanvas.height, resizeCanvas.width / 2, resizeCanvas.height / 2);

                    doc.addImage(resizeCanvas.toDataURL('image/png'), 'png', 60, linePos, 130, 35); linePos += 35;
                    doc.line(60, linePos, 190, linePos); // horizontal line

                    // save current signature
                    $scope.currentSignature = $scope.signaturePad.toDataURL();

                    return doc;
                }

                $scope.openModal = function() {
                    $scope.modal.show();
                };
                $scope.closeModal = function() {
                    $scope.modal.hide();
                };
                //Cleanup the modal when we're done with it!
                $scope.$on('$destroy', function() {
                        $scope.modal.remove();
                });

                $ionicModal.fromTemplateUrl('app/entry-upsert/pdf-modal.html', {
                        scope: $scope,
                        animation: 'slide-in-up'
                }).then(function(modal) {
                    $scope.modal = modal;
                });

                $scope.previewFile = function() {
                    $scope.openModal();
                    $scope.content = $sce.trustAsResourceUrl($scope.createPdf().output('datauristring'));
                }

                $scope.saveSignature = function() {
                    var body = $scope.createPdf().output('datauristring').split(',').pop(); // get base64 part only
                    var attachmentToCreate = {};
                    var attachmentSoup = config.soups['attachment'];
                    var allFields = attachmentSoup.updatedFields || attachmentSoup.fields;
                    allFields = _.difference(allFields, config.syncOptions.withoutFieldsWhenSyncUp);
                    _.each(allFields, function(fieldName){
                            attachmentToCreate[fieldName] = null;
                    });
                    attachmentToCreate['ParentId'] = $scope.entry.Id;
                    attachmentToCreate['Name'] = $scope.entry.Name + '.pdf';
                    attachmentToCreate['ContentType'] = 'application/pdf';
                    attachmentToCreate['Body'] = body;
                    storeService.createEntryLocal(attachmentSoup.name, attachmentToCreate).then(
                        function (result) {
                            $cordovaToast.showShortBottom('Saved');
                            $rootScope.$broadcast('forceSync', attachmentSoup);
                            $ionicNavBarDelegate.back();
                            // save to localstorage
                            $localStorage.set($scope.entry.Id, $scope.currentSignature);
                        }, function() {
                            $cordovaToast.showShortBottom('Failed to save receipt');
                        });
                }
            }
            // delete the entry
            $scope.delete = function() {
                var deleteConfirmPopup = $ionicPopup.confirm({
                        title: 'Confirm Delete',
                        template: 'Are you sure you want to delete this ' + $scope.pageTitle.toLowerCase() + '?'
                });

                deleteConfirmPopup.then(function(res) {
                        if (res) {
                            storeService.deleteEntryLocal(soup.name, $scope.entry).then(function(result) {
                                    $cordovaToast.showShortBottom('Deleted');
                                    $rootScope.$broadcast('forceSync', soup);
                                    $ionicNavBarDelegate.back();
                            }, function() {
                                $cordovaToast.showShortBottom('Failed to delete the ' + $scope.pageTitle.toLowerCase());
                            });
                        }
                });
            };

            //name: Hermite resize
            //about: Fast image resize/resample using Hermite filter with JavaScript.
            //author: ViliusL
            //demo: http://viliusle.github.io/miniPaint/
            function resample_hermite(canvas, W, H, W2, H2){
                var time1 = Date.now();
                W2 = Math.round(W2);
                H2 = Math.round(H2);
                var img = canvas.getContext("2d").getImageData(0, 0, W, H);
                var img2 = canvas.getContext("2d").getImageData(0, 0, W2, H2);
                var data = img.data;
                var data2 = img2.data;
                var ratio_w = W / W2;
                var ratio_h = H / H2;
                var ratio_w_half = Math.ceil(ratio_w/2);
                var ratio_h_half = Math.ceil(ratio_h/2);

                for(var j = 0; j < H2; j++){
                    for(var i = 0; i < W2; i++){
                        var x2 = (i + j*W2) * 4;
                        var weight = 0;
                        var weights = 0;
                        var weights_alpha = 0;
                        var gx_r = 0, gx_g = 0, gx_b = 0, gx_a = 0;
                        var center_y = (j + 0.5) * ratio_h;
                        for(var yy = Math.floor(j * ratio_h); yy < (j + 1) * ratio_h; yy++){
                            var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
                            var center_x = (i + 0.5) * ratio_w;
                            var w0 = dy*dy //pre-calc part of w
                            for(var xx = Math.floor(i * ratio_w); xx < (i + 1) * ratio_w; xx++){
                                var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
                                var w = Math.sqrt(w0 + dx*dx);
                                if(w >= -1 && w <= 1){
                                    //hermite filter
                                    weight = 2 * w*w*w - 3*w*w + 1;
                                    if(weight > 0){
                                        dx = 4*(xx + yy*W);
                                        //alpha
                                        gx_a += weight * data[dx + 3];
                                        weights_alpha += weight;
                                        //colors
                                        if(data[dx + 3] < 255)
                                            weight = weight * data[dx + 3] / 250;
                                        gx_r += weight * data[dx];
                                        gx_g += weight * data[dx + 1];
                                        gx_b += weight * data[dx + 2];
                                        weights += weight;
                                    }
                                }
                            }
                        }
                        data2[x2]     = gx_r / weights;
                        data2[x2 + 1] = gx_g / weights;
                        data2[x2 + 2] = gx_b / weights;
                        data2[x2 + 3] = gx_a / weights_alpha;
                    }
                }
                console.log("hermite = "+(Math.round(Date.now() - time1)/1000)+" s");
                canvas.getContext("2d").clearRect(0, 0, Math.max(W, W2), Math.max(H, H2));
                canvas.width = W2;
                canvas.height = H2;
                canvas.getContext("2d").putImageData(img2, 0, 0);
            }

            });
})();