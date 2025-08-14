import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App smoke', () => {
    it('renders two empty tracks and + track row', () => {
        render(<App />)
        expect(screen.getByText('Tracks')).toBeTruthy()
        expect(screen.getAllByText('Track 1').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Track 2').length).toBeGreaterThan(0)
        expect(screen.getByText('+ New track')).toBeTruthy()
    })
})
