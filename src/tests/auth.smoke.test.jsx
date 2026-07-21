import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import AccountSettings from '../components/AccountSettings'

// Mock Firebase
vi.mock('../services/firebase', () => ({
  auth: {},
  db: {}
}))

// Mock Contexts
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: null,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
    isUserDataLoaded: true,
    userData: null
  })
}))

vi.mock('../contexts/LiveConnectContext', () => ({
  useLiveConnect: () => ({})
}))

vi.mock('../contexts/PlayerContext', () => ({
  usePlayer: () => ({
    setCurrentTrack: vi.fn(),
    setIsPlaying: vi.fn()
  })
}))

describe('AccountSettings Smoke Test', () => {
  it('renders Google Sign In button when logged out', () => {
    render(
      <AccountSettings 
        isOpen={true} 
        onClose={() => {}} 
        isDarkMode={true} 
      />
    )
    expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument()
  })
})
