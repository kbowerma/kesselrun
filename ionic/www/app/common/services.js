/*
* Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
*/

/**
* Represents services module
*
* Changes in 1.1:
* - added default page size
* - added support for Android devices
*
* @author TCSASSEMBLER, pvmagacho
* @version 1.1
*/
(function() {
        'use strict';
        angular.module('app')
        .factory('util', function($q, $log) {
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
                            args.push(function(result) {
                                    $log.info('success to invoke function ' + signature + ': ' + JSON.stringify(result));
                                    deferred.resolve(result);
                            });
                            args.push(function(err) {
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
        .factory('storeService', function($q, $log, $rootScope, $cordovaDevice, util, config) {
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
                    getAllEntries: function(soupName, indexPath, order, pageSize) {
                        var deferred = $q.defer();
                        var smartstore = cordova.require('com.salesforce.plugin.smartstore');
                        var query = smartstore.buildAllQuerySpec(indexPath, order, pageSize || config.defaultPageSize);
                        smartstore.querySoup(soupName, query, function(result) {
                                deferred.resolve(result);
                        }, function(err) {
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
                    getEntryById: function(soupName, entryId) {
                        var deferred = $q.defer();
                        var smartstore = cordova.require('com.salesforce.plugin.smartstore');
                        smartstore.retrieveSoupEntries(soupName, [entryId], function(result) {
                                deferred.resolve(result[0]);
                        }, function(err) {
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
                        smartstore.upsertSoupEntries(soupName, [entry], function(result) {
                                deferred.resolve(result);
                        }, function(err) {
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
                        entry.__locally_created__ = false;
                        entry.__locally_updated__ = false;
                        entry.__locally_deleted__ = true;
                        if (entry.__locally_created__) {
                            return this.removeEntryById(soupName, entry._soupEntryId);
                        } else {
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
                        entry.__locally_created__ = false;
                        entry.__locally_updated__ = true;
                        entry.__locally_deleted__ = false;
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
                        entry.__locally_updated__ = false;
                        entry.__locally_deleted__ = false;
                        entry.Id = _.uniqueId("local_" + (new Date()).getTime());
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
                    getModifiedEntriesCount: function(soupName) {
                        var deferred = $q.defer();
                        var smartstore = cordova.require('com.salesforce.plugin.smartstore');
                        var localValue = ($cordovaDevice.getPlatform() == 'Android') ? "'true'" : "1";
                        var query = smartstore.buildSmartQuerySpec("select count(*) from {" + soupName + "} where " + "{" + soupName + ":__local__}="+localValue, 1);
                        smartstore.runSmartQuery(query, function(result) {
                                deferred.resolve(_.flatten(result.currentPageOrderedEntries));
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
                        if (config.syncDownLimit) {
                            targetQuery.query += ' LIMIT ' + config.syncDownLimit;
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
        }).factory('oauthService', function ($rootScope, $q, $window, $http) {

            // The login URL for the OAuth process
            // To override default, pass loginURL in init(props)
            var loginURL = 'https://login.salesforce.com',

            // The Connected App client Id. Default app id provided - Not for production use.
            // This application supports http://localhost:8200/oauthcallback.html as a valid callback URL
            // To override default, pass appId in init(props)
            appId = '3MVG91ftikjGaMd8N0ghDU6FPIenz8JX0z3SQwW47ScwY9cJAZfMnNLxQmRS_t4shwilTcwp7kYsK6AuYB35m',

            // The force.com API version to use.
            // To override default, pass apiVersion in init(props)
            apiVersion = 'v34.0',

            // Keep track of OAuth data (access_token, refresh_token, and instance_url)
            oauth,

            // By default we store fbtoken in sessionStorage. This can be overridden in init()
            tokenStore = {},

            // if page URL is http://localhost:3000/myapp/index.html, context is /myapp
            context = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")),

            // if page URL is http://localhost:3000/myapp/index.html, serverURL is http://localhost:3000
            serverURL = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : ''),

            // if page URL is http://localhost:3000/myapp/index.html, baseURL is http://localhost:3000/myapp
            baseURL = serverURL + context,

            // Only required when using REST APIs in an app hosted on your own server to avoid cross domain policy issues
            // To override default, pass proxyURL in init(props)
            proxyURL = baseURL,

            // if page URL is http://localhost:3000/myapp/index.html, oauthCallbackURL is http://localhost:3000/myapp/oauthcallback.html
            // To override default, pass oauthCallbackURL in init(props)
            oauthCallbackURL = baseURL + '/oauthcallback.html',

            // Because the OAuth login spans multiple processes, we need to keep the login success and error handlers as a variables
            // inside the module instead of keeping them local within the login function.
            deferredLogin,

            // Reference to the Salesforce OAuth plugin
            oauthPlugin,

            // Whether or not to use a CORS proxy. Defaults to false if app running in Cordova or in a VF page
            // Can be overriden in init()
            useProxy = (window.cordova || window.SfdcApp) ? false : true,

            // managers
            managers = {};

            /*
            * Determines the request base URL.
            */
            function getRequestBaseURL() {
                var url;

                if (useProxy) {
                    url = proxyURL;
                } else if (oauth.instance_url) {
                    url = oauth.instance_url;
                } else {
                    url = serverURL;
                }

                // dev friendly API: Remove trailing '/' if any so url + path concat always works
                if (url.slice(-1) === '/') {
                    url = url.slice(0, -1);
                }

                return url;
            }

            function parseQueryString(queryString) {
                var qs = decodeURIComponent(queryString),
                obj = {},
                params = qs.split('&');
                params.forEach(function (param) {
                        var splitter = param.split('=');
                        obj[splitter[0]] = splitter[1];
                });
                return obj;
            }

            function toQueryString(obj) {
                var parts = [],
                i;
                for (i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
                    }
                }
                return parts.join("&");
            }

            function refreshTokenWithPlugin(deferred) {
                oauthPlugin.authenticate(
                    function (response) {
                        oauth.access_token = response.accessToken;
                        tokenStore.forceOAuth = JSON.stringify(oauth);
                        deferred.resolve();
                    },
                    function () {
                        console.log('Error refreshing oauth access token using the oauth plugin');
                        deferred.reject();
                    });
            }

            function refreshTokenWithHTTPRequest(deferred) {
                var params = {
                    'grant_type': 'refresh_token',
                    'refresh_token': oauth.refresh_token,
                    'client_id': appId
                },

                headers = {},

                url = useProxy ? proxyURL : loginURL;

                // dev friendly API: Remove trailing '/' if any so url + path concat always works
                if (url.slice(-1) === '/') {
                    url = url.slice(0, -1);
                }

                url = url + '/services/oauth2/token?' + toQueryString(params);

                if (!useProxy) {
                    headers["Target-URL"] = loginURL;
                }

                $http({
                        headers: headers,
                        method: 'POST',
                        url: url,
                        params: params
                })
                .success(function (data, status, headers, config) {
                        console.log('Token refreshed');
                        oauth.access_token = data.access_token;
                        tokenStore.forceOAuth = JSON.stringify(oauth);
                        deferred.resolve();
                })
                .error(function (data, status, headers, config) {
                        console.log('Error while trying to refresh token');
                        deferred.reject();
                });
            }

            function refreshToken() {
                var deferred = $q.defer();
                if (oauthPlugin) {
                    refreshTokenWithPlugin(deferred);
                } else {
                    refreshTokenWithHTTPRequest(deferred);
                }
                return deferred.promise;
            }

            /**
            * Initialize ForceNG
            * @param params
            *  appId (optional)
            *  loginURL (optional)
            *  proxyURL (optional)
            *  oauthCallbackURL (optional)
            *  apiVersion (optional)
            *  accessToken (optional)
            *  instanceURL (optional)
            *  refreshToken (optional)
            */
            function init(params) {
                if (params) {
                    appId = params.appId || appId;
                    apiVersion = params.apiVersion || apiVersion;
                    loginURL = params.loginURL || loginURL;
                    oauthCallbackURL = params.oauthCallbackURL || oauthCallbackURL;
                    proxyURL = params.proxyURL || proxyURL;
                    useProxy = params.useProxy === undefined ? useProxy : params.useProxy;

                    if (params.accessToken) {
                        if (!oauth) oauth = {};
                        oauth.access_token = params.accessToken;
                    }

                    if (params.instanceURL) {
                        if (!oauth) oauth = {};
                        oauth.instance_url = params.instanceURL;
                    }

                    if (params.refreshToken) {
                        if (!oauth) oauth = {};
                        oauth.refresh_token = params.refreshToken;
                    }
                }

                console.log("useProxy: " + useProxy);
            }

            /**
            * Discard the OAuth access_token. Use this function to test the refresh token workflow.
            */
            function discardToken() {
                delete oauth.access_token;
                tokenStore.forceOAuth = JSON.stringify(oauth);
            }

            /**
            * Called internally either by oauthcallback.html (when the app is running the browser)
            * @param url - The oauthCallbackURL called by Salesforce at the end of the OAuth workflow. Includes the access_token in the querystring
            */
            function oauthCallback(url) {
                // Parse the OAuth data received from Facebook
                var queryString,
                obj;

                if (url.indexOf("access_token=") > 0) {
                    queryString = url.substr(url.indexOf('#') + 1);
                    obj = parseQueryString(queryString);
                    oauth = obj;
                    tokenStore['forceOAuth'] = JSON.stringify(oauth);
                    if (deferredLogin) deferredLogin.resolve();
                } else if (url.indexOf("error=") > 0) {
                    queryString = decodeURIComponent(url.substring(url.indexOf('?') + 1));
                    obj = parseQueryString(queryString);
                    if (deferredLogin) deferredLogin.reject(obj);
                } else {
                    if (deferredLogin) deferredLogin.reject({status: 'access_denied'});
                }
            }

            /**
            * Login to Salesforce using OAuth. If running in a Browser, the OAuth workflow happens in a a popup window.
            */
            function login() {
                deferredLogin = $q.defer();
                loginWithPlugin();
                return deferredLogin.promise;
            }

            /**
            * Logout
            */
            function logout() {
                cordova.require("com.salesforce.plugin.oauth").logout();
            }

            function loginWithPlugin() {
                document.addEventListener("deviceready", function () {
                        oauthPlugin = cordova.require("com.salesforce.plugin.oauth");
                        if (!oauthPlugin) {
                            console.error('Salesforce Mobile SDK OAuth plugin not available');
                            if (deferredLogin) deferredLogin.reject({status: 'Salesforce Mobile SDK OAuth plugin not available'});
                            return;
                        }
                        oauthPlugin.getAuthCredentials(
                            function (creds) {
                                // Initialize ForceJS
                                init({accessToken: creds.accessToken, instanceURL: creds.instanceUrl, refreshToken: creds.refreshToken});
                                if (deferredLogin) deferredLogin.resolve(creds);
                            },
                            function (error) {
                                console.log(error);
                                if (deferredLogin) deferredLogin.reject(error);
                            });
                }, false);
            }

            /**
            * Gets the user's ID (if logged in)
            * @returns {string} | undefined
            */
            function getUserId() {
                return (typeof(oauth) !== 'undefined') ? oauth.id.split('/').pop() : undefined;
            }

            /**
            * Check the login status
            * @returns {boolean}
            */
            function isAuthenticated() {
                return (oauth && oauth.access_token) ? true : false;
            }

            /**
            * Lets you make any Salesforce REST API request.
            * @param obj - Request configuration object. Can include:
            *  method:  HTTP method: GET, POST, etc. Optional - Default is 'GET'
            *  path:    path in to the Salesforce endpoint - Required
            *  params:  queryString parameters as a map - Optional
            *  data:  JSON object to send in the request body - Optional
            */
            function request(obj) {
                var method = obj.method || 'GET',
                headers = {},
                url = getRequestBaseURL(),
                deferred = $q.defer();

                if (!oauth || (!oauth.access_token && !oauth.refresh_token)) {
                    deferred.reject('No access token. Login and try again.');
                    return deferred.promise;
                }

                // dev friendly API: Add leading '/' if missing so url + path concat always works
                if (obj.path.charAt(0) !== '/') {
                    obj.path = '/' + obj.path;
                }

                url = url + obj.path;

                headers["Authorization"] = "Bearer " + oauth.access_token;
                if (obj.contentType) {
                    headers["Content-Type"] = obj.contentType;
                }
                if (useProxy) {
                    headers["Target-URL"] = oauth.instance_url;
                }

                $http({
                        headers: headers,
                        method: method,
                        url: url,
                        params: obj.params,
                        data: obj.data
                })
                .success(function (data, status, headers, config) {
                        deferred.resolve(data);
                })
                .error(function (data, status, headers, config) {
                        if (status === 401 && oauth.refresh_token) {
                            refreshToken()
                            .success(function () {
                                    // Try again with the new token
                                    request(obj);
                            })
                            .error(function () {
                                    console.error(data);
                                    deferred.reject(data);
                            });
                        } else {
                            console.error(data);
                            deferred.reject(data);
                        }

                });

                return deferred.promise;
            }

            /**
            * Execute SOQL query
            * @param soql
            * @returns {*}
            */
            function query(soql) {
                return request({
                        path: '/services/data/' + apiVersion + '/query',
                        params: {q: soql}
                });
            }

            /**
            * Query the next set of records based on pagination.
            * @param url
            * @returns {*}
            */
            function queryMore(url) {
                var serviceData = 'services/data';
                var index = url.indexOf( serviceData );
                if (index > -1) {
                    url = url.substr(index + serviceData.length);
                }

                return request({
                        path: url
                });
            }

            // The public API
            return {
                init: init,
                login: login,
                logout: logout,
                getUserId: getUserId,
                isAuthenticated: isAuthenticated,
                request: request,
                query: query,
                queryMore: queryMore,
                discardToken: discardToken,
                oauthCallback: oauthCallback
            };

        });

        // Global function called back by the OAuth login dialog
        function oauthCallback(url) {
            var injector = angular.element(document.body).injector();
            injector.invoke(function (oauthService) {
                    oauthService.oauthCallback(url);
            });
        }
})();