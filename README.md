# Bencina App

App móvil (Expo / React Native) para comparar bencineras en Chile usando la API oficial de la Comisión Nacional de Energía (CNE), con puntaje que combina **precio** y **distancia**, calculadora de gasto y banner AdMob.

## Qué está implementado (MVP)

- Proyecto **Expo SDK 55** con TypeScript, ESLint (`eslint-config-expo`) y tests con **Jest** (`utils/distance`, `utils/score`).
- Configuración dinámica en [`app.config.js`](app.config.js): token CNE y AdMob vía variables de entorno; plugins `expo-location` y `react-native-google-mobile-ads`.
- **Geolocalización** ([`services/locationService.ts`](services/locationService.ts)): permisos y posición con `expo-location`.
- **API CNE** ([`services/cneClient.ts`](services/cneClient.ts)): `GET https://api.cne.cl/api/v4/estaciones` con `Authorization: Bearer`, normalización flexible del JSON y **caché** en AsyncStorage ([`services/stationsCache.ts`](services/stationsCache.ts)) con aviso de datos antiguos si falla la red.
- **Score** `precio + distanciaKm × factor` con factor persistido ([`hooks/useScoreFactor.ts`](hooks/useScoreFactor.ts)), Haversine en [`utils/distance.ts`](utils/distance.ts), ranking en [`utils/rankStations.ts`](utils/rankStations.ts) y ahorro vs promedio en cada fila.
- **UI**: pantalla principal con `FlatList` ([`screens/HomeScreen.tsx`](screens/HomeScreen.tsx)), segunda pantalla **Calculadora** ([`screens/CalculatorScreen.tsx`](screens/CalculatorScreen.tsx)), banner inferior ([`components/AdBanner.tsx`](components/AdBanner.tsx)), inicialización de Mobile Ads en [`App.tsx`](App.tsx).
- Navegación **React Navigation** (stack nativo).
- Archivo de ejemplo de variables: [`.env.example`](.env.example).
- Plantilla **EAS** en [`eas.json`](eas.json).

## Qué falta / siguiente iteración

- **Probar con token real** y ajustar el mapeo de campos en `cneClient` si el JSON de producción difiere (nombres de precios, coordenadas, etc.).
- **Publicación en tiendas**: completar ficha, capturas, política de privacidad y (si aplica) consentimiento de anuncios; configurar IDs reales de AdMob y secretos en EAS.
- **Builds nativos**: ejecutar `eas build` (Android/iOS) o `npx expo prebuild` local; asociar `EAS_PROJECT_ID` si usas EAS.
- **CI** (GitHub Actions u otro) para lint + tests.
- **Mejoras opcionales**: filtro por tipo de combustible explícito, mapa, más tests, accesibilidad avanzada, internacionalización.

## Cómo ejecutar

1. **Node**: se recomienda la versión LTS indicada por [Expo](https://docs.expo.dev/) (p. ej. ≥ 20.19.4 para SDK 55).
2. Copia variables: `cp .env.example .env` y define al menos `CNE_API_TOKEN` (registro en [api.cne.cl](https://api.cne.cl/register)).
3. `npm install`
4. `npx expo start`

**AdMob / código nativo:** los anuncios y los módulos nativos no coinciden con “Expo Go” estándar. Usa **development build**: `npx expo run:android` / `npx expo run:ios` tras `npx expo prebuild`, o **EAS Build** con `expo-dev-client`.

### Scripts útiles

| Comando        | Descripción        |
|----------------|--------------------|
| `npm run start` | Servidor Expo       |
| `npm test`      | Jest                |
| `npm run lint`  | ESLint (via Expo)   |

## Limitaciones conocidas

- La API CNE requiere **token**; sin él la app solo muestra el error correspondiente.
- Los precios y el formato dependen de la CNE; el parser asume varias formas habituales del JSON.
- El **radio máximo** y el **factor** son herramientas de tuning (ver [`constants/defaults.ts`](constants/defaults.ts)).
- **Privacidad / legales**: enlaza tu política de privacidad antes de publicar con AdMob y ubicación.

## Builds Android e iOS (resumen)

1. Cuenta en [expo.dev](https://expo.dev) y, si usas EAS, `npm install -g eas-cli` y `eas login`.
2. `eas build:configure` (genera/ajusta proyecto EAS; puedes fijar `extra.eas.projectId` vía `EAS_PROJECT_ID` o el flujo interactivo).
3. Define secretos (`CNE_API_TOKEN`, IDs AdMob) en EAS Secrets o en `eas.json` env (sin subirlos al repo).
4. Android: `eas build -p android` (AAB para Play Console).
5. iOS: cuenta Apple Developer, `eas build -p ios`, luego TestFlight / App Store Connect.

---

*Última actualización del README: alineado con el estado del código en el repositorio (MVP implementado en cliente; validación en dispositivo real y tiendas pendiente).*
