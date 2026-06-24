# 🦸‍♂️ Community Hero - AI-Powered Hyperlocal Civic Resolution Platform

A cutting-edge, full-stack civic technology application built for the **Google Hackathon**. "Community Hero" empowers local citizens to actively identify, log, and map community hazards (like potholes, overflowing garbage, broken streetlights, or pipe leaks), while leveraging **Google Gemini AI** to automate routing, department categorizations, and severity forecasting in real-time.

---

## 🚀 Key Platform Features

### 1. 👥 Citizen Interface
- **Easy Onboarding**: Sign up and authenticate securely with Firebase Auth.
- **Dynamic Mapping**: Interactive, high-contrast Leaflet.js map with custom-colored severity markers (Blue/Yellow/Orange/Red) representing local complaints.
- **Smart GPS Detection**: Harness browser geolocation to pin exact coordinates or click anywhere on the Leaflet map to set custom resolution flags.
- **Gemini AI Auto-Categorizer**: Upload a picture or submit a description—Gemini AI automatically determines classification categories, predicts priority levels, and selects municipal department queues.
- **Public Discussions**: Post constructive comments, upvote neighboring reports, and track real-time resolution logs.
- **Points & Badges**: Earn **+20 Points** per report, upvoted feedback, and unlock badges like *First Responder*, *Civic Advocate*, and *Community Hero*.

### 2. 🏛️ Departmental Authority Terminal
- **Audit Center**: Review pending complaints filtered by Status, Department, or Priority severity.
- **Workflow Logging**: Track and manage issues through the lifecycle: `Reported` ➔ `Under Review` ➔ `Assigned` ➔ `In Progress` ➔ `Resolved` ➔ `Rejected`.
- **Proof of Resolution**: Log official action remarks and upload photo-evidence of resolved tickets to inform citizens immediately.

### 3. 🛡️ Central System Admin Control
- **Department Routing Override**: Overrule AI automated assignments and re-route tickets to specialized municipal cells.
- **AI Hotspot Insights**: Leverage Gemini AI to analyze active complaints across city blocks, identifying structural issues (e.g., systemic pipe decay or local waste grid bottlenecks) with recommendations.
- **User Directory**: View full registries, search points, and toggle roles between citizens and authorities.
- **CSV Data Exporter**: Instantly download complete, clean CSV tabular spreadsheets of all community reports with a single click.

---

## 🛠️ Unified Full-Stack Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS (configured for high-contrast accessibility).
- **Backend**: Express + Vite full-stack proxy architecture.
- **AI Engine**: Google AI Studio Gemini API (`gemini-2.5-flash` for high-speed categorization and clusters analysis).
- **Database**: Firebase Firestore.
- **Authentication**: Firebase Authentication (Email/Password credentials).
- **Mapping Tiles**: Leaflet.js paired with OpenStreetMap tiles (100% free and open-source, no billing APIs required).

---

## 📁 Project Directory Map

```text
├── firebase-applet-config.json    # Dynamically generated Firebase project credentials
├── firestore.rules                # Role-Based access control rules for Firestore
├── package.json                   # Full-stack dependencies and bundling scripts
├── server.ts                      # Express API backend, secure Gemini proxy, & asset router
├── src/
│   ├── App.tsx                    # Authentication router and master screen coordinator
│   ├── types.ts                   # Structured TypeScript type declarations
│   ├── main.tsx                   # Main entry point
│   ├── index.css                  # Tailwind styles and global font configurations
│   └── components/
│       ├── Navbar.tsx             # Global header with points counters, badges, and session logs
│       ├── CivicMap.tsx           # Leaflet wrapper featuring custom colored markers
│       ├── ReportIssueModal.tsx   # Issue logging modal with geolocation and Gemini AI
│       ├── CitizenDashboard.tsx   # Citizen's workspace, discussion boards, & voting tools
│       ├── AuthorityDashboard.tsx # Officials' audit list and proof uploading forms
│       └── AdminDashboard.tsx     # Admin's hotspot analyzer, user controller, and CSV exporter
```

---

## 🛠️ Step-by-Step Installation & Setup

### 1. Set Up Environment Variables
Create a `.env` file in the root of the project:
```env
GEMINI_API_KEY="your-google-ai-studio-api-key"
```

### 2. Run the App Locally (Vite + Express)
The app is fully configured to run both frontend Vite assets and the backend Express proxy on a single, unified development container:
```bash
# Install NPM packages
npm install

# Boot development environment
npm run dev
```

The application will bind to **`http://localhost:3000`** where you will see the unified dashboard!

### 3. Quick Hackathon Audits & Testing
To make evaluation fast and enjoyable, we have added **Quick Bypass Buttons** on the login screen. You can instantly access fully mock-populated accounts to explore different views:
- **Alex Mercer (Citizen)**: Spot issues, pin locations, run Gemini analysis, verify neighbor reports, and view comments.
- **Roger Smith (Authority)**: Review assigned municipal queues, log progress updates, and upload resolution photos.
- **System Admin**: Overrule routing, toggle citizen-authority roles, run Gemini Hotspot cluster analysis, and export data spreadsheets to Excel/CSV.
