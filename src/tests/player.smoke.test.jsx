import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PlayerProvider, usePlayer } from '../contexts/PlayerContext'

// Mock capacitor plugins
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: () => ({})
}))
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {},
  Directory: {}
}))

// Test Component to consume PlayerContext
const TestPlayerConsumer = () => {
  const { currentTrack, isPlaying } = usePlayer()
  return (
    <div>
      <span data-testid="playing-status">{isPlaying ? 'Playing' : 'Paused'}</span>
      <span data-testid="track-title">{currentTrack?.title || 'No Track'}</span>
    </div>
  )
}

describe('PlayerContext Smoke Test', () => {
  it('initializes with correct default values', () => {
    render(
      <PlayerProvider>
        <TestPlayerConsumer />
      </PlayerProvider>
    )
    expect(screen.getByTestId('playing-status').textContent).toBe('Paused')
    expect(screen.getByTestId('track-title').textContent).toBe('No Track')
  })
})
