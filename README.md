# Smart Energy Monitoring System for Multi-Tenant Buildings

A comprehensive IoT-based energy monitoring solution for transparent electricity usage tracking in multi-tenant buildings with shared prepaid meters in Nigeria.

## 📋 Table of Contents
- [Overview](#overview)
- [System Components](#system-components)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Hardware Setup](#hardware-setup)
- [Software Setup](#software-setup)
- [Deployment Guide](#deployment-guide)
- [Usage](#usage)
- [Demo Video](#demo-video)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

This system addresses billing transparency issues in multi-tenant buildings where residents resort to sharing a single prepaid electricity meter due to shortage in distribution from DISCO. It provides:

- **Real-time monitoring** of individual unit consumption
- **Transparent billing** based on actual usage
- **Dispute resolution** through timestamped data logs
- **Property manager dashboard** for oversight
- **Mobile app** for tenants to track their consumption

**Problem Solved:** In Nigeria, many multi-tenant buildings share one prepaid meter, leading to unfair billing and disputes. This system monitors individual unit consumption while working with existing shared meter infrastructure.

## 🔗 Links

- **GitHub Repository:** [https://github.com/GChukwudi/E-Monitor](https://github.com/GChukwudi/E-Monitor)
- **Live (Web Dashboard):** [Your deployment URL]
- **Video Demonstration:** [Link to video]

---

## 🏗️ System Components

### 1. **Hardware (IoT Device)**
- **Microcontroller:** ESP32 DevKit V1
- **Sensors:**
  - ACS712 30A Current Sensor (AC measurement)
  - ZMPT101B Voltage Sensor (AC voltage measurement)
- **Communication:** WiFi (ESP32 built-in)
- **Power Supply:** 5V 2A adapter
- **Schematic Design**
- **PCB Design**

### 2. **Web Dashboard (Property Manager)**
- Built with React + Vite
- Real-time Firebase integration
- Multi-page navigation (Dashboard, Units, Analytics)
- PDF report generation
- Responsive design with custom CSS modules

### 3. **Mobile App (Tenants)**
- Cross-platform (Flutter)
- Real-time consumption tracking
- Credit monitoring
- Notifications for low credit

### 4. **Backend/Database**
- Firebase Realtime Database
- Real-time synchronization

## ✨ Features

### Property Manager Dashboard
- ✅ Overview with summary statistics
- ✅ Real-time unit monitoring
- ✅ Power consumption charts (Bar & Pie)
- ✅ Detailed analytics table
- ✅ Alert system for anomalies
- ✅ PDF report export
- ✅ Search and filter functionality

### Tenant Mobile App
- ✅ Personal consumption tracking
- ✅ Remaining credit display
- ✅ Usage history and trends
- ✅ Low credit alerts

### Hardware Device
- ✅ AC current measurement (30A)
- ✅ AC voltage measurement (250V - 1000V)
- ✅ Power calculation (P = V × I)
- ✅ WiFi data transmission
- ✅ Local data logging (SD card backup)
- ✅ Status LED indicators

---

## 🛠️ Technology Stack

### Hardware
- **Platform:** ESP32 (Espressif IoT Development Framework)
- **Programming:** C++ (Arduino Framework)
- **Sensors:** Analog sensors with ADC conversion
- **Design Tools:** 
  - EasyEDA (Schematic & PCB design)

### Web Dashboard
- **Frontend:** React 18 + Vite
- **Styling:** CSS Modules (no framework)
- **Charts:** Recharts
- **Icons:** Lucide React
- **PDF Generation:** html2pdf.js
- **Database:** Firebase Realtime Database

### Mobile App
- **Framework:** Flutter
- **State Management:** Provider/Riverpod
- **API Integration:** Firebase SDK
- **Platforms:** Android & iOS

### Cloud & Deployment
- **Database:** Firebase Realtime Database
- **Hosting:** Render
- **Version Control:** Git & GitHub

---

## 📁 Project Structure

```
smart-energy-monitor-iot/
├── firmware/
│       └── ElectricityMonitor.ino
├── property-dashboard/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── mobile_e_monitor/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── screens/
│   │   ├── widgets/
│   │   └── models/
│   └── pubspec.yaml
├── .env.example
├── README.md
└── LICENSE
```

---

## 🔧 Hardware Setup
### Wiring Diagram

[Hardware Schematic](./Schematic_Design_of_all_three_units.pdf)

### PCB Design

- [Top Layer](PCB_design/top_layer.png)
- [Bottom Layer](PCB_design/bottom_layer.png)

---

## 💻 Software Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- Firebase account
- Code editor (VS Code & Arduino IDE)

### 1. Clone Repository

```bash
git clone https://github.com/GChukwudi/E-Monitor.git
cd E-Monitor
```

### 2. Firebase Configuration

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Realtime Database
3. Get your config credentials
4. Create `.env` file in `web-dashboard/`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Web Dashboard Setup

```bash
cd web-dashboard
npm install
npm run dev
```

Visit `http://localhost:5173`

### 4. Hardware Firmware Setup

**Using Arduino IDE:**

1. Install Arduino IDE and ESP32 board support
2. Install required libraries:
   ```
   - WiFi (built-in)
   - HTTPClient (built-in)
   - ArduinoJson (via Library Manager)
   ```

3. Open `firmware/ElectricityMonitor.ino`

4. Update configuration in the sketch:
   ```cpp
   const char* ssid = "Your_WiFi_Name";
   const char* password = "Your_WiFi_Password";
   #define WEB_API_KEY = "Your_Firebase_Web_API Key";
   #define DATABASE_URL "Youre_Firebase_RDB_URL"
   const String UNIT_ID = "unit_001";
   ```

5. Select board: **ESP32 Dev Module**
6. Select port and upload
7. Open Serial Monitor (115200 baud) to view debug output

**Firmware Features:**
- AC current measurement using ACS712
- AC voltage measurement using ZMPT101B  
- RMS calculation for accurate AC measurements
- WiFi auto-reconnection
- Firebase real-time data push
- Status LED indicators
- Error handling and recovery

### 5. Mobile App Setup (Flutter)

```bash
cd mobile-app

# Install dependencies
flutter pub get

# Run on connected device/emulator
flutter run

```

**Configuration:**
- Update Firebase config into `lib/main.dart`
- Add your Firebase `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

---

### Hardware Deployment

1. **Upload Firmware:**
   - Flash `energy_monitor.ino` to each ESP32 unit
   - Configure unique `UNIT_ID` for each device (`unit_001`, `unit_002`, etc.)
   - Test WiFi connectivity via Serial Monitor

2. **Physical Installation:**
   - Install devices in electrical distribution panel
   - ⚠️ **Requires licensed electrician**
   - Connect ACS712 in series with unit's AC line
   - Connect ZMPT101B in parallel for voltage sensing
   - Secure all connections and test before powering on

3. **Verification:**
   - Check LED status (solid = connected, blinking = transmitting)
   - Verify Firebase data appears in console
   - Confirm sensor readings are accurate (compare with multimeter)

---

## 📖 Usage

### For Property Managers

1. **Access Dashboard:** Visit deployed web URL
2. **Monitor Units:** View real-time consumption on Dashboard page
3. **View Details:** Navigate to Units page for individual unit cards
4. **Analyze Data:** Check Analytics page for detailed table view
5. **Export Reports:** Click "Export Report" for PDF download
6. **Resolve Disputes:** Use timestamped data and reports

### For Tenants

1. **View Consumption:** Check real-time power usage
2. **Monitor Credit:** Track remaining prepaid credit
3. **Receive Alerts:** Get notifications for low credit

### System Data Flow

```
1. ESP32 sensors measure current & voltage
2. Calculate power consumption (P = V × I)
3. Send data to Firebase via WiFi
4. Dashboard/Mobile app fetch real-time data
5. Display consumption & calculate billing
```

---

## 🎥 Demo Video

**Duration:** 8 minutes

**Video Link:** [Insert YouTube/Vimeo link]

### Video Contents:
- ✅ System overview (30 seconds)
- ✅ Hardware demonstration with Arduino firmware (2 minutes)
  - ESP32 connections
  - Sensor readings via Serial Monitor
  - LED status indicators
  - Data transmission to Firebase
- ✅ Web dashboard walkthrough (3 minutes)
- ✅ Flutter mobile app demonstration (2 minutes)
- ✅ PDF report generation (30 seconds)

---

## 📈 Future Enhancements

- [ ] SMS alerts for low credit
- [ ] Historical data visualization (30-day trends)
- [ ] Energy consumption predictions using ML
- [ ] Integration with payment gateways
- [ ] Mobile app for property managers

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note:** This is an academic project demonstrating IoT integration, cloud computing, and full-stack development for social impact. For production deployment, consult certified electricians and comply with local electrical regulations.