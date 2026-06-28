# Air Quality Advisor App

A comprehensive mobile application and backend system designed to help users monitor, predict, and understand Air Quality Index (AQI) levels. This project leverages advanced machine learning models and generative AI to provide real-time insights, safe routing, and personalized health advice.

## Features

- **AQI Prediction**: Predict air quality using multiple machine learning models (LSTM, Random Forest, LightGBM, Gradient Boosting, SVR, and Ridge Regression).
- **Explainable AI (XAI)**: Understand the 'why' behind AQI predictions with SHAP and LIME integrations.
- **Smart Routing**: Navigate safely with AQI-aware routing using OSMnx, minimizing your exposure to pollutants.
- **AQI Buddy**: An intelligent, generative AI-powered conversational assistant (powered by Google Gemini) for answering your air quality and health-related questions.
- **Firebase Authentication**: Secure user login and personalized experiences.
- **Interactive Maps & Charts**: Visualize pollution hotspots and historical trends directly in the app.

## Tech Stack

### Mobile Client (App)
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **Maps & Data**: React Native Maps, React Native Chart Kit
- **State Management & Network**: React Context API, Axios

### Backend Server
- **Framework**: FastAPI (Python)
- **Machine Learning**: TensorFlow (Keras), Scikit-Learn, LightGBM
- **Explainability**: SHAP, LIME
- **Routing**: OSMnx, NetworkX
- **AI Integration**: Google GenAI
- **Authentication**: Firebase Admin SDK

## Project Structure

```text
mobile-app/
├── app/              # React Native Expo frontend
│   ├── src/          # Components, screens, context, and utils
│   ├── App.js        # Entry point for the mobile app
│   └── package.json  # Client dependencies
└── server/           # FastAPI backend
    ├── api/          # API routers (buddy, explain, forecast, predict, route)
    ├── data/         # Datasets for AQI training and inference
    ├── models/       # Pre-trained ML models (.h5, .pkl, .joblib)
    ├── main.py       # FastAPI application entry point
    └── requirements.txt # Backend dependencies
```

## Getting Started

### Prerequisites
- Node.js & npm (for the Expo app)
- Python 3.9+ (for the FastAPI server)
- A Firebase Service Account key (for authentication)
- A Google Gemini API key (for the AQI Buddy)

### 1. Backend Setup (Server)

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Create and activate a Python virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure your environment variables:
   - Copy `example.env` to `.env`.
   - Fill in your `GEMINI_API_KEY` and your Firebase Service Account details.
5. Start the server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend Setup (App)

1. Navigate to the app directory:
   ```bash
   cd app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the API Base URL:
   - Make sure your app points to the correct backend server IP/URL (e.g. in `app/src/utils/api.js`).
4. Start the Expo development server:
   ```bash
   npm start
   ```

## License
MIT License
