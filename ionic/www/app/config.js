/*
* Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
*/

/**
* Represents configure module
*
* Changes in 1.1:
* - Added readOnly/writeOnly properties to soup
* - Added syncInterval and removalInterval to syncOptions
* - Added defaultPageSize and syncDownLimit
* - Removed toastDuration
* - Added attachment soup
*
* @author TCSASSEMBLER, pvmagacho
* @version 1.1
*/
(function() {
        angular.module('app')
        .constant('config', {
                soups: {
                    contact: {
                        name: 'Contact',
                        fields: ['Id', 'OwnerId', 'FirstName', 'LastName', 'Title', 'Phone', 'Email', 'HomePhone', 'Department', 'LastModifiedDate'],
                        indexes: [{path: 'Id', type: 'string'}, {path: '__local__', type: 'string'}, {path: 'FirstName', type: 'string'},
                        {path: 'LastName', type: 'string'}, {path: 'Title', type: 'string'}],
                        readOnly: true,
                        writeOnly: false
                    },
                    product: {
                        name: 'Product__c',
                        fields: ['Id', 'OwnerId', 'Name', 'Description__c', 'Sku__c', 'LastModifiedDate'],
                        updatedFields: ['Name', 'Description__c', 'Sku__c'],
                        indexes: [{path: 'Id', type: 'string'}, {path: '__local__', type: 'string'}, {path: 'Name', type: 'string'},
                        {path: 'Description__c', type: 'string'}],
                        readOnly: false,
                        writeOnly: false
                    },
                    request: {
                        name: 'SampleRequest__c',
                        fields: ['Id', 'OwnerId', 'Name', 'Contact__r.Name', 'Contact__c', 'Product__r.Name', 'Product__c', 'Delivery_Date__c', 'Quantity__c', 'Status__c', '(SELECT User__r.Name, User__c FROM Authorized_Users__r)', 'LastModifiedDate'],
                        updatedFields: ['Contact__c', 'Product__c', 'Delivery_Date__c', 'Quantity__c', 'Status__c'],
                        indexes: [{path: 'Id', type: 'string'}, {path: '__local__', type: 'string'}, {path: 'Name', type: 'string'}],
                        readOnly: false,
                        writeOnly: false
                    },
                    attachment: {
                        name: 'Attachment',
                        fields: ['Id', 'OwnerId', 'ParentId', 'ContentType', 'Name', 'Body', 'LastModifiedDate'],
                        updatedFields: ['ParentId', 'Name', 'ContentType', 'Body'],
                        indexes: [{path: 'Id', type: 'string'}, {path: '__local__', type: 'string'}, {path: 'Name', type: 'string'}],
                        readOnly: false,
                        writeOnly: true
                    }
                },
                syncOptions: {
                    mergeMode: 'LEAVE_IF_CHANGED',
                    syncInterval: 5 * 60 * 1000, // milliseconds
                    removalInterval: 30 * 1000, // milliseconds
                    withoutFieldsWhenSyncUp: ['Id', 'OwnerId', 'LastModifiedDate']
                },
                debug: true,
                requestStatuses: ['Requested', 'Scheduled', 'Delivered'],
                dateFormat: 'yyyy-MM-ddTHH:mm:ss.sss',
                defaultPageSize: 10000,
                syncDownLimit: 10000
        });
})();