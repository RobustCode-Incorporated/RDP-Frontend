import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboard } from './AdminDashboard';
import {
  assignDriverToOrder,
  fetchAdminDrivers,
  fetchAdminOrders,
  fetchAdminRestaurants,
} from '../../api/adminApi';

vi.mock('../../api/adminApi', () => ({
  assignDriverToOrder: vi.fn(),
  fetchAdminDrivers: vi.fn(),
  fetchAdminOrders: vi.fn(),
  fetchAdminRestaurants: vi.fn(),
}));

const mockedFetchAdminRestaurants = vi.mocked(fetchAdminRestaurants);
const mockedFetchAdminDrivers = vi.mocked(fetchAdminDrivers);
const mockedFetchAdminOrders = vi.mocked(fetchAdminOrders);
const mockedAssignDriverToOrder = vi.mocked(assignDriverToOrder);

const renderAdminDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminDashboard />
    </MemoryRouter>
  );

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading state and renders API data when requests succeed', async () => {
    mockedFetchAdminRestaurants.mockResolvedValue([
      {
        id: 1,
        name: 'Restaurant API',
        description: 'Demo',
        phoneNumber: '01010101',
        email: 'api@restaurant.test',
        address: 'Abidjan',
        city: 'Abidjan',
        country: 'Côte d’Ivoire',
        status: 'ACTIVE',
      },
    ]);
    mockedFetchAdminDrivers.mockResolvedValue([
      {
        id: 11,
        userId: 21,
        firstName: 'Aya',
        lastName: 'D.',
        email: 'aya@driver.test',
        phoneNumber: '07070707',
        vehicleType: 'Moto',
        vehiclePlate: 'AA-123-BB',
        availabilityStatus: 'AVAILABLE',
      },
    ]);
    mockedFetchAdminOrders.mockResolvedValue([
      {
        id: 501,
        restaurantId: 1,
        customerId: 99,
        driverId: null,
        status: 'PENDING',
        totalAmount: '12000',
        createdAt: '2026-07-15T08:00:00',
      },
    ]);

    renderAdminDashboard();

    expect(screen.getByText('Chargement des données admin...')).toBeInTheDocument();

    expect(await screen.findAllByText('Restaurant API')).not.toHaveLength(0);
    expect(screen.getByText('Aya D.')).toBeInTheDocument();
    expect(screen.getByText('#501')).toBeInTheDocument();
  });

  it('falls back to demo data and shows an error when all requests fail', async () => {
    mockedFetchAdminRestaurants.mockRejectedValue(new Error('network'));
    mockedFetchAdminDrivers.mockRejectedValue(new Error('network'));
    mockedFetchAdminOrders.mockRejectedValue(new Error('network'));

    renderAdminDashboard();

    expect(await screen.findByText(/Impossible de charger les données admin/i)).toBeInTheDocument();
    expect(await screen.findAllByText('Au Bois d’Ébène - Centre')).not.toHaveLength(0);
  });

  it('opens the order drawer and assigns an available driver', async () => {
    const user = userEvent.setup();

    mockedFetchAdminRestaurants.mockResolvedValue([
      {
        id: 1,
        name: 'Restaurant API',
        description: 'Demo',
        phoneNumber: '01010101',
        email: 'api@restaurant.test',
        address: 'Abidjan',
        city: 'Abidjan',
        country: 'Côte d’Ivoire',
        status: 'ACTIVE',
      },
    ]);
    mockedFetchAdminDrivers.mockResolvedValue([
      {
        id: 11,
        userId: 21,
        firstName: 'Aya',
        lastName: 'D.',
        email: 'aya@driver.test',
        phoneNumber: '07070707',
        vehicleType: 'Moto',
        vehiclePlate: 'AA-123-BB',
        availabilityStatus: 'AVAILABLE',
      },
    ]);
    mockedFetchAdminOrders.mockResolvedValue([
      {
        id: 501,
        restaurantId: 1,
        customerId: 99,
        driverId: null,
        status: 'PENDING',
        totalAmount: '12000',
        createdAt: '2026-07-15T08:00:00',
      },
    ]);
    mockedAssignDriverToOrder.mockResolvedValue({
      id: 501,
      restaurantId: 1,
      customerId: 99,
      driverId: 11,
      status: 'PENDING',
      totalAmount: '12000',
      createdAt: '2026-07-15T08:00:00',
    });

    renderAdminDashboard();

    expect(await screen.findAllByText('Restaurant API')).not.toHaveLength(0);
    await user.click(screen.getByRole('button', { name: /^Commandes$/ }));
    await user.click(screen.getAllByRole('button', { name: /^Voir$/ })[0]);

    expect(screen.getByRole('button', { name: 'Affecter' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Affecter' }));

    await waitFor(() => {
      expect(mockedAssignDriverToOrder).toHaveBeenCalledWith(501, 11);
    });

    expect(await screen.findByText('Chauffeur affecté avec succès.')).toBeInTheDocument();
  });
});