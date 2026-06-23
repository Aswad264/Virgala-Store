
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

export async function sendEmail(to, subject, text) {
  await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject, text });
}

export async function sendEmailWithAttachment(to, subject, text, fileBuffer, filename) {
  const mailOptions = { from: process.env.GMAIL_USER, to, subject, text };
  if (fileBuffer && filename) {
    mailOptions.attachments = [{ filename, content: fileBuffer }];
  }
  await transporter.sendMail(mailOptions);
}
