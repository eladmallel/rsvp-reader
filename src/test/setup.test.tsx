import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Simple component for testing the setup
function HelloWorld() {
    return <h1>Hello, World!</h1>
}

describe('Test Setup', () => {
    it('should render a component', () => {
        render(<HelloWorld />)
        expect(screen.getByRole('heading')).toHaveTextContent('Hello, World!')
    })

    it('should have jest-dom matchers available', () => {
        render(<HelloWorld />)
        expect(screen.getByRole('heading')).toBeInTheDocument()
    })
})
