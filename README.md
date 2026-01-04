# Vintage Wizard

AI-powered vintage item identification and valuation tool for collectors, estate sale hunters, and resellers.

## Features

- **AI Image Analysis**: Photograph items and get instant identification, valuation, and market comparables using Google Gemini
- **Multi-Platform Market Comps**: Links to eBay Sold, Ruby Lane, 1stDibs, Discogs, LiveAuctioneers, and more
- **Listing Generator**: AI-crafted sales descriptions with customizable tone (salesy, nerdy, formal)
- **Inventory Management**: Track items with Keep/Sell/TBD status
- **Sharing**: Generate public links to share collections or individual items
- **PDF Export**: Create insurance/inventory reports

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, Lucide Icons
- **Backend**: Firebase (Auth, Firestore, Storage, Hosting)
- **AI**: Google Gemini 2.0 Flash
- **Build**: Create React App

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Auth, Firestore, and Storage enabled
- Google Gemini API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

### Development

```bash
npm start
```

### Production Build

```bash
npm run build
firebase deploy
```

## Project Structure

```
src/
├── config/          # Firebase and app constants
├── services/        # API integrations (Gemini, Analytics)
├── utils/           # Helper functions
├── components/      # React components by feature
│   ├── common/      # Shared UI components
│   ├── upload/      # Photo upload flow
│   ├── inventory/   # Item management
│   ├── auth/        # Login/Profile
│   └── sharing/     # Public sharing features
└── App.jsx          # Main app and routing
```

## Version History

- **0.1.0** - Initial modular refactor

## License

MIT
