# Mail Service

This is a simple Document Triggered Firebase Function that sends mail to using an SMTP server. Currently this is set to use GMAIL but can be configured to use any SMTP server.


## Simple set up

Create and setup the Firebase project:
 1. Create a Firebase project using the [Firebase Developer Console](https://console.firebase.google.com).
 1. Enable Billing on your Firebase the project by switching to the **Blaze** plan, this is currently needed to be able to perform HTTP requests to external services from a Cloud Function.

Running it locally:
 1. Clone the project
 1. Set environment variables or Firebase Function config, see Deploy your project section below.
 1. Run `npm run-script build` then `firebase emulators:start`, once the emulator is up, you will need to populate the database
 1. Example: `{"message":{"subject":"subject of mail","text":"sample text"},"to":"email"}`
 
Deploy your project:
 1. Set the below values and run it to configure Functon Config or env variables
    ```bash
    firebase functions:config:set smtpserver.connection_string="<connection string>" smtpserver.from_address="<admin's from e.address>" smtpserver.auth_user="<auth user e.address>" provider.client_id ="<client id>" client_secret="<client_secret>" client_refresh_token="<client_refresh_token>"
    ```
 1. Run `firebase use --add` and choose your Firebase project. This will configure the Firebase CLI to use the correct project locally.
 1. Run `firebase deploy` to effectively deploy the sample. The first time the Functions are deployed the process can take several minutes.
