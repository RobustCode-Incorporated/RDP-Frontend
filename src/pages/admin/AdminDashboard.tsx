import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { DetailDrawer } from '../../components/shared/DetailDrawer';
import {
  assignDriverToOrder,
  fetchAdminDrivers,
  fetchAdminOrders,
  fetchAdminRestaurants,
  type AdminDriverDto,
  type AdminOrderDto,
  type AdminRestaurantDto,
} from '../../api/adminApi';

type AdminTab = 'dashboard' | 'restaurants' | 'drivers' | 'orders';

type SelectedDetail =
  | { kind: 'restaurant'; id: number }
  | { kind: 'driver'; id: number }
  | { kind: 'order'; id: number }
  | null;

type RestaurantSummary = {
  id: number;
  name: string;
  statusCode: AdminRestaurantDto['status'];
  statusLabel: string;
  address: string;
  city: string;
  country: string;
  phoneNumber: string;
  email: string;
  description: string;
  activeOrders: number;
  lastSync: string;
};

type DriverSummary = {
  id: number;
  name: string;
  statusCode: AdminDriverDto['availabilityStatus'];
  statusLabel: string;
  email: string;
  phoneNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  assignedOrders: number;
};

type OrderSummary = {
  id: number;
  restaurantId: number;
  restaurantName: string;
  customerLabel: string;
  driverId: number | null;
  driverLabel: string;
  statusCode: AdminOrderDto['status'];
  statusLabel: string;
  totalAmountLabel: string;
  createdAtLabel: string;
};

const menuItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'drivers', label: 'Chauffeurs' },
  { id: 'orders', label: 'Commandes' },
];

const statusBadgeClasses: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-200 text-slate-700',
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  BUSY: 'bg-amber-100 text-amber-700',
  OFFLINE: 'bg-slate-200 text-slate-700',
  PENDING: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-amber-100 text-amber-700',
  READY_FOR_PICKUP: 'bg-fuchsia-100 text-fuchsia-700',
  PICKED_UP: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const formatMoney = (value: string) => {
  const amount = Number.parseFloat(value);

  if (Number.isNaN(amount)) {
    return `${value} FCFA`;
  }

  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const getLastSyncLabel = (relatedOrders: AdminOrderDto[]) => {
  const latestOrder = relatedOrders[0];

  if (!latestOrder?.createdAt) {
    return 'Non disponible';
  }

  return formatDateTime(latestOrder.createdAt);
};

const mapRestaurantStatus = (status: AdminRestaurantDto['status']) =>
  status === 'ACTIVE' ? 'Ouvert' : 'Fermé';

const mapDriverStatus = (status: AdminDriverDto['availabilityStatus']) => {
  switch (status) {
    case 'AVAILABLE':
      return 'Disponible';
    case 'BUSY':
      return 'En livraison';
    default:
      return 'Hors ligne';
  }
};

const mapOrderStatus = (status: AdminOrderDto['status']) => {
  switch (status) {
    case 'PENDING':
      return 'Nouveau';
    case 'ACCEPTED':
      return 'Accepté';
    case 'PREPARING':
      return 'Préparation';
    case 'READY_FOR_PICKUP':
      return 'Prêt pour pickup';
    case 'PICKED_UP':
      return 'En livraison';
    case 'DELIVERED':
      return 'Livré';
    default:
      return 'Annulé';
  }
};

const normalizeText = (value: string) => value.trim().toLowerCase();

export const AdminDashboard = () => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [restaurants, setRestaurants] = useState<AdminRestaurantDto[]>([]);
  const [drivers, setDrivers] = useState<AdminDriverDto[]>([]);
  const [orders, setOrders] = useState<AdminOrderDto[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadMessage, setLoadMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setStatusFilter('all');
  }, [currentTab]);

  const loadAdminData = async () => {
    setIsLoading(true);
    setLoadMessage('');
    setLoadError('');

    const [restaurantsResult, driversResult, ordersResult] = await Promise.allSettled([
      fetchAdminRestaurants(),
      fetchAdminDrivers(),
      fetchAdminOrders(),
    ]);

    setRestaurants(restaurantsResult.status === 'fulfilled' ? restaurantsResult.value : []);
    setDrivers(driversResult.status === 'fulfilled' ? driversResult.value : []);
    setOrders(ordersResult.status === 'fulfilled' ? ordersResult.value : []);

    const fallbackCount = [restaurantsResult, driversResult, ordersResult].filter(
      (result) => result.status === 'rejected'
    ).length;

    if (fallbackCount === 3) {
      setLoadError('Impossible de charger les données admin.');
    } else if (fallbackCount > 0) {
      setLoadMessage('API partiellement indisponible, certaines sections sont vides.');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const restaurantSummaries = useMemo<RestaurantSummary[]>(() => {
    return restaurants.map((restaurant) => {
      const relatedOrders = orders.filter((order) => order.restaurantId === restaurant.id);

      return {
        id: restaurant.id,
        name: restaurant.name,
        statusCode: restaurant.status,
        statusLabel: mapRestaurantStatus(restaurant.status),
        address: restaurant.address,
        city: restaurant.city ?? 'Non renseigné',
        country: restaurant.country ?? 'Non renseigné',
        phoneNumber: restaurant.phoneNumber ?? 'Non renseigné',
        email: restaurant.email ?? 'Non renseigné',
        description: restaurant.description ?? 'Aucune description',
        activeOrders: relatedOrders.filter(
          (order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
        ).length,
        lastSync: getLastSyncLabel(relatedOrders),
      };
    });
  }, [orders, restaurants]);

  const driverSummaries = useMemo<DriverSummary[]>(() => {
    return drivers.map((driver) => {
      const assignedOrders = orders.filter((order) => order.driverId === driver.id).length;

      return {
        id: driver.id,
        name: `${driver.firstName} ${driver.lastName}`.trim(),
        statusCode: driver.availabilityStatus,
        statusLabel: mapDriverStatus(driver.availabilityStatus),
        email: driver.email,
        phoneNumber: driver.phoneNumber,
        vehicleType: driver.vehicleType,
        vehiclePlate: driver.vehiclePlate,
        assignedOrders,
      };
    });
  }, [drivers, orders]);

  const orderSummaries = useMemo<OrderSummary[]>(() => {
    const restaurantLookup = new Map(restaurantSummaries.map((restaurant) => [restaurant.id, restaurant]));
    const driverLookup = new Map(driverSummaries.map((driver) => [driver.id, driver]));

    return orders.map((order) => {
      const restaurant = restaurantLookup.get(order.restaurantId);
      const driver = order.driverId ? driverLookup.get(order.driverId) : null;

      return {
        id: order.id,
        restaurantId: order.restaurantId,
        restaurantName: restaurant?.name ?? `Restaurant #${order.restaurantId}`,
        customerLabel: `Client #${order.customerId}`,
        driverId: order.driverId,
        driverLabel: driver?.name ?? (order.driverId ? `Chauffeur #${order.driverId}` : 'Non assigné'),
        statusCode: order.status,
        statusLabel: mapOrderStatus(order.status),
        totalAmountLabel: formatMoney(order.totalAmount),
        createdAtLabel: formatDateTime(order.createdAt),
      };
    });
  }, [driverSummaries, orders, restaurantSummaries]);

  const activeLabel = menuItems.find((item) => item.id === currentTab)?.label ?? 'Dashboard';

  const statCards = [
    { label: 'Restaurants', value: String(restaurantSummaries.length), helper: `${restaurantSummaries.filter((restaurant) => restaurant.statusCode === 'ACTIVE').length} ouverts` },
    { label: 'Chauffeurs', value: String(driverSummaries.length), helper: `${driverSummaries.filter((driver) => driver.statusCode === 'AVAILABLE').length} disponibles` },
    { label: 'Commandes actives', value: String(orderSummaries.filter((order) => order.statusCode !== 'DELIVERED' && order.statusCode !== 'CANCELLED').length), helper: `${orderSummaries.filter((order) => order.statusCode === 'PENDING').length} en attente` },
  ];

  const filterOptions = (() => {
    switch (currentTab) {
      case 'restaurants':
        return [
          { value: 'all', label: 'Tous' },
          { value: 'ACTIVE', label: 'Ouvert' },
          { value: 'INACTIVE', label: 'Fermé' },
        ];
      case 'drivers':
        return [
          { value: 'all', label: 'Tous' },
          { value: 'AVAILABLE', label: 'Disponible' },
          { value: 'BUSY', label: 'En livraison' },
          { value: 'OFFLINE', label: 'Hors ligne' },
        ];
      case 'orders':
        return [
          { value: 'all', label: 'Tous' },
          { value: 'PENDING', label: 'Nouveau' },
          { value: 'ACCEPTED', label: 'Accepté' },
          { value: 'PREPARING', label: 'Préparation' },
          { value: 'READY_FOR_PICKUP', label: 'Prêt pour pickup' },
          { value: 'PICKED_UP', label: 'En livraison' },
          { value: 'DELIVERED', label: 'Livré' },
          { value: 'CANCELLED', label: 'Annulé' },
        ];
      default:
        return [];
    }
  })();

  const renderStatusBadge = (status: string) => {
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClasses[status] ?? 'bg-slate-100 text-slate-600'}`}>
        {status}
      </span>
    );
  };

  const selectedRestaurant = selectedDetail?.kind === 'restaurant'
    ? restaurantSummaries.find((restaurant) => restaurant.id === selectedDetail.id)
    : null;

  const selectedDriver = selectedDetail?.kind === 'driver'
    ? driverSummaries.find((driver) => driver.id === selectedDetail.id)
    : null;

  const selectedOrder = selectedDetail?.kind === 'order'
    ? orderSummaries.find((order) => order.id === selectedDetail.id)
    : null;

  useEffect(() => {
    if (selectedDetail?.kind !== 'order') {
      setSelectedDriverId('');
      return;
    }

    setSelectedDriverId(
      selectedOrder?.driverId ?? driverSummaries.find((driver) => driver.statusCode === 'AVAILABLE')?.id ?? ''
    );
  }, [driverSummaries, selectedDetail, selectedOrder]);

  const closeDetail = () => setSelectedDetail(null);

  const normalizedSearch = normalizeText(searchTerm);

  const filteredRestaurants = restaurantSummaries.filter((restaurant) => {
    const matchesSearch =
      normalizeText(restaurant.name).includes(normalizedSearch) ||
      normalizeText(restaurant.address).includes(normalizedSearch) ||
      normalizeText(restaurant.city).includes(normalizedSearch) ||
      normalizeText(restaurant.statusLabel).includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || restaurant.statusCode === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredDrivers = driverSummaries.filter((driver) => {
    const matchesSearch =
      normalizeText(driver.name).includes(normalizedSearch) ||
      normalizeText(driver.vehicleType).includes(normalizedSearch) ||
      normalizeText(driver.vehiclePlate).includes(normalizedSearch) ||
      normalizeText(driver.email).includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || driver.statusCode === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredOrders = orderSummaries.filter((order) => {
    const matchesSearch =
      normalizeText(String(order.id)).includes(normalizedSearch) ||
      normalizeText(order.customerLabel).includes(normalizedSearch) ||
      normalizeText(order.restaurantName).includes(normalizedSearch) ||
      normalizeText(order.driverLabel).includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || order.statusCode === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAssignDriver = async () => {
    if (!selectedOrder || selectedDriverId === '') {
      return;
    }

    setIsSaving(true);

    try {
      await assignDriverToOrder(selectedOrder.id, Number(selectedDriverId));

      const refreshedOrders = await fetchAdminOrders();
      setOrders(refreshedOrders);
      setSelectedDetail({ kind: 'order', id: selectedOrder.id });
      setLoadMessage('Chauffeur affecté avec succès.');
    } catch {
      setLoadMessage('Impossible d’affecter le chauffeur pour le moment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetryLoad = () => {
    void loadAdminData();
  };

  return (
    <AppShell
      title="Admin Dashboard"
      subtitle="Pilotage des restaurants, chauffeurs et commandes"
      navigationItems={menuItems}
      activeItem={currentTab}
      onChangeItem={(itemId) => setCurrentTab(itemId as AdminTab)}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Vue admin</p>
            <h2 className="text-2xl font-semibold text-slate-900">{activeLabel}</h2>
          </div>
          <p className="text-sm text-slate-500">
            {isLoading ? 'Chargement des données admin...' : 'Données synchronisées depuis les endpoints backend.'}
          </p>
        </div>

        {loadMessage ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {loadMessage}
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={handleRetryLoad}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <h3 className="text-sm text-slate-500">{card.label}</h3>
              <p className="mt-2 text-3xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
            </div>
          ))}
        </div>

        {currentTab !== 'dashboard' ? (
          <section className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Rechercher
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nom, email, adresse, commande..."
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-black"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 md:min-w-[220px]">
                Statut
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-black"
                >
                  {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        ) : null}

        {(currentTab === 'dashboard' || currentTab === 'restaurants') && (
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Restaurants</h3>
                <p className="text-sm text-slate-500">Vue synthétique des établissements connectés.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {filteredRestaurants.length} établissements
              </span>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Chargement des restaurants...
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {filteredRestaurants.map((restaurant) => (
                <button
                  key={restaurant.id}
                  type="button"
                  onClick={() => setSelectedDetail({ kind: 'restaurant', id: restaurant.id })}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-black/10 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{restaurant.name}</h4>
                      <p className="mt-1 text-sm text-slate-500">{restaurant.address}</p>
                    </div>
                    {renderStatusBadge(restaurant.statusLabel)}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-400">Commandes actives</p>
                      <p className="mt-1 font-semibold text-slate-900">{restaurant.activeOrders}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-400">Ville</p>
                      <p className="mt-1 font-semibold text-slate-900">{restaurant.city}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Cliquer pour voir le détail
                  </p>
                </button>
              ))}
            </div>

            {!isLoading && filteredRestaurants.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Aucun restaurant ne correspond aux critères sélectionnés.
              </div>
            ) : null}
          </section>
        )}

        {(currentTab === 'dashboard' || currentTab === 'drivers') && (
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Chauffeurs</h3>
                <p className="text-sm text-slate-500">Disponibilité, véhicule et performance terrain.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {filteredDrivers.length} chauffeurs
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {filteredDrivers.map((driver) => (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => setSelectedDetail({ kind: 'driver', id: driver.id })}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-black/10 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{driver.name}</h4>
                      <p className="mt-1 text-sm text-slate-500">{driver.vehicleType} · {driver.vehiclePlate}</p>
                    </div>
                    {renderStatusBadge(driver.statusLabel)}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-400">Commandes assignées</p>
                      <p className="mt-1 font-semibold text-slate-900">{driver.assignedOrders}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-400">Téléphone</p>
                      <p className="mt-1 font-semibold text-slate-900">{driver.phoneNumber}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Cliquer pour voir le détail
                  </p>
                </button>
              ))}
            </div>

            {!isLoading && filteredDrivers.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Aucun chauffeur ne correspond aux critères sélectionnés.
              </div>
            ) : null}
          </section>
        )}

        {(currentTab === 'dashboard' || currentTab === 'orders') && (
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Commandes</h3>
                <p className="text-sm text-slate-500">Flux des commandes en cours et terminées.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {filteredOrders.length} commandes récentes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="px-4 py-3 font-medium">Commande</th>
                    <th className="px-4 py-3 font-medium">Restaurant</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Chauffeur</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Créée le</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4 font-medium text-slate-900">#{order.id}</td>
                      <td className="px-4 py-4 text-slate-600">{order.restaurantName}</td>
                      <td className="px-4 py-4 text-slate-600">{order.customerLabel}</td>
                      <td className="px-4 py-4 text-slate-600">{order.driverLabel}</td>
                      <td className="px-4 py-4 text-slate-600">{order.totalAmountLabel}</td>
                      <td className="px-4 py-4">{renderStatusBadge(order.statusLabel)}</td>
                      <td className="px-4 py-4 text-slate-600">{order.createdAtLabel}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDriverId(
                              order.driverId ?? driverSummaries.find((driver) => driver.statusCode === 'AVAILABLE')?.id ?? ''
                            );
                            setSelectedDetail({ kind: 'order', id: order.id });
                          }}
                          className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-black hover:text-black"
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isLoading && filteredOrders.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Aucune commande ne correspond aux critères sélectionnés.
              </div>
            ) : null}
          </section>
        )}
      </div>

      <DetailDrawer
        isOpen={selectedDetail !== null}
        title={
          selectedRestaurant?.name ??
          selectedDriver?.name ??
          (selectedOrder ? `Commande #${selectedOrder.id}` : '')
        }
        subtitle={
          selectedRestaurant
            ? 'Analyse détaillée du restaurant et de sa synchronisation'
            : selectedDriver
              ? 'Suivi détaillé du chauffeur et de ses affectations'
              : selectedOrder
                ? 'Suivi détaillé de la commande et de son cycle de vie'
                : ''
        }
        badge={
          selectedRestaurant
            ? renderStatusBadge(selectedRestaurant.statusLabel)
            : selectedDriver
              ? renderStatusBadge(selectedDriver.statusLabel)
              : selectedOrder
                ? renderStatusBadge(selectedOrder.statusLabel)
                : undefined
        }
        sections={
          selectedRestaurant
            ? [
                {
                  title: 'Résumé',
                  items: [
                    { label: 'Statut', value: selectedRestaurant.statusLabel },
                    { label: 'Commandes actives', value: selectedRestaurant.activeOrders },
                    { label: 'Adresse', value: selectedRestaurant.address },
                    { label: 'Ville', value: `${selectedRestaurant.city}, ${selectedRestaurant.country}` },
                  ],
                },
                {
                  title: 'Contact',
                  items: [
                    { label: 'Téléphone', value: selectedRestaurant.phoneNumber },
                    { label: 'Email', value: selectedRestaurant.email },
                    { label: 'Description', value: selectedRestaurant.description },
                    { label: 'Dernière synchro', value: selectedRestaurant.lastSync },
                  ],
                },
              ]
            : selectedDriver
              ? [
                  {
                    title: 'Résumé',
                    items: [
                      { label: 'Statut', value: selectedDriver.statusLabel },
                      { label: 'Véhicule', value: selectedDriver.vehicleType },
                      { label: 'Plaque', value: selectedDriver.vehiclePlate },
                      { label: 'Commandes assignées', value: selectedDriver.assignedOrders },
                    ],
                  },
                  {
                    title: 'Contact',
                    items: [
                      { label: 'Email', value: selectedDriver.email },
                      { label: 'Téléphone', value: selectedDriver.phoneNumber },
                      { label: 'Affectation', value: selectedDriver.statusCode === 'AVAILABLE' ? 'Disponible pour affectation' : 'Occupé ou hors ligne' },
                      { label: 'Identifiant utilisateur', value: selectedDetail?.kind === 'driver' ? selectedDriver.id : '—' },
                    ],
                  },
                ]
              : selectedOrder
                ? [
                    {
                      title: 'Résumé',
                      items: [
                        { label: 'Statut', value: selectedOrder.statusLabel },
                        { label: 'Restaurant', value: selectedOrder.restaurantName },
                        { label: 'Client', value: selectedOrder.customerLabel },
                        { label: 'Montant', value: selectedOrder.totalAmountLabel },
                      ],
                    },
                    {
                      title: 'Affectation',
                      items: [
                        { label: 'Chauffeur actuel', value: selectedOrder.driverLabel },
                        { label: 'Chauffeur assigné', value: selectedOrder.driverId ?? 'Aucun' },
                        { label: 'Créée le', value: selectedOrder.createdAtLabel },
                        { label: 'Restaurant ID', value: selectedOrder.restaurantId },
                      ],
                    },
                  ]
                : []
        }
        footer={
          selectedOrder ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                  Affecter un chauffeur
                  <select
                    value={selectedDriverId}
                    onChange={(event) => setSelectedDriverId(event.target.value === '' ? '' : Number(event.target.value))}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-black"
                  >
                    <option value="">Sélectionner un chauffeur</option>
                    {driverSummaries
                      .filter((driver) => driver.statusCode === 'AVAILABLE')
                      .map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} · {driver.vehiclePlate}
                        </option>
                      ))}
                  </select>
                </label>

                <button
                  type="button"
                  disabled={isSaving || selectedDriverId === ''}
                  onClick={handleAssignDriver}
                  className="rounded-full bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Affectation...' : 'Affecter'}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">Les changements sont envoyés vers l’endpoint d’assignation admin.</p>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-black hover:text-black"
                >
                  Fermer le détail
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Données synchronisées depuis les endpoints backend.</p>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-black hover:text-black"
              >
                Fermer le détail
              </button>
            </div>
          )
        }
        onClose={closeDetail}
      />
    </AppShell>
  );
};