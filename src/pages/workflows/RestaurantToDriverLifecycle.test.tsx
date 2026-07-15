import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestaurantDashboard } from '../restaurant/RestaurantDashboard';
import { DriverDashboard } from '../driver/DriverDashboard';
import {
  fetchRestaurantOrders,
  readyRestaurantOrder,
  fetchRestaurantOrderHistory,
} from '../../api/restaurantApi';
import {
  completeDelivery,
  fetchMyDeliveries,
  pickupDelivery,
  startDelivery,
} from '../../api/driverApi';

vi.mock('../../api/restaurantApi', () => ({
  acceptRestaurantOrder: vi.fn(),
  fetchRestaurantOrderHistory: vi.fn(),
  fetchRestaurantOrders: vi.fn(),
  readyRestaurantOrder: vi.fn(),
  startPreparingRestaurantOrder: vi.fn(),
}));

vi.mock('../../api/driverApi', () => ({
  completeDelivery: vi.fn(),
  failDelivery: vi.fn(),
  fetchMyDeliveries: vi.fn(),
  pickupDelivery: vi.fn(),
  startDelivery: vi.fn(),
}));

const mockedFetchRestaurantOrders = vi.mocked(fetchRestaurantOrders);
const mockedReadyRestaurantOrder = vi.mocked(readyRestaurantOrder);
const mockedFetchRestaurantOrderHistory = vi.mocked(fetchRestaurantOrderHistory);

const mockedFetchMyDeliveries = vi.mocked(fetchMyDeliveries);
const mockedPickupDelivery = vi.mocked(pickupDelivery);
const mockedStartDelivery = vi.mocked(startDelivery);
const mockedCompleteDelivery = vi.mocked(completeDelivery);

describe('Restaurant -> Driver lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('covers restaurant handoff and driver pickup/transit/delivery transitions', async () => {
    const user = userEvent.setup();

    mockedFetchRestaurantOrders
      .mockResolvedValueOnce([
        {
          id: 9201,
          restaurantId: 10,
          customerId: 401,
          driverId: 11,
          status: 'PREPARING',
          totalAmount: '22000',
          createdAt: '2026-07-15T09:00:00',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9201,
          restaurantId: 10,
          customerId: 401,
          driverId: 11,
          status: 'READY_FOR_PICKUP',
          totalAmount: '22000',
          createdAt: '2026-07-15T09:00:00',
        },
      ]);

    mockedFetchRestaurantOrderHistory.mockResolvedValue([
      {
        id: 1,
        oldStatus: null,
        newStatus: 'PENDING',
        changedBy: 'restaurant@demo.com',
        createdAt: '2026-07-15T09:00:00',
      },
    ]);

    mockedReadyRestaurantOrder.mockResolvedValue({
      id: 9201,
      restaurantId: 10,
      customerId: 401,
      driverId: 11,
      status: 'READY_FOR_PICKUP',
      totalAmount: '22000',
      createdAt: '2026-07-15T09:00:00',
    });

    const restaurantView = render(
      <MemoryRouter initialEntries={['/restaurant']}>
        <RestaurantDashboard />
      </MemoryRouter>
    );

    await screen.findByText('Commande #9201');
    await user.click(screen.getByRole('button', { name: /Commande #9201/i }));
    await user.click(screen.getByRole('button', { name: 'Marquer prête' }));

    await waitFor(() => {
      expect(mockedReadyRestaurantOrder).toHaveBeenCalledWith(9201);
    });

    expect(await screen.findByText('La commande a été mise à jour avec succès.')).toBeInTheDocument();
    restaurantView.unmount();

    mockedFetchMyDeliveries
      .mockResolvedValueOnce([
        {
          id: 9201,
          pickupAddress: 'Restaurant Centre - Plateau',
          deliveryAddress: 'Cocody Angré 8e tranche',
          description: 'Livraison commande #9201',
          status: 'ASSIGNED',
          createdAt: '2026-07-15T09:02:00',
          updatedAt: null,
          restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
          customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
          driver: { id: 11 },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9201,
          pickupAddress: 'Restaurant Centre - Plateau',
          deliveryAddress: 'Cocody Angré 8e tranche',
          description: 'Livraison commande #9201',
          status: 'PICKED_UP',
          createdAt: '2026-07-15T09:02:00',
          updatedAt: '2026-07-15T09:10:00',
          restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
          customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
          driver: { id: 11 },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9201,
          pickupAddress: 'Restaurant Centre - Plateau',
          deliveryAddress: 'Cocody Angré 8e tranche',
          description: 'Livraison commande #9201',
          status: 'IN_TRANSIT',
          createdAt: '2026-07-15T09:02:00',
          updatedAt: '2026-07-15T09:15:00',
          restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
          customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
          driver: { id: 11 },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9201,
          pickupAddress: 'Restaurant Centre - Plateau',
          deliveryAddress: 'Cocody Angré 8e tranche',
          description: 'Livraison commande #9201',
          status: 'DELIVERED',
          createdAt: '2026-07-15T09:02:00',
          updatedAt: '2026-07-15T09:22:00',
          restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
          customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
          driver: { id: 11 },
        },
      ]);

    mockedPickupDelivery.mockResolvedValue({
      id: 9201,
      pickupAddress: 'Restaurant Centre - Plateau',
      deliveryAddress: 'Cocody Angré 8e tranche',
      description: 'Livraison commande #9201',
      status: 'PICKED_UP',
      createdAt: '2026-07-15T09:02:00',
      updatedAt: '2026-07-15T09:10:00',
      restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
      customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
      driver: { id: 11 },
    });

    mockedStartDelivery.mockResolvedValue({
      id: 9201,
      pickupAddress: 'Restaurant Centre - Plateau',
      deliveryAddress: 'Cocody Angré 8e tranche',
      description: 'Livraison commande #9201',
      status: 'IN_TRANSIT',
      createdAt: '2026-07-15T09:02:00',
      updatedAt: '2026-07-15T09:15:00',
      restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
      customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
      driver: { id: 11 },
    });

    mockedCompleteDelivery.mockResolvedValue({
      id: 9201,
      pickupAddress: 'Restaurant Centre - Plateau',
      deliveryAddress: 'Cocody Angré 8e tranche',
      description: 'Livraison commande #9201',
      status: 'DELIVERED',
      createdAt: '2026-07-15T09:02:00',
      updatedAt: '2026-07-15T09:22:00',
      restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
      customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
      driver: { id: 11 },
    });

    render(
      <MemoryRouter initialEntries={['/driver']}>
        <DriverDashboard />
      </MemoryRouter>
    );

    await screen.findByText('Livraison #9201');
    await user.click(screen.getByRole('button', { name: /Livraison #9201/i }));

    await user.click(screen.getByRole('button', { name: 'Marquer comme récupérée' }));
    await waitFor(() => expect(mockedPickupDelivery).toHaveBeenCalledWith(9201));

    await user.click(screen.getByRole('button', { name: 'Démarrer la livraison' }));
    await waitFor(() => expect(mockedStartDelivery).toHaveBeenCalledWith(9201));

    await user.click(screen.getByRole('button', { name: 'Marquer livrée' }));
    await waitFor(() => expect(mockedCompleteDelivery).toHaveBeenCalledWith(9201));

    expect(await screen.findByText('La livraison a été mise à jour avec succès.')).toBeInTheDocument();
  });
});
