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

      // Base URL for assets
      const baseUrl = "https://hogis-group-order-now.vercel.app";

      // Create email content with updated HTML template
      const mailOptions = {
        from: '"Hogis OrderNow" <noreply@hogisordernow.com>',
        to: email,
        subject: "Welcome to Hogis OrderNow!",
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Hogis OrderNow</title>
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    
    /* Custom Fonts */
    @font-face {
      font-family: 'Oldschool Grotesk';
      src: url('${baseUrl}/fonts/OldschoolGrotesk-ExtraBold.woff2') format('woff2');
      font-weight: 800;
      font-style: normal;
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Pally';
      src: url('${baseUrl}/fonts/Pally-Medium.otf') format('opentype');
      font-weight: 500;
      font-style: normal;
      font-display: swap;
    }
    
    /* Reset styles */
    body {
      margin: 0;
      padding: 0;
      background-color: #f8f8f8;
      font-family: 'Inter', Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Base styles */
    .main-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      max-width: 100%;
    }
    
    .header {
      border-bottom: 1px solid #e0e0e0;
      padding: 24px 0;
      text-align: center;
    }
    
    .header h1 {
      margin: 0;
      font-family: 'Oldschool Grotesk', serif;
      font-weight: 800;
      font-size: 32px;
      color: #7b1113; /* burgundy */
    }
    
    .header h1 span {
      color: #c8a250; /* gold */
    }
    
    .header p {
      margin: 8px 0 0;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #707070;
    }
    
    .hero-section {
      padding: 32px 24px;
      text-align: center;
    }
    
    .hero-section h2 {
      margin: 0 0 16px;
      font-family: 'Oldschool Grotesk', serif;
      font-weight: 800;
      font-size: 28px;
      color: #333333;
    }
    
    .hero-section h2 span {
      color: #7b1113; /* burgundy */
    }
    
    .hero-section p {
      margin: 0 0 24px;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #505050;
    }
    
    .hero-image {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    
    .features-section {
      padding: 24px;
      background-color: #fcfcfc;
    }
    
    .features-title {
      margin: 0 0 24px;
      font-family: 'Oldschool Grotesk', serif;
      font-weight: 800;
      font-size: 22px;
      color: #7b1113;
      text-align: center;
    }
    
    .feature-row {
      display: inline-block;
      width: 100%;
      margin-bottom: 16px;
    }
    
    .feature-box {
      padding: 16px;
      background-color: #f9f3e8; /* light cream */
      border-radius: 8px;
      margin-bottom: 16px;
    }
    
    .feature-icon {
      width: 48px;
      height: 48px;
      background-color: #7b1113;
      border-radius: 50%;
      margin: 0 auto 12px;
      text-align: center;
    }
    
    .feature-icon img {
      width: 24px;
      height: 24px;
      margin-top: 12px;
    }
    
    .feature-box h3 {
      margin: 0 0 8px;
      font-family: 'Pally', sans-serif;
      font-weight: 500;
      font-size: 18px;
      color: #333333;
      text-align: center;
    }
    
    .feature-box p {
      margin: 0;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #505050;
      text-align: center;
    }
    
    .features-image {
      width: 100%;
      max-height: 180px;
      object-fit: cover;
      border-radius: 8px;
      margin-top: 24px;
    }
    
    .locations-section {
      padding: 32px 24px;
      text-align: center;
    }
    
    .locations-title {
      margin: 0 0 24px;
      font-family: 'Oldschool Grotesk', serif;
      font-weight: 800;
      font-size: 22px;
      color: #7b1113;
      text-align: center;
    }
    
    .locations-intro {
      margin: 0 0 24px;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #505050;
    }
    
    .location-container {
      margin-bottom: 24px;
    }
    
    .location-card {
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    
    .location-image {
      width: 100%;
      height: 150px;
      object-fit: cover;
    }
    
    .location-details {
      padding: 16px;
    }
    
    .location-name {
      margin: 0 0 8px;
      font-family: 'Oldschool Grotesk', serif;
      font-weight: 800;
      font-size: 18px;
      color: #7b1113;
    }
    
    .location-amenities {
      margin: 0;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #505050;
    }
    
    .testimonial-section {
      padding: 32px 24px;
      background-color: #f9f3e8; /* light cream */
      border-radius: 8px;
      margin: 24px;
    }
    
    .testimonial-section h2 {
      margin: 0 0 24px;
      font-family: 'Oldschool Grotesk', serif;
      font-weight: 800;
      font-size: 22px;
      color: #7b1113;
      text-align: center;
    }
    
    .testimonial-text {
      position: relative;
      padding: 0 16px;
      margin-bottom: 24px;
    }
    
    .testimonial-text p {
      position: relative;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #505050;
      text-align: center;
      z-index: 1;
    }
    
    .testimonial-quote {
      position: absolute;
      font-family: 'Oldschool Grotesk', serif;
      font-size: 64px;
      color: #c8a250;
      opacity: 0.3;
    }
    
    .quote-left {
      top: -40px;
      left: 0;
    }
    
    .quote-right {
      bottom: -40px;
      right: 0;
    }
    
    .testimonial-author {
      text-align: center;
    }
    
    .author-image {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 8px;
    }
    
    .author-name {
      margin: 0 0 4px;
      font-family: 'Pally', sans-serif;
      font-weight: 500;
      font-size: 16px;
      color: #333333;
    }
    
    .author-title {
      margin: 0;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #707070;
    }
    
    .cta-section {
      padding: 32px 24px;
      text-align: center;
    }
    
    .cta-container {
      background: linear-gradient(to right, #7b1113, #c8a250);
      border-radius: 8px;
      padding: 1px;
    }
    
    .cta-content {
      background-color: #ffffff;
      border-radius: 7px;
      padding: 24px;
    }
    
    .cta-content h2 {
      margin: 0 0 16px;
      font-family: 'Oldschool Grotesk', serif;
      font-weight: 800;
      font-size: 24px;
      color: #7b1113;
    }
    
    .cta-content p {
      margin: 0 0 24px;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #505050;
    }
    
    .cta-button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #7b1113;
      color: #ffffff !important;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      border-radius: 6px;
      transition: background-color 0.3s;
    }
    
    .cta-button:hover {
      background-color: #c8a250;
    }
    
    .footer {
      padding: 24px;
      background-color: #f8f8f8;
      text-align: center;
    }
    
    .footer p {
      margin: 0 0 8px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #707070;
    }
    
    .subscription-notice {
      margin: 16px 0;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: #909090;
      font-style: italic;
    }
    
    .social-links {
      margin-bottom: 16px;
    }
    
    .social-icon {
      display: inline-block;
      width: 32px;
      height: 32px;
      margin: 0 8px;
      background-color: #7b1113;
      border-radius: 50%;
      text-align: center;
    }
    
    .social-icon img {
      width: 16px;
      height: 16px;
      margin-top: 8px;
    }
    
    .footer-links a {
      display: inline-block;
      margin: 0 8px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #7b1113;
      text-decoration: none;
    }
    
    .footer-links a:hover {
      text-decoration: underline;
    }
    
    @media only screen and (min-width: 480px) {
      .feature-container {
        display: table;
        width: 100%;
      }
      
      .feature-column {
        display: table-cell;
        width: 33.33%;
        vertical-align: top;
      }
      
      .feature-box {
        margin: 0 8px;
      }
      
      .location-container {
        display: table;
        width: 100%;
      }
      
      .location-column {
        display: table-cell;
        width: 33.33%;
        vertical-align: top;
      }
      
      .location-card {
        margin: 0 8px;
      }
    }
  </style>
</head>
<body>
  <div class="main-container">
    <!-- Header -->
    <div class="header">
      <h1>Hogis <span>Group</span></h1>
    </div>
    
    <!-- Hero Section -->
    <div class="hero-section">
      <h2>Welcome to <span>OrderNow</span>, ${name}!</h2>
      <p>Thank you for joining our platform. Your premium food ordering experience begins today. Enjoy seamless ordering with our exclusive service.</p>
      <img class="hero-image" src="https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&q=80&w=800" alt="Premium dining experience">
      <a href="${baseUrl}" class="cta-button">Place Your Order</a>
    </div>
    
    <!-- Features Section -->
    <div class="features-section">
      <h2 class="features-title">Why Choose OrderNow</h2>
      
      <div class="feature-container">
        <div class="feature-column">
          <div class="feature-box">
            <div class="feature-icon">
              <img src="https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.263.1/icons/clock.svg" alt="Quick Delivery">
            </div>
            <h3>Quick Delivery</h3>
            <p>Your orders delivered promptly to your doorstep, every time.</p>
          </div>
        </div>
        
        <div class="feature-column">
          <div class="feature-box">
            <div class="feature-icon">
              <img src="https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.263.1/icons/utensils.svg" alt="Premium Selection">
            </div>
            <h3>Premium Selection</h3>
            <p>Curated menu options from the finest restaurants in your area.</p>
          </div>
        </div>
        
        <div class="feature-column">
          <div class="feature-box">
            <div class="feature-icon">
              <img src="https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.263.1/icons/credit-card.svg" alt="Secure Payment">
            </div>
            <h3>Secure Payment</h3>
            <p>Safe and convenient payment methods for peace of mind.</p>
          </div>
        </div>
      </div>
      
      <div class="feature-container" style="margin-top: 16px;">
        <div class="feature-column">
          <div class="feature-box">
            <div class="feature-icon">
              <img src="https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.263.1/icons/map-pin.svg" alt="Real-time Tracking">
            </div>
            <h3>Real-time Tracking</h3>
            <p>Monitor your order from preparation to delivery with live updates.</p>
          </div>
        </div>
        
        <div class="feature-column">
          <div class="feature-box">
            <div class="feature-icon">
              <img src="https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.263.1/icons/users.svg" alt="Shared Cart">
            </div>
            <h3>Shared Cart</h3>
            <p>Create group orders with friends and family for a shared dining experience.</p>
          </div>
        </div>
      </div>
      
      <img class="features-image" src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800" alt="Delicious food being prepared">
    </div>
    
    <!-- Hogis Locations Section -->
    <div class="locations-section">
      <h2 class="locations-title">Our Calabar Branches</h2>
      <p class="locations-intro">Hogis Group is proud to offer three exceptional properties in Calabar, each with unique amenities and experiences.</p>
      
      <div class="location-container">
        <div class="location-column">
          <div class="location-card">
            <img class="location-image" src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800" alt="Hogis Luxury Suites">
            <div class="location-details">
              <h3 class="location-name">Hogis Luxury Suites</h3>
              <p class="location-amenities">Features: Gym, Restaurant, Cafe, Lounge, Hall</p>
            </div>
          </div>
        </div>
        
        <div class="location-column">
          <div class="location-card">
            <img class="location-image" src="https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800" alt="Hogis Royale & Apartment">
            <div class="location-details">
              <h3 class="location-name">Hogis Royale & Apartment</h3>
              <p class="location-amenities">Features: Cinema, Restaurant, Banquet Hall, Club Voltage, Lounges</p>
            </div>
          </div>
        </div>
        
        <div class="location-column">
          <div class="location-card">
            <img class="location-image" src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800" alt="Hogis Exclusive Suites">
            <div class="location-details">
              <h3 class="location-name">Hogis Exclusive Suites</h3>
              <p class="location-amenities">Features: Restaurant, Lounge</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Testimonial Section -->
    <div class="testimonial-section">
      <h2>What Our Customers Say</h2>
      
      <div class="testimonial-text">
        <span class="testimonial-quote quote-left">"</span>
        <p>The OrderNow service from Hogis Group has completely transformed how our office handles lunch orders. The interface is elegant, ordering is simple, and the food quality is outstanding. It's become an essential part of our workplace culture.</p>
        <span class="testimonial-quote quote-right">"</span>
      </div>
      
      <div class="testimonial-author">
        <img class="author-image" src="https://images.unsplash.com/photo-1721322800607-8c38375eef04?auto=format&fit=crop&q=80&w=200" alt="Emmanuella Otu">
        <p class="author-name">Emmanuella Otu</p>
        <p class="author-title">Data Analyst | M & E Officer, Hogis Group</p>
      </div>
    </div>
    
    <!-- CTA Section -->
    <div class="cta-section">
      <div class="cta-container">
        <div class="cta-content">
          <h2>Ready to Order?</h2>
          <p>Experience the convenience and elegance of OrderNow. Your first order includes a special welcome gift.</p>
          <a href="${baseUrl}/order" class="cta-button">Get Started Now</a>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="social-links">
        <a href="${baseUrl}/social/facebook" class="social-icon">
          <img src="https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.263.1/icons/facebook.svg" alt="Facebook">
        </a>
        <a href="${baseUrl}/social/twitter" class="social-icon">
          <img src="https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.263.1/icons/twitter.svg" alt="Twitter">
        </a>
        <a href="${baseUrl}/social/instagram" class="social-icon">
          <img src="https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.263.1/icons/instagram.svg" alt="Instagram">
        </a>
      </div>
      
      <div class="footer-links">
        <a href="${baseUrl}/privacy">Privacy Policy</a>
        <a href="${baseUrl}/terms">Terms of Service</a>
        <a href="${baseUrl}/unsubscribe?email=${email}">Unsubscribe</a>
      </div>
      
      <p>&copy; ${new Date().getFullYear()} Hogis Group. All rights reserved.</p>
      <p class="subscription-notice">You are receiving this email because you signed up for the Hogis Group OrderNow service.</p>
    </div>
  </div>
</body>
</html>
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