

## script
```
nvm use v5.1.0
npm -g install cordova
npm -g install ionic
npm install -g ios-sim
ionic state reset
ionic run ios -target="iPad-Air"

```

### Versions

```
/Users/kylebowerman/.nvm/versions/node/v5.1.0/lib
├── cordova@6.0.0
├── foreman@1.4.1
├── grunt@0.4.5
├── grunt-cli@0.1.13
├── ionic@1.7.14
├── npm@3.3.12
├── sails@0.11.4
└── swagger@0.7.5

kbmbp4-6:~ kylebowerman$ nvm list
        v0.12.7
         v4.0.0
->       v5.1.0
         system
node -> stable (-> v5.1.0) (default)
stable -> 5.1 (-> v5.1.0) (default)
iojs -> N/A (default)

```
### Notes
For more information, check out [Salesforce Mobile SDK Development Guide](https://github.com/forcedotcom/SalesforceMobileSDK-Shared/blob/master/doc/mobile_sdk.pdf?raw=true)


###

Tried:
```
ionic plugin add https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin.git
```

This worked
