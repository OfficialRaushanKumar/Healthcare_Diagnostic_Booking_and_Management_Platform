import React from 'react';
import { Text } from 'react-native';
import { EmptyState, Header, PrimaryButton, Screen } from '../components';
import { useAuth } from '../context/AuthContext';
import { typography } from '../design-system/tokens';

export function AdminNoticeScreen() {
  const { logout } = useAuth();
  return (
    <Screen>
      <Header title="Administrator" back={false} />
      <EmptyState icon="shield-checkmark-outline" title="Use Django Admin" message="Administrators manage users, centers, tests, prices, bookings, payments and webhook events in the web admin at /admin/. The mobile app is for patients and center staff."
        action={<PrimaryButton title="Log out" onPress={logout} />} />
      <Text style={[typography.caption, { textAlign: 'center' }]}>Admin statistics are available at GET /api/v1/dashboard/admin/.</Text>
    </Screen>
  );
}
