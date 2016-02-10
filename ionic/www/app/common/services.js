/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents services module
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
(function() {
    'use strict';
    angular.module('app')
        .factory('util', function($q, $log){
            return {
                /**
                 * Convert callback style function to promise
                 * @param moduleName plug-in module name
                 * @param functionName the function name
                 * @returns {Function} the converted function
                 */                 
                makePromise: function(moduleName, functionName){
                    var retfn = function() {
                        var args = Array.prototype.slice.call(arguments);
                        var deferred = $q.defer();
                        var signature = moduleName + '#' + functionName;
                        args.push(function(result){
                            $log.info('success to invoke function ' + signature + ': ' + JSON.stringify(result));
                            deferred.resolve(result);
                        });
                        args.push(function(err){
                            $log.error('fail to invoke function ' + signature + ': ' + err);
                            deferred.reject(err);
                        });
                        $log.info('invoke function ' + signature + ': ' + JSON.stringify(arguments));
                        var caller = cordova.require(moduleName);
                        caller[functionName].apply(caller, args);
                        return deferred.promise;
                    }
                    return retfn;
                }
            }
        })
        .factory('$localStorage', function($window) {
            return {
                /**
                 * Set a key-value pair in local storage
                 * @param key the key
                 * @param value the value
                 */                
                set: function(key, value) {
                    $window.localStorage[key] = value;
                },
                /**
                 * Get a value by key from local storage
                 * @param key the key
                 * @param defaultValue the default value
                 * @returns {String} the value stored in local storage
                 */              
                get: function(key, defaultValue) {
                    return $window.localStorage[key] || defaultValue;
                },
                /**
                 * Delete a value in local storage
                 * @param key the key
                 */                 
                delete: function(key) {
                    delete $window.localStorage[key];
                },
                /**
                 * Set an object in local storage
                 * @param key the key
                 * @param value the value
                 */                 
                setObject: function(key, value) {
                    $window.localStorage[key] = JSON.stringify(value);
                },
                /**
                 * Get an object in local storage
                 * @param key the key
                 * @returns {Object} the object
                 */                 
                getObject: function(key) {
                    return JSON.parse($window.localStorage[key] || null);
                }
            };
        })
        .factory('storeService', function(util, $q, $log, $rootScope) {
            return {
                /**
                 * Register a soup in DB
                 * @param {String} soupName the soup name
                 * @param {Array} the indexes
                 * @returns {Promise} the promise
                 */                 
                registerSoup: util.makePromise('com.salesforce.plugin.smartstore', 'registerSoup'),

                /**
                 * Remove a soup in DB
                 * @param {String} soupName the soup name
                 * @returns {Promise} the promise
                 */  
                removeSoup: util.makePromise('com.salesforce.plugin.smartstore', 'removeSoup'),
                
                /**
                 * Check soup exist in DB
                 * @param {String} soupName the soup name
                 * @returns {Promise} the promise
                 */                  
                soupExists: util.makePromise('com.salesforce.plugin.smartstore', 'soupExists'),
                
                /**
                 * Show DB inspector
                 */                  
                showInspector: function() {
                    cordova.require("com.salesforce.plugin.smartstore").showInspector();
                },
                
                /**
                 * Get all entries in local DB
                 * @param {String} soupName the soup name
                 * @param {String} indexPath the sort index path
                 * @param {String} order the sort order 'ascending' or 'descending'
                 * @param {Number} pageSize the page size
                 * @returns {Promise} the promise
                 */                  
                getAllEntries: function(soupName, indexPath, order, pageSize){
                    var deferred = $q.defer();
                    var smartstore = cordova.require('com.salesforce.plugin.smartstore');
                    var query = smartstore.buildAllQuerySpec(indexPath, order, pageSize);
                    smartstore.querySoup(soupName, query, function(result){
                        deferred.resolve(result);
                    }, function(err){
                        deferred.reject(err);
                    });
                    return deferred.promise;
                },

                /**
                 * Get a specific entry by id in local DB
                 * @param {String} soupName the soup name
                 * @param {String|Number} entryId the entry id
                 * @returns {Promise} the promise
                 */                         
                getEntryById: function(soupName, entryId){
                    var deferred = $q.defer();
                    var smartstore = cordova.require('com.salesforce.plugin.smartstore');
                    smartstore.retrieveSoupEntries(soupName, [entryId], function(result){
                        deferred.resolve(result[0]);
                    }, function(err){
                        deferred.reject(err);
                    });
                    return deferred.promise;
                },

                /**
                 * Update or create an entry in local DB
                 * @param {String} soupName the soup name
                 * @param {Object} entry the entry to update or create
                 * @returns {Promise} the promise
                 */                    
                upsertSoupEntry: function(soupName, entry) {
                    var deferred = $q.defer();
                    var smartstore = cordova.require('com.salesforce.plugin.smartstore');
                    smartstore.upsertSoupEntries(soupName, [entry], function(result){
                        deferred.resolve(result);
                    }, function(err){
                        deferred.reject(err);
                    });
                    return deferred.promise;
                },

                /**
                 * Delete an entry in local DB
                 * @param {String} soupName the soup name
                 * @param {Object} entry the entry
                 * @returns {Promise} the promise
                 */  
                deleteEntryLocal: function(soupName, entry) {
                    entry.__local__ = true;
                    entry.__locally_deleted__ = true;
                    if(entry.__locally_created__){
                        return this.removeEntryById(soupName, entry._soupEntryId);
                    }else{
                        return this.upsertSoupEntry(soupName, entry);
                    }
                },

                /**
                 * Update an entry in local DB
                 * @param {String} soupName the soup name
                 * @param {Object} entry the entry
                 * @returns {Promise} the promise
                 */                 
                updateEntryLocal: function(soupName, entry) {
                    entry.__local__ = true;
                    entry.__locally_updated__ = true;
                    return this.upsertSoupEntry(soupName, entry);
                },

                /**
                 * Create an entry in local DB
                 * @param {String} soupName the soup name
                 * @param {Object} entry the entry
                 * @returns {Promise} the promise
                 */                  
                createEntryLocal: function(soupName, entry){
                    entry.__local__ = true;
                    entry.__locally_created__ = true;
                    entry.OwnerId = $rootScope.credentials.userId;
                    entry.attributes = {type: soupName};
                    return this.upsertSoupEntry(soupName, entry);
                },

                /**
                 * Remove an specific entry in local DB
                 * @param {String} soupName the soup name
                 * @param {String|Number} entryId the entry id
                 * @returns {Promise} the promise
                 */                 
                removeEntryById: function(soupName, entryId){
                    var deferred = $q.defer();
                    var smartstore = cordova.require('com.salesforce.plugin.smartstore');
                    smartstore.removeFromSoup(soupName, [entryId], function(result){
                        deferred.resolve(result);
                    }, function(err){
                        deferred.reject(err);
                    });
                    return deferred.promise;
                },

                /**
                 * Get the count of modified entries in local DB
                 * @param {String} soupName the soup name
                 * @returns {Promise} the promise
                 */                    
                getModifiedEntriesCount: function(soupName){
                    var deferred = $q.defer();
                    var smartstore = cordova.require('com.salesforce.plugin.smartstore');
                    var query = smartstore.buildSmartQuerySpec("select count(*) from {" + soupName + "} where " + "{" + soupName + ":__local__}=1", 1);
                    smartstore.runSmartQuery(query, function(result){
                        deferred.resolve(result.currentPageOrderedEntries[0]);
                    }, function(err){
                        deferred.reject(err);
                    });
                    return deferred.promise;
                },       

                /**
                 * Get specific entries by ids in local DB
                 * @param {String} soupName the soup name
                 * @param {Array} entryIds the entry ids
                 * @returns {Promise} the promise
                 */ 
                retrieveSoupEntries: util.makePromise('com.salesforce.plugin.smartstore', 'retrieveSoupEntries'),
                
                /**
                 * Excute a query id in local DB
                 * @param {String} soupName the soup name
                 * @param {Object} query the query
                 * @returns {Promise} the promise
                 */ 
                querySoup: util.makePromise('com.salesforce.plugin.smartstore', 'querySoup')
            };
        })
        .factory('syncService', function(util, $q, config) {
            return {
                /**
                 * Sync data down from server
                 * @param {String} soupName the soup name
                 * @param {Array} entityFields fields to sync down
                 * @param {String} whereClause the where clause
                 * @param {Object} options the options
                 */                 
                syncDown: function(soupName, entityFields, whereClause, options) {
                    var targetQuery = {
                        type: 'soql', 
                        query: "SELECT " + entityFields.join(', ') + " from " + soupName
                    };
                    if(whereClause){
                        targetQuery.query += ' where ' + whereClause;
                    }
                    cordova.require("com.salesforce.plugin.smartsync").syncDown(targetQuery, soupName, 
                        options || {mergeMode: config.syncOptions.mergeMode});
                },

                /**
                 * Sync up data in local DB to server
                 * @param {String} soupName the soup name
                 * @param {Array} entityFields fields to sync up
                 */                  
                syncUp: function(soupName, entityFields) {
                    var fields = _.difference(entityFields, config.syncOptions.withoutFieldsWhenSyncUp);
                    cordova.require("com.salesforce.plugin.smartsync").syncUp(soupName, 
                        {fieldlist: fields, mergeMode: config.syncOptions.mergeMode});
                }
            };
        })
        .factory('oauthService', function(util) {
            return {
                /**
                 * Login
                 */                 
                login: util.makePromise('com.salesforce.plugin.oauth', 'getAuthCredentials'),
                
                /**
                 * Logout
                 */                 
                logout: function() {
                    cordova.require("com.salesforce.plugin.oauth").logout();
                }
            };
        });
})();