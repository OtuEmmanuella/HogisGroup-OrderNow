"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import nodemailer from "nodemailer";

// Create a transporter for sending emails
const createTransporter = () => {
  // Use Gmail SMTP settings from environment variables
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    throw new Error("Email credentials not found. Please check your environment variables.");
  }

  console.log(`[CONVEX ACTION(createTransporter)] Initializing email transport with user: ${emailUser}`);

  return nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
    tls: {
      rejectUnauthorized: true
    },
    debug: true // Enable debug logs
  });
};

// Action to send a welcome email
export const sendWelcomeEmail = action({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { userId, email, name }) => {
    console.log(`[CONVEX ACTION(sendWelcomeEmail)] Sending welcome email to ${email} for user ${userId}`);

    try {
      const transporter = createTransporter();

      // Create email content
      const mailOptions = {
        from: '"Hogis OrderNow" <noreply@hogisordernow.com>',
        to: email,
        subject: "Welcome to Hogis OrderNow!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Hogis OrderNow, ${name}!</h2>
            <p>Thank you for joining our platform. We're excited to have you on board!</p>
            <p>With Hogis OrderNow, you can:</p>
            <ul>
              <li>Order delicious food from our menu</li>
              <li>Track your orders in real-time</li>
              <li>Save your favorite items for quick reordering</li>
            </ul>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Happy ordering!</p>
            <p>The Hogis OrderNow Team</p>
          </div>
        `,
      };

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log(`[CONVEX ACTION(sendWelcomeEmail)] Email sent: ${info.messageId}`);
      
      // For ethereal email, log the preview URL
      if (info.messageId && info.messageId.includes("ethereal")) {
        console.log(`[CONVEX ACTION(sendWelcomeEmail)] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }

      return { success: true, message: "Welcome email sent successfully" };
    } catch (error) {
      console.error(`[CONVEX ACTION(sendWelcomeEmail)] Error sending welcome email:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "An unknown error occurred while sending the welcome email" 
      };
    }
  },
});