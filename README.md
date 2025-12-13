# Attendance Voice Taker

A tablet-optimized web application that captures names and phone numbers via speech for event attendance. It utilizes Google's Gemini API for intelligent name formatting and phone number extraction, and offers CSV export functionality.

## Features
- 🎤 **Voice Input**: Quickly add attendees by speaking their Name and Phone Number.
- 🤖 **AI Processing**: Uses Gemini 2.5 Flash to correct spelling, capitalization, and format phone numbers.
- 📱 **Tablet Optimized**: Clean, touch-friendly UI designed for easy use on tablets.
- 📝 **Edit & Review**: Edit names and numbers manually if misheard.
- 📂 **CSV Export**: Download the final attendance list as a CSV file.

## Prerequisites

- **Node.js**: Ensure you have Node.js installed (v18 or higher recommended).
- **Google Gemini API Key**: You need an API key from Google AI Studio.

## Installation

1.  **Clone the repository** (if applicable) or download the source code.
2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Configuration

1.  **Set up the API Key**:
    *   Create a `.env` file in the root directory of the project.
    *   Add your Google Gemini API key to the file:
        ```env
        API_KEY=your_google_gemini_api_key_here
        ```
    *   *Note: This project uses parcel which injects `process.env.API_KEY` from the `.env` file.*

## Running the Application

1.  **Start the development server**:
    ```bash
    npm start
    ```
2.  **Open in Browser**:
    *   The application should automatically open at `http://localhost:1234`.
    *   Allow microphone permissions when prompted.

## Usage Guide

1.  **Record**: Tap the large microphone button and speak a name and number (e.g., "Jane Doe 555-0199").
2.  **Verify**: The transcribed entry will appear in the list. You can edit entries manually by tapping the pencil icon.
3.  **Finish**: Once all attendees are recorded, tap "Finish & Process".
4.  **Review**: The app will use AI to clean up the names and format numbers. Review the final list.
5.  **Export**: Click "Export to CSV" to download the attendance sheet.

## Troubleshooting

-   **Microphone not working**: Ensure your browser has permission to access the microphone and that you are using a supported browser (Chrome, Safari, Edge).
-   **API Errors**: Verify that your API key is correct in the `.env` file and that you have quota available.
