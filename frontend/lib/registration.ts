import api from './api';

type RegistrationPayload = {
  newUsername: string;
  newPassword: string;
  role: string;
  [key: string]: unknown;
};

export async function registerAccount(payload: RegistrationPayload) {
  const role = payload.role.trim().toLowerCase();
  if (role === 'rater') {
    // Static pages and the Node API can be deployed/restarted separately.
    // Older APIs silently save unfamiliar roles as Operator. Check the running
    // API before sending a registration request, rather than discovering it after.
    const { data } = await api.get('/auth/public-key', { params: { registration: Date.now() } });
    if (!Array.isArray(data.registrationRoles) || !data.registrationRoles.includes(role)) {
      throw new Error('Rater registration is not available on the running server yet. Update and restart the backend, then try again. No account was created.');
    }
  }
  const response = await api.post('/auth/register', { ...payload, role });
  if (!response.data.success || response.data.user?.role !== role) {
    throw new Error(`Registration did not confirm the requested ${role} role for ${payload.newUsername}. Check the account in User Management before trying again.`);
  }
  return response;
}
