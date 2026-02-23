/// Backend API base URL (same MERN server).
/// - Android emulator: http://10.0.2.2:5000/api
/// - Physical device: use your machine IP, e.g. http://192.168.1.100:5000/api
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:5000/api',
);
