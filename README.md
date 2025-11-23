# NodePass


A proof-of-concept for an anonymous, multi-checkable public transport ticketing system built with React and packaged for Android using Capacitor. This project explores a privacy-focused approach to digital ticketing, where no personal data or user accounts are required.

## Key Features

-   **Anonymous Ticket Generation**: Create single-trip tickets and various passes (daily, weekly, monthly) without any personal data.
-   **Local Ticket Wallet**: Securely store and manage purchased tickets on the device using local storage.
-   **NFC-Based Verification**: An inspector mode allows for contactless ticket verification by scanning a user's phone or a compatible NFC tag.
-   **Peer-to-Peer Sharing (Beacon Mode)**: A user's phone can emulate an NFC card (Host Card Emulation) for a ticket inspector to scan, enabling a seamless and private verification process.
-   **Android APK Build**: The web application is packaged into a native Android app using Capacitor, complete with custom Java code for advanced NFC capabilities.

## Technology Stack

-   **Frontend**: React (with Vite), React Router, Tailwind CSS
-   **Mobile Integration**: Capacitor
-   **Android Native**: Custom Java plugins for NFC Host Card Emulation (HCE) and intent handling.
-   **Backend**: A simple Express.js server for managing rotating symmetric keys, intended for ticket verification.

## Getting Started

### Web Application (Development)

To run the application in a web browser for development.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/robertobendi/anonymousticket.git
    cd anonymousticket
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server and backend:**
    The project includes a small backend server for key management. The `dev:all` script starts both the Vite frontend and the backend server concurrently.
    ```bash
    npm run dev:all
    ```
    -   Frontend will be available at `http://localhost:3000`.
    -   Backend API will be available at `http://localhost:3001`.

### Building the Android APK

To build the application as a native Android APK with full NFC functionality.

#### Prerequisites

-   Java JDK (version 11 or higher)
-   Android SDK and command-line tools
-   `ANDROID_HOME` and `JAVA_HOME` environment variables must be set.

A helper script is provided to assist with setup on macOS:
```bash
./setup-android.sh
```

For detailed instructions, refer to `QUICK_BUILD.md`.

#### Automated Build

The repository includes a script that automates the entire build process.

1.  **Run the build script:**
    ```bash
    npm run build:android
    ```
    This script will:
    -   Generate build information.
    -   Build the React web assets.
    -   Sync the web assets with the native Android project using `npx cap sync`.
    -   Compile the Android project using Gradle to produce an APK.

2.  **Locate the APK:**
    The compiled debug APK will be located at:
    `android/app/build/outputs/apk/debug/app-debug.apk`

3.  **Install on a device:**
    ```bash
    adb install android/app/build/outputs/apk/debug/app-debug.apk
    ```

## How It Works: NFC Implementation

The application employs two primary NFC modes for ticket verification, leveraging custom native Android code for a robust experience.

#### 1. Sharing (Beacon Mode)

This is the primary mode for user-to-inspector ticket sharing.
-   When a user navigates to the **Wallet** page and taps "Start Beacon", the app activates a **Host Card Emulation (HCE)** service on Android (`WalletHceService.java`).
-   The user's phone begins to emulate a contactless NFC card, broadcasting a specific Application ID (AID) defined in `apduservice.xml`.
-   This allows an inspector's device to interact with the user's phone as if it were a standard NFC card, without needing to establish a peer-to-peer connection.

#### 2. Verification (Inspector Mode)

-   On the **Verify** page, the inspector's app actively listens for NFC events.
-   When held near a user's phone in Beacon Mode, the inspector's app detects the specific AID.
-   It then sends a sequence of APDU commands (`SELECT AID`, `GET DATA`) to the user's phone.
-   The `WalletHceService` on the user's phone responds with the JSON payload of their ticket wallet.
-   The inspector's app then parses this payload and verifies each ticket's validity.
- The system also uses a custom MIME type (`application/vnd.ch.sbb.anonymous.wallet`) to prioritize discovering app-specific NFC tags over other tag types.

## Project Structure

```
.
├── android/              # Native Android project managed by Capacitor
│   └── app/src/main/java/ch/sbb/anonymous/
│       ├── MainActivity.java     # Main entry point, handles NFC intents
│       ├── NfcPlugin.java        # Capacitor plugin for NFC
│       └── WalletHceService.java # Implements Host Card Emulation
├── scripts/              # Helper scripts (e.g., generate-build-info)
├── server/               # Express.js backend for key management
├── src/                  # React application source code
│   ├── components/       # Reusable UI components
│   ├── lib/              # Core logic and utilities
│   │   ├── nfc.js        # Cross-platform NFC wrappers
│   │   ├── ticketGenerator.js # Logic for creating and verifying tickets
│   │   └── wallet.js     # Manages the on-device ticket wallet
│   └── pages/            # Top-level page components
│       ├── Home.js       # Main page for purchasing tickets
│       ├── Verify.js     # Inspector's verification screen
│       └── Wallet.js     # User's ticket wallet and sharing screen
├── build-apk.sh          # Script to automate the Android APK build
└── setup-android.sh        # Helper to set up Android build environment