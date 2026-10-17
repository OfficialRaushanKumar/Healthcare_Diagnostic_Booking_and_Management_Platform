import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors, fonts } from '../design-system/tokens';
import { useAuth } from '../context/AuthContext';
import { AdminNoticeScreen } from '../screens/AdminNotice';
import { AppointmentDetailScreen, MyAppointmentsScreen } from '../screens/Appointments';
import { LoginScreen, RegisterScreen, WelcomeScreen } from '../screens/Auth';
import { BookingSummaryScreen, ConfirmationScreen, PaymentScreen, SelectSlotScreen } from '../screens/Booking';
import { CenterDetailScreen, CentersScreen, TestDetailScreen, TestsScreen } from '../screens/Discover';
import { HomeScreen } from '../screens/Home';
import { ProfileScreen } from '../screens/Profile';
import { StaffAppointmentsScreen, StaffDashboardScreen, StaffServicesScreen } from '../screens/Staff';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
type IconName = keyof typeof Ionicons.glyphMap;

function tabs(icons: Record<string, [IconName, IconName]>) {
  return ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textFaint,
    tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, paddingTop: 6 },
    tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => <Ionicons name={icons[route.name][focused ? 0 : 1]} size={23} color={color} />,
  });
}

function PatientTabs() {
  return (
    <Tab.Navigator screenOptions={tabs({ Home: ['home', 'home-outline'], Centers: ['business', 'business-outline'], Tests: ['flask', 'flask-outline'], Appointments: ['calendar', 'calendar-outline'], Profile: ['person', 'person-outline'] })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Centers" component={CentersScreen} />
      <Tab.Screen name="Tests" component={TestsScreen} />
      <Tab.Screen name="Appointments" component={MyAppointmentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function StaffTabs() {
  return (
    <Tab.Navigator screenOptions={tabs({ Dashboard: ['grid', 'grid-outline'], StaffAppointments: ['list', 'list-outline'], StaffServices: ['construct', 'construct-outline'], Profile: ['person', 'person-outline'] })}>
      <Tab.Screen name="Dashboard" component={StaffDashboardScreen} />
      <Tab.Screen name="StaffAppointments" component={StaffAppointmentsScreen} options={{ title: 'Appointments' }} />
      <Tab.Screen name="StaffServices" component={StaffServicesScreen} options={{ title: 'Services' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary } };

export function RootNavigator() {
  const { user, booting } = useAuth();
  if (booting) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : user.role === 'PATIENT' ? (
          <>
            <Stack.Screen name="PatientTabs" component={PatientTabs} />
            <Stack.Screen name="CenterDetail" component={CenterDetailScreen} />
            <Stack.Screen name="TestDetail" component={TestDetailScreen} />
            <Stack.Screen name="SelectSlot" component={SelectSlotScreen} />
            <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Confirmation" component={ConfirmationScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
          </>
        ) : user.role === 'STAFF' ? (
          <>
            <Stack.Screen name="StaffTabs" component={StaffTabs} />
            <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="AdminNotice" component={AdminNoticeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
