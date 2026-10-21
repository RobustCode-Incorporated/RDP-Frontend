import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Login } from './Login';
import { apiError, mockApi, type MockApi } from '../../test/mockApi';
import { makeTestJwt } from '../../test/jwt';
import { useAuthStore } from '../../store/useAuthStore';

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<p>Dispatch board</p>} />
      </Routes>
    </MemoryRouter>
  );

const submit = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Identifiant'), 'drv@test.be');
  await user.type(screen.getByLabelText('Mot de passe'), 'Secret123');
  await user.click(screen.getByRole('button', { name: 'SE CONNECTER' }));
};

describe('Login', () => {
  let apiMock: MockApi;
  beforeEach(() => {
    apiMock = mockApi();
  });
  afterEach(() => useAuthStore.getState().logout());

  it('maps 403 (pending approval) to a clear French message', async () => {
    apiMock.on('POST', '/api/auth/login', () => {
      throw apiError(403, 'Account is disabled or pending administrator approval');
    });
    renderLogin();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/en attente de validation par l’administrateur/);
  });

  it('maps 401 to "Identifiants incorrects."', async () => {
    apiMock.on('POST', '/api/auth/login', () => {
      throw apiError(401, 'Invalid email or password');
    });
    renderLogin();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants incorrects.');
  });

  it('uses the role from the login response (DISPATCHER -> /admin)', async () => {
    apiMock.on('POST', '/api/auth/login', { token: makeTestJwt(3600), email: 'disp@test.be', role: 'DISPATCHER' });
    renderLogin();
    await submit();
    expect(await screen.findByText('Dispatch board')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.role).toBe('DISPATCHER');
  });
});
