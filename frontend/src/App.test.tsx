import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('resident experience', () => {
  it('renders the consultation and plain-language privacy promise', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Have your say/i })).toBeInTheDocument()
    expect(screen.getByText(/A proof crosses the line/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Begin private response/i })).toBeEnabled()
  })
})

