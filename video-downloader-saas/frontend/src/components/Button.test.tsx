import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  test('renders button with correct text', () => {
    render(<Button>Test Button</Button>);
    const buttonElement = screen.getByText(/test button/i);
    expect(buttonElement).toBeInTheDocument();
  });

  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const buttonElement = screen.getByText(/click me/i);
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies primary variant styles correctly', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const buttonElement = screen.getByText(/primary button/i);
    expect(buttonElement).toHaveClass('bg-primary-600');
    expect(buttonElement).toHaveClass('text-white');
  });

  test('applies secondary variant styles correctly', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const buttonElement = screen.getByText(/secondary button/i);
    expect(buttonElement).toHaveClass('bg-white');
    expect(buttonElement).toHaveClass('text-gray-700');
  });

  test('applies disabled state correctly', () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>
    );
    const buttonElement = screen.getByText(/disabled button/i);
    expect(buttonElement).toBeDisabled();
    fireEvent.click(buttonElement);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('renders with custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    const buttonElement = screen.getByText(/custom button/i);
    expect(buttonElement).toHaveClass('custom-class');
  });
});