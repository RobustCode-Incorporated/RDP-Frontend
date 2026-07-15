import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestaurantDashboard } from './RestaurantDashboard';
import {
  acceptRestaurantOrder,
  fetchRestaurantOrders,
  fetchRestaurantOrderHistory,
  readyRestaurantOrder,
  startPreparingRestaurantOrder,
} from '../../api/restaurantApi';

vi.mock('../../api/restaurantApi', () => ({
  acceptRestaurantOrder: vi.fn(),
  fetchRestaurantOrders: vi.fn(),
  fetchRestaurantOrderHistory: vi.fn(),
  readyRestaurantOrder: vi.fn(),
  startPreparingRestaurantOrder: vi.fn(),
}));

const mockedFetchRestaurantOrders = vi.mocked(fetchRestaurantOrders);
const mockedFetchRestaurantOrderHistory = vi.mocked(fetchRestaurantOrderHistory);
const mockedAcceptRestaurantOrder = vi.mocked(acceptRestaurantOrder);
const mockedStartPreparingRestaurantOrder = vi.mocked(startPreparingRestaurantOrder);
const mockedReadyRestaurantOrder = vi.mocked(readyRestaurantOrder);

const renderRestaurantDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/restaurant']}>
      <RestaurantDashboard />
    </MemoryRouter>
  );

describe('RestaurantDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads restaurant orders and renders the workflow entry points', async () => {
    mockedFetchRestaurantOrders.mockResolvedValue([
      {
        id: 9001,
        restaurantId: 10,
        customerId: 401,
        driverId: null,
        status: 'PENDING',
        totalAmount: '25000',
        createdAt: '2026-07-15T07:35:00',
      },
    ]);

    renderRestaurantDashboard();

    expect(screen.getByText('Chargement des commandes restaurant...')).toBeInTheDocument();
    expect(await screen.findByText('Commande #9001')).toBeInTheDocument();
    expect(await screen.findAllByText('En attente')).not.toHaveLength(0);
  });

  it('shows demo fallback data when loading fails', async () => {
    mockedFetchRestaurantOrders.mockRejectedValue(new Error('network'));

    renderRestaurantDashboard();

    expect(
      await screen.findByText(/Impossible de charger les commandes du restaurant/i)
    ).toBeInTheDocument();
    expect(await screen.findByText('Commande #7001')).toBeInTheDocument();
  });

  it('opens the order drawer and accepts a pending order', async () => {
    const user = userEvent.setup();

    mockedFetchRestaurantOrders.mockResolvedValue([
      {
        id: 9001,
        restaurantId: 10,
        customerId: 401,
        driverId: null,
        status: 'PENDING',
        totalAmount: '25000',
        createdAt: '2026-07-15T07:35:00',
      },
    ]);
    mockedAcceptRestaurantOrder.mockResolvedValue({
      id: 9001,
      restaurantId: 10,
      customerId: 401,
      driverId: null,
      status: 'ACCEPTED',
      totalAmount: '25000',
      createdAt: '2026-07-15T07:35:00',
    });
    mockedFetchRestaurantOrderHistory.mockResolvedValueOnce([
      {
        id: 11,
        oldStatus: null,
        newStatus: 'PENDING',
        changedBy: 'Client de test',
        createdAt: '2026-07-15T07:35:00',
      },
    ]);
    mockedFetchRestaurantOrderHistory.mockResolvedValueOnce([
      {
        id: 12,
        oldStatus: 'PENDING',
        newStatus: 'ACCEPTED',
        changedBy: 'Cuisine de test',
        createdAt: '2026-07-15T07:40:00',
      },
    ]);

    renderRestaurantDashboard();

    await screen.findByText('Commande #9001');
    await user.click(screen.getByRole('button', { name: /Commande #9001/i }));

    expect(await screen.findByText('En attente de validation par la cuisine.')).toBeInTheDocument();
    expect(await screen.findAllByText('Créée')).not.toHaveLength(0);

    expect(screen.getByRole('button', { name: 'Accepter la commande' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Accepter la commande' }));

    await waitFor(() => {
      expect(mockedAcceptRestaurantOrder).toHaveBeenCalledWith(9001);
    });

    expect(await screen.findByText('La commande a été mise à jour avec succès.')).toBeInTheDocument();
  });

  it('renders the handoff summary and status history for ready orders', async () => {
    const user = userEvent.setup();

    mockedFetchRestaurantOrders.mockResolvedValue([
      {
        id: 9003,
        restaurantId: 10,
        customerId: 403,
        driverId: 11,
        status: 'READY_FOR_PICKUP',
        totalAmount: '32000',
        createdAt: '2026-07-15T06:42:00',
      },
    ]);
    mockedFetchRestaurantOrderHistory.mockResolvedValue([
      {
        id: 31,
        oldStatus: null,
        newStatus: 'PENDING',
        changedBy: 'Client de test',
        createdAt: '2026-07-15T06:42:00',
      },
      {
        id: 32,
        oldStatus: 'PENDING',
        newStatus: 'ACCEPTED',
        changedBy: 'Cuisine de test',
        createdAt: '2026-07-15T06:55:00',
      },
      {
        id: 33,
        oldStatus: 'ACCEPTED',
        newStatus: 'PREPARING',
        changedBy: 'Cuisine de test',
        createdAt: '2026-07-15T07:05:00',
      },
      {
        id: 34,
        oldStatus: 'PREPARING',
        newStatus: 'READY_FOR_PICKUP',
        changedBy: 'Cuisine de test',
        createdAt: '2026-07-15T07:20:00',
      },
    ]);

    renderRestaurantDashboard();

    await screen.findByText('Commande #9003');
    await user.click(screen.getByRole('button', { name: /Commande #9003/i }));

    expect(await screen.findByText('Commande prête pour la remise au chauffeur.')).toBeInTheDocument();
    expect(await screen.findByText(/Cuisine de test/i)).toBeInTheDocument();
    expect(screen.getByText('Historique de statut')).toBeInTheDocument();
  });

  it('surfaces the preparation and ready actions for intermediate states', async () => {
    const user = userEvent.setup();

    mockedFetchRestaurantOrders.mockResolvedValue([
      {
        id: 9002,
        restaurantId: 10,
        customerId: 402,
        driverId: null,
        status: 'ACCEPTED',
        totalAmount: '12000',
        createdAt: '2026-07-15T07:20:00',
      },
    ]);
    mockedStartPreparingRestaurantOrder.mockResolvedValue({
      id: 9002,
      restaurantId: 10,
      customerId: 402,
      driverId: null,
      status: 'PREPARING',
      totalAmount: '12000',
      createdAt: '2026-07-15T07:20:00',
    });
    mockedReadyRestaurantOrder.mockResolvedValue({
      id: 9002,
      restaurantId: 10,
      customerId: 402,
      driverId: null,
      status: 'READY_FOR_PICKUP',
      totalAmount: '12000',
      createdAt: '2026-07-15T07:20:00',
    });

    renderRestaurantDashboard();

    await screen.findByText('Commande #9002');
    await user.click(screen.getByRole('button', { name: /Commande #9002/i }));

    expect(screen.getByRole('button', { name: 'Commencer la préparation' })).toBeEnabled();
  });
});
