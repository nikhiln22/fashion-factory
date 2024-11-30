# Fashion Factory

Fashion Factory is a full-stack eCommerce platform designed to deliver a seamless shopping experience for users and a robust management toolkit for admins. Built with Node.js, MongoDB, and EJS templates, Fashion Factory combines security, user-friendly design, and powerful backend capabilities.

## Live Demo
Access the live demo of this project at https://fashionfactory.in.net/

## Features

- **User-Side Features:**
  - Secure Authentication: Google Auth, Forgot Password, and Email OTP verification for a safe and smooth login experience.
  - Beautiful Design: EJS templates for seamless, dynamic rendering.
  - Effortless Shopping: Cart, Wishlist, and Checkout, plus Men, Women, and Kids sections with sorting options for easy browsing.
  - Flexible Payments: Razorpay integration, Wallet feature, and Cash on Delivery to suit all preferences.
  - Order Management: PDF Invoice generation, easy Cancellation & Returns.
  - Promotions & Referrals: Coupon management and referral program to drive customer engagement.

- **Admin-Side Features:**
  - Product & Category Management: Streamlined tools for adding and managing products.
  - User & Offer Management: Efficient control of users, offers, and coupon.
  - Sales Analytics: Detailed reports with graph displays and PDF generation for insights and tracking.
  - Advanced Filtering: Filter sales reports for comprehensive data analysis.

## Technologies Used

- **Frontend:**
  - HTML: Provides the structural foundation and content layout for each page.
  - JavaScript: Provides dynamic functionality and interactivity.
  - EJS Template Engine: Renders server-side templates for dynamic and seamless content generation.
  - MagicZoom: Enables a smooth image zooming feature for a better user experience.
  - Bootstrap: Ensures responsive design across devices, improving accessibility and usability on mobile and desktop.
  - CSS: Adds custom styling for a polished, consistent look and feel throughout the site.
  - Charting Library: Generates interactive charts in the sales statistics section for better data visualization.

- **Backend:**
  - JavaScript: Serves as the core language for server-side logic and functionality.
  - Node.js: Provides a robust runtime environment for building scalable server-side applications.
  - REST APIs: Facilitates smooth, stateless communication between the frontend and backend.
  - MongoDB: A flexible, schema-less NoSQL database for efficient data storage and scalability.
  - Passport-Google-OAuth20: Implements Google Authentication for secure, quick logins.
  - Nodemailer: Manages email notifications, including OTP verifications and invoice delivery.
  - Razorpay: Handles secure payment processing, supporting various payment options for flexibility.
  - PDFKit: Generates PDF invoices, allowing users to download and view their receipts.
  - Multer: Supports multipart/form-data handling, especially useful for file uploads like images.

## Prerequisites

  - Node.js >= 14.0.0
  - npm >= 6.0.0
  - MongoDB

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/fashion-factory.git

2.Install dependencies:

    cd fashion-factory
    npm install

3.Configure environment variables:

    PORT=3000

    MONGODB_URL = mongodb+srv:##########:neo6lQjerEyggJky@#######.xdo0n.mongodb.net/********?retryWrites=true&w=majority&appName=########
    MONGODB_NAME = ***

    EMAIL="youremail@email.com"
    PASS="_ _ _ _(use app password)"
    
    RAZORPAY_KEY_ID="______(apikey)"
    RAZORPAY_SECRET="_____(api secret)"

    GOOGLE_CLIENT_ID="_______"
    GOOGLE_CLIENT_SECRET ="_______"
    
4.Run the application:

    npm app.js
