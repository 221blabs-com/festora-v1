# Festora - Event Management Platform

Festora is a modern, feature-rich event management platform built with Next.js 16, Firebase, and Tailwind CSS. It provides a seamless experience for event organizers to create and manage events, and for attendees to discover and purchase tickets.

## 🚀 Features

- **Modern UI/UX**: Built with Next.js 16, Tailwind CSS, and Framer Motion for smooth animations and a premium look.
- **Event Management**: Create, update, and manage events with ease.
- **Ticketing System**: Secure ticket purchasing and management.
- **QR Code Check-ins**: Built-in scanner functionality for organizers to check in attendees at the venue.
- **Role-based Access**:
  - **Admin**: System-wide control to manage events and users. (`/admin`)
  - **Organizer**: Dedicated dashboard for event check-ins and management. (`/checkin`)
  - **User**: Personal dashboard to view purchased tickets and profile. (`/dashboard`)
- **Real-time Analytics**: Track sales and attendance.
- **Authentication**: Secure user authentication via Firebase Auth and Admin SDK.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion, Tailwind Animate
- **Backend/Database**: Firebase (Firestore, Auth, Functions)
- **Icons**: Lucide React
- **Forms**: React Hook Form

## 📂 Project Structure

```
src/
├── app/
│   ├── admin/          # System admin dashboard (protected)
│   ├── checkin/        # Organizer check-in & scanning interface
│   ├── dashboard/      # User dashboard (tickets, profile)
│   ├── events/         # Public event listings and details
│   ├── api/            # Next.js API routes (e.g., payment, email)
│   └── ...
├── components/         # Reusable UI components
├── lib/                # Utilities and Firebase configuration
└── types/              # TypeScript definitions
```

## 🏁 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/festora.git
   cd festora
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add the following keys:

   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Admin & Organizer Access
   NEXT_PUBLIC_SYSTEM_ADMIN_USERNAME=admin
   NEXT_PUBLIC_SYSTEM_ADMIN_PASSWORD=secure_password
   NEXT_PUBLIC_SYSTEM_ADMIN_SESSION_KEY=festora_system_admin_session

   # Organizer Configuration
   NEXT_PUBLIC_ORGANIZER_SESSION_KEY=festora_organizer_session
   NEXT_PUBLIC_SESSION_EXPIRY_HOURS=24
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📱 Key Pages

- **Home**: [http://localhost:3000/](http://localhost:3000/) - Landing page.
- **Events**: [http://localhost:3000/events](http://localhost:3000/events) - Browse all events.
- **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin) - Add and manage events.
- **Organizer Check-in**: [http://localhost:3000/checkin](http://localhost:3000/checkin) - Scan tickets and verify attendees.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

