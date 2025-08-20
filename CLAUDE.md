# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Vite
- `npm run build` - Build production bundle
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

## Architecture Overview

This is a React + TypeScript face swapping application built with Vite. The app uses a single-page application (SPA) pattern with client-side routing.

### Core Structure
- **App Component**: Main application container (`src/App.tsx`) manages view state and handles routing between different modes (home, single swap, multi swap, video swap, credits, history)
- **State Management**: Uses React hooks with local state, primarily managed through `useUser` custom hook
- **View System**: App uses a view-based navigation system rather than traditional routing for most functionality

### Key Features
- **Face Swap Modes**: Three distinct swap types - single face, multi-face, and video face swapping
- **Credit System**: Users have credits and free trials, managed through the `useUser` hook
- **History Tracking**: Swap results are stored in local state and displayed in history view
- **Responsive Design**: Built with Tailwind CSS for mobile-first responsive design

### Component Organization
- **Feature Components**: Each swap mode has its own component (`SingleFaceSwap`, `MultiFaceSwap`, `VideoFaceSwap`)
- **Shared Components**: Common UI elements like `Header`, `Footer`, `FloatingHelp`
- **Utility Components**: `BeforeAfterSlider`, `CreditSystem`, `SwapModeSelector`

### Data Flow
- User state flows from `useUser` hook down through props
- Swap completion triggers history updates and credit deductions
- All state is managed at the App level and passed down to components

### Type System
- Comprehensive TypeScript interfaces defined in `src/types/index.ts`
- Strong typing for user data, swap results, and component props
- Credit packages and swap modes defined as constants with proper typing

### Styling
- Tailwind CSS for utility-first styling
- Responsive design with mobile-first approach
- Consistent color scheme and component styling