import * as functions from 'firebase-functions';
import { MailService } from './MailService';
import { google } from 'googleapis';

/**
 * Send Mail Firebase Function
 * 
 * Sends mail whwnever a new document is added to Mail document.
 */
export const sendEmail = functions.firestore.document('/mail/{documentId}')
    .onCreate(async (snap) => {
      const funcConfig = functions.config();
      const clientID = funcConfig.smtpserver.provider_client_id ;
      const clientSecret = funcConfig.smtpserver.provider_client_secret;
      const refreshToken = funcConfig.smtpserver.provider_client_refresh_token;
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        clientID,
        clientSecret, 
        "https://developers.google.com/oauthplayground",
      );
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
      const tokens = await oauth2Client.getAccessToken();
      const accessToken = tokens.res?.data.access_token;
      const auth = {
        type: "OAuth2",
        user: funcConfig.smtpserver.auth_user,
        clientId: clientID,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
        accessToken: accessToken,
      }

      const gmailSMTPService = new MailService({
        Service:"gmail",
        Auth:auth,
        SMTPServerConnectionString : funcConfig.smtpserver.connection_string, 
        SMTPFromAddress : funcConfig.smtpserver.from_address,
      }); 

      try {
        const doc = snap.data();
        gmailSMTPService.sendMail( 
          doc.to,  
          snap.get("message.text"),  
          snap.get("message.subject")
          ).then((result_msg) => { 
            console.log(`Mail Document :(${JSON.stringify(doc)})`); 
            console.log(`sendMail results :(${result_msg})`); 
        }).catch(()=> "Something occured").finally(()=> "Finally done"); 

      } catch (error) {
        console.log(`Something went wrong sending mail :(${error})`); 
      }
});