# Singgah Coffee POS Mobile

React Native mobile app for Singgah Coffee POS system.

## Build Android APK

### Prerequisites
- Node.js 20+
- Expo CLI account (free at expo.dev)
- EAS CLI: `npm install -g eas-cli`

### Development Build
```bash
npm run build:android
```

### Production Build
```bash
npm run build:android:prod
```

### Manual EAS Build
```bash
eas login
eas build --platform android --profile preview
```

## Environment Variables

Create `.env` file:
```
EXPO_PUBLIC_API_URL=http://your-server-ip:8080/api
```

## Project Structure

```
app/
├── (app)/           # Authenticated screens
│   ├── dashboard.tsx  # Module cards
│   ├── pos.tsx        # POS terminal
│   ├── orders.tsx     # Order history
│   ├── products.tsx   # Product management
│   ├── ingredients.tsx # Inventory
│   ├── expenses.tsx   # Expenses
│   └── settings.tsx   # Settings
└── (auth)/          # Auth screens
    └── login.tsx      # Login screen

src/
├── types/           # Shared types
├── lib/             # API client
├── stores/          # Zustand stores
├── hooks/           # TanStack Query hooks
└── theme/           # Colors
```

## API Integration

Connects to Go backend at `/api` endpoints:
- `/auth/login` - Authentication
- `/products` - Product CRUD
- `/orders` - Order management
- `/ingredients` - Inventory
- `/expenses` - Expense tracking
- `/settings` - App settings