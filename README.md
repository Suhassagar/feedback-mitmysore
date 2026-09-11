# College Feedback System

A comprehensive web application designed for educational institutions to collect, manage, and analyze feedback from students regarding their courses, departments, and overall college experience. 

## Features
- **Student Portal:** Easy-to-use interface for students to submit feedback securely.
- **Admin & Department Dashboards:** Powerful tools for administrators and department heads to view, manage, and analyze feedback data effectively.
- **Secure Authentication:** Role-based access control (Admin, Department, Student) to ensure data privacy and system integrity.
- **Modern & Responsive UI:** User-friendly design built with React, featuring smooth page transitions and interactive elements.

## Technology Stack
- **Frontend:** React (Vite), React Router DOM, Framer Motion (for animations), Axios, React Hot Toast
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Security:** bcrypt (password hashing), express-session (session management)

## Project Structure
- `/feedback-system`: Contains the frontend React application.
- `/backend`: Contains the Node.js/Express server, API endpoints, and database connection logic.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.
- [MySQL](https://www.mysql.com/) database server running.

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/college_feedback_system.git
   cd college_feedback_system
   ```

2. **Setup the Backend:**
   ```bash
   cd backend
   npm install
   ```
   *(Ensure you have configured your MySQL database connection in the backend environment variables or config files.)*
   ```bash
   npm start
   ```

3. **Setup the Frontend:**
   ```bash
   cd ../feedback-system
   npm install
   npm run dev
   ```

4. Open your browser and navigate to the local development server URL (typically `http://localhost:5173`).
