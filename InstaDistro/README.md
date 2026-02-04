# InstaDistro - Instagram Distribution App MVP

Professional Instagram multi-account content distribution app with 87 visual effects integration.

## Features

- **Multi-Account Management**: Connect and manage unlimited Instagram accounts
- **87 Professional Effects**: Apply artistic filters, frames, and effects to videos
- **30% Modification Rule**: Automated compliance tracking
- **Batch Distribution**: Upload to multiple accounts simultaneously
- **Beautiful UI**: Instagram-inspired design with smooth animations

## Tech Stack

- **Framework**: React Native (Expo)
- **UI Library**: React Native Paper
- **Navigation**: React Navigation
- **Animations**: React Native Reanimated 2
- **Storage**: AsyncStorage
- **Effects API**: Visual Effects Master API (https://saadmalik1-visual-effects.hf.space)

## Installation

```bash
cd InstaDistro
npm install
```

## Running the App

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

## Project Structure

```
InstaDistro/
├── src/
│   ├── screens/          # All app screens
│   │   ├── SplashScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── AccountsScreen.tsx
│   │   ├── VideosScreen.tsx
│   │   ├── VideoEditorScreen.tsx
│   │   ├── DistributionScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/       # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── services/         # Business logic & API
│   │   ├── effectsApi.ts
│   │   └── storage.ts
│   ├── theme/           # Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── paperTheme.ts
│   └── components/      # Reusable components (future)
├── App.tsx
└── package.json
```

## How to Use

### 1. Add Accounts
- Tap "Add Account" button on Accounts screen
- Enter Instagram username
- Accounts with proxy connections are marked as eligible

### 2. Add Videos
- Go to Videos tab
- Tap "Add Video" button
- Select a video from your library

### 3. Apply Effects
- Tap on any video to open the editor
- Select effects from 8 categories:
  - Distortion & Glitch
  - Color & Filters
  - Artistic & Edges
  - Blur & Morph
  - Adjustments
  - Decorative Frames
  - Masks & Overlays
  - Social & Premium Frames
- Watch the modification percentage increase
- Apply effects when satisfied (aim for 30%+)

### 4. Distribute
- After applying effects, tap "Distribute"
- Select target accounts
- Add optional caption
- Upload to all selected accounts

## Visual Effects API

The app integrates with the Visual Effects Master API:
- **Live API**: https://saadmalik1-visual-effects.hf.space
- **87 Effects Available**: Cartoon, vintage, neon, cinematic, and more
- **API Key**: `trusted_dev_key` (pre-configured)

### Effect Categories

1. **Distortion & Glitch** (10): rgb_split, pixelate, scanlines, ripple, twirl...
2. **Color & Filters** (10): invert, grayscale, sepia, posterize, thermal...
3. **Artistic & Edges** (10): canny_edges, neon_edges, cartoon, sketch...
4. **Blur & Morph** (10): blur_gaussian, motion_blur, zoom_blur...
5. **Adjustments** (11): sharpen, clahe, gamma_correction, gotham_filter...
6. **Decorative Frames** (5): frame_polaroid, frame_vlog, frame_vintage...
7. **Masks & Overlays** (15): mask_circle, overlay_light_leak, enhance_hdr...
8. **Social & Premium Frames** (16): frame_instagram, frame_tiktok, frame_cinematic...

## Design System

### Colors
- Primary: #E1306C (Instagram Pink)
- Secondary: #405DE6 (Instagram Blue)
- Success: #34C759
- Error: #FF3B30

### Typography
- Font: SF Pro Display (iOS), Roboto (Android)
- Scale: 11px - 34px with 8pt grid

### Spacing
- 8pt grid system (4, 8, 16, 24, 32, 40, 48, 64, 80px)

## Features Implemented

✅ Splash screen with animations
✅ 3-slide onboarding flow
✅ Account management (add, delete, set source)
✅ Video library with filters
✅ Video editor with 87 effects
✅ Real-time modification percentage
✅ Multi-account distribution
✅ Settings & app info
✅ Toast notifications
✅ Empty states
✅ Loading states
✅ Error handling

## Screenshots

The app follows the Instagram design language with:
- Clean, minimal interface
- Smooth animations
- Gesture-based interactions
- Bottom tab navigation
- Card-based layouts

## MVP Limitations

- Video processing is done via API (base64 encoding)
- Large videos may take time to process
- No actual Instagram API integration (simulated)
- Local storage only (no cloud sync)

## Future Enhancements

- [ ] Cloud storage integration
- [ ] Real Instagram API authentication
- [ ] Scheduled posting
- [ ] Analytics dashboard
- [ ] Video preview player
- [ ] Effect favorites
- [ ] Batch video processing
- [ ] Dark mode

## Credits

- **Effects API**: Visual Effects Master by maliksaad1
- **UI Inspiration**: Instagram, VSCO, TikTok
- **Icons**: Lucide React Native
- **Design System**: Material Design 3

## License

MVP for demonstration purposes.

---

Built with ❤️ using React Native & Expo
