import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Maryam Hostel landing page', () => {
  render(<App />);
  expect(screen.getByText(/MARYAM HOSTEL/i)).toBeInTheDocument();
  expect(screen.getByText(/Where Comfort/i)).toBeInTheDocument();
});
