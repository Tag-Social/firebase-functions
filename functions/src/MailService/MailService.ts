import * as nodemailer from 'nodemailer'; 
import { IMailServiceSysConfig } from './IMailServiceSysConfig'; 

/**
 * Mail service
 * 
 * GMail Service tobe injected into our Function to be used DI pattern
 */
export class MailService { 
  private _transporter: nodemailer.Transporter; 
  private _config: IMailServiceSysConfig; 

  constructor(config: IMailServiceSysConfig) { 
    this._config = config;
    this._transporter = nodemailer.createTransport({
      service: this._config.Service,
      auth: this._config.Auth
    });
  } 
  
  // Wrap sendMail into a promise so we can get/control feedback efficiently 
  // and reduce the use of multiple asyncs
  sendMail(to: string, subject: string, content: string) 
  : Promise<void> 
  { 
    let options = { 
      from: this._config.SMTPFromAddress, 
      to: to, 
      subject: subject, 
      text: content,
    } 
    return new Promise<void> ( 
      (resolve: (msg: any) => void,  reject: (err: Error) => void) => { 
          this._transporter.sendMail(options, (error, info) => { 
              if (error) { 
                console.log(`error: ${error}`); 
                reject(error); 
              } else { 
                  console.log(`Message Sent 
                    ${info.response}`); 
                  resolve(`Message Sent  
                    ${info.response}`); 
              } 
          }) 
        } 
    ); 
  } 
} 