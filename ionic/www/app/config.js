/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents configure module
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
(function() {
    angular.module('app')
        .constant('config', {
            soups: {
                contact: {
                    name: 'Contact',
                    fields: ['Id', 'OwnerId', 'FirstName', 'LastName', 'Title', 'Phone', 'Email', 'HomePhone', 'Department', 'LastModifiedDate'],
                    indexes: [{path: 'Id', type: 'string'}, {path: '__local__', type: 'string'}, {path: 'FirstName', type: 'string'}, {path: 'LastName', type: 'string'}, {path: 'Title', type: 'string'}]
                },
                product: {
                    name: 'Product__c',
                    fields: ['Id', 'OwnerId', 'Name', 'Description__c', 'Sku__c', 'LastModifiedDate'],
                    indexes: [{path: 'Id', type: 'string'}, {path: '__local__', type: 'string'}, {path: 'Name', type: 'string'}, {path: 'Description__c', type: 'string'}]
                },
                request: {
                    name: 'SampleRequest__c',
                    fields: ['Id', 'OwnerId', 'Name', 'Contact__r.Name', 'Contact__c', 'Product__r.Name', 'Product__c', 'Delivery_Date__c', 'Quantity__c', 'Status__c', '(SELECT User__r.Name, User__c FROM Authorized_Users__r)', 'LastModifiedDate'],
                    updatedFields: ['Contact__c', 'Product__c', 'Delivery_Date__c', 'Quantity__c', 'Status__c'],
                    indexes: [{path: 'Id', type: 'string'}, {path: '__local__', type: 'string'}, {path: 'Name', type: 'string'}]
                },
                sync: {
                    name: 'syncs_soup',
                    indexes: [{path: 'type', type: 'string'}]
                }
            },
            syncOptions: {
                mergeMode: 'LEAVE_IF_CHANGED',
                withoutFieldsWhenSyncUp: ['Id', 'OwnerId', 'LastModifiedDate']
            },
            debug: true,
            toastDuration: 2000,
            requestStatuses: ['Requested', 'Scheduled', 'Delivered'],
            dateFormat: 'yyyy-MM-ddTHH:mm:ss.sss'
        });
})();