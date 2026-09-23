import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { fetchHospitalsList } from './api';

jest.mock('./api');

const HOSPITALS = [
  { id: 1, name: 'Chandigarh Kidney Institute', city: 'Chandigarh', state: 'Chandigarh', pincode: '160017', specialties: ['kidney'], cost_estimate_min: 80000, cost_estimate_max: 180000, facilities: ['ICU'], bed_count: 120, accreditation_status: 'NABH Accredited', patient_volume: 2400, rating: 4.7 },
  { id: 2, name: 'Delhi Heart Institute', city: 'Delhi', state: 'Delhi NCR', pincode: '110029', specialties: ['cardiac'], cost_estimate_min: 150000, cost_estimate_max: 350000, facilities: ['ICU'], bed_count: 350, accreditation_status: 'NABH Accredited', patient_volume: 45000, rating: 4.8 },
];

beforeEach(() => {
  localStorage.clear();
  fetchHospitalsList.mockResolvedValue(HOSPITALS);
});

describe('Omni Health App Shell', () => {
  test('renders header brand', async () => {
    render(<App />);
    expect(screen.getByText('Omni Health')).toBeInTheDocument();
    await waitFor(() => expect(fetchHospitalsList).toHaveBeenCalled());
  });

  test('renders current navigation tabs', () => {
    render(<App />);
    expect(screen.getByText('Hospital Search')).toBeInTheDocument();
    expect(screen.getByText('Compare Matrix (0)')).toBeInTheDocument();
    expect(screen.getByText('Admin Management')).toBeInTheDocument();
  });

  test('renders demo-data notice instead of fake "verified" claims', async () => {
    render(<App />);
    // Exact string: the header badge is exactly "Demo Data"
    await screen.findByText('Demo Data');
  });

  test('shows backend connection error with retry when API fails', async () => {
    fetchHospitalsList.mockRejectedValue(new Error('Could not reach the server'));
    render(<App />);
    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

describe('Authentication', () => {
  test('opens auth modal when clicking log in', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Log In'));
    expect(screen.getByText('Log In to Omni Health')).toBeInTheDocument();
  });

  test('demo admin login grants admin view', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Log In'));
    await user.click(screen.getByText('Demo Admin'));
    await waitFor(() => expect(screen.getByText('Administrator Portal')).toBeInTheDocument());
  });

  test('signup path calls AuthService.signup (regression: register() was missing)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Log In'));
    await user.click(screen.getByText('Sign Up'));
    await user.type(screen.getByLabelText('Email Address'), 'newuser@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up \(patient\)/i }));
    // Header shows displayName (email prefix) with the assigned role
    await waitFor(() => expect(screen.getByText(/newuser \(user\)/)).toBeInTheDocument());
  });
});

describe('Admin gating', () => {
  test('admin page requires login', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Admin Management'));
    expect(await screen.findByText('Admin Access Required')).toBeInTheDocument();
  });
});
