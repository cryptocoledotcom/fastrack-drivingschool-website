import { render, screen } from '@testing-library/react';
import App from './App'; // The component under test
import { MemoryRouter } from 'react-router-dom';

// Mock the AuthContext to control its behavior in tests
jest.mock('./pages/Auth/AuthContext', () => ({
  // We use __esModule: true to ensure Jest treats this as an ES Module,
  // which is necessary when mocking modules that use default exports or mixed exports.
  __esModule: true,
  useAuth: () => ({
    user: { uid: 'test-uid', email: 'test@example.com' }, // Mock a logged-in user
    loading: false, // Set loading to false immediately for tests
    isLocked: false, // Assume not locked for tests
    logout: jest.fn(), // Provide a mock logout function if needed
  }),
  AuthProvider: ({ children }) => children, // Simply render children without internal logic
}));

test('renders welcome message', async () => {
  // Render the App component directly, as it already contains its own Router.
  // To suppress the future flag warning in tests, we can wrap it in a MemoryRouter,
  // which is a common practice for testing router-dependent components.
  render(
    <MemoryRouter><App /></MemoryRouter>
  );
  const welcomeElement = await screen.findByText(/The Driving Course You'll Actually Want to Take/i);
  expect(welcomeElement).toBeInTheDocument();
});