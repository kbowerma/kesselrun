## KesselRun
The purpose of this code is to demonstrate Salesforce object sync on a Hybrid (Ionic) app, and allow the ability to add a signature to an object and attach it as a pdf to that object.

Look at the word Doc in the docs dir for deployment instruction.   The package.json has a specific version of the Salesforce Mobile SDK however in some cases it may throw an error so the work around is to install it via Ionic with the following command.

```
ionic plugin add https://github.com/coderReview/SalesforceMobileSDK-CordovaPlugin.git
```


## Login
A demo org has been set up with the following credentials:
1.  run this code and login with member@topcoder.com / t0pc0d3r or guest@topcoder.com / t0pc0d3r
2.  If you want to point it to you sfdc org here is the unmanaged package for the object setup:
 [unamangaged package](https://login.salesforce.com/packaging/installPackage.apexp?p0=04t15000000l6nO)

See deployment guide in docs dir.
