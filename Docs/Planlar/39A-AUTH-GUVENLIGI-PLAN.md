# Plan 39A — Auth Güvenliği

> **Öncelik:** Kritik. 39B'den önce tamamlanmalı.  
> **Bağımlı planlar:** Plan 39B bu tamamlandıktan sonra başlar.

---

## Mevcut Sorun

API'de kimlik doğrulama katmanı yok. `userId` path/body/query param'dan geliyor, sunucu doğrulamadan kullanıyor:

```
GET /users/:id/active-binding
GET /users/:id/vehicles
POST /trips                          → body.userId doğrulanmıyor
GET  /users/:userId/driver-profile/:vehicleId
GET  /vehicles/:id/usage-profile
GET  /vehicles/:id/charge-summary
GET  /vehicles/:id/trips
GET  /vehicles/:id/battery-lifecycle
GET  /vehicles/:id/monthly-report/latest
POST /users/:id/saved-locations
GET  /route-plans/:id/...
```

Herhangi bir istemci başka bir kullanıcının `userId`'sini bilerek bu endpoint'leri çağırabilir.  
Bu, güven ürünü için varoluşsal risktir.

---

## Hedef Mimari

```
[Mobil / Web]
    ↓  Authorization: Bearer <JWT>
[NestJS — JwtAuthGuard]
    ↓  req.user = { id, email, role }
[Controller]
    ↓  userId = req.user.id   ← ASLA param/body/query'den değil
[VehicleAccessGuard]
    ↓  canAccessVehicle(req.user.id, vehicleId) kontrol eder
[Service / DB]
```

---

## Geçiş Stratejisi — "Big Bang Değil"

Mevcut mobil kullanıcılar var. Tek seferde kırılmayacak:

**Faz 1 (acil):**
- Mevcut `POST /users/login` response'una `token` alanı ekle
- Mobil `apiClient.ts` token varsa header'a ekler, yoksa eskisi gibi çalışır
- Tüm endpoint'ler hâlâ token olmadan da kabul eder (geçiş süresi)

**Faz 2 (Faz 1'den 1-2 hafta sonra):**
- `POST /auth/login` → yeni canonical login endpoint
- `POST /users/login` → deprecated, yönlendirme veya kaldırma
- Tüm korumalı endpoint'lere `JwtAuthGuard` zorunlu hale gelir
- Token olmayan istek → `401 Unauthorized`

Bu strateji sayesinde eski APK'lar Faz 2'ye kadar çalışmaya devam eder.

---

## A1 — JWT Altyapısı

**Paketler:** `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`

### AuthModule

```
POST /auth/login
  body: { email, password }
  response: { userId, token, expiresAt }

POST /auth/register           ← mevcut POST /users ile birleştirilebilir
  body: { email, password, name }
  response: { userId, token }
```

JWT payload: `{ sub: userId, email, iat, exp }`  
Token süresi: 30 gün (refresh token Plan 39A v2'de)

### JwtAuthGuard

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user) {
    if (err || !user) throw new UnauthorizedException();
    return user;   // req.user = user
  }
}
```

### OptionalJwtGuard

Public endpoint'ler için — token varsa parse eder, yoksa geçer.  
Kullanım: vehicle-specs listesi, public reports, sağlık endpoint'i.

---

## A2 — Endpoint Listesi

### JWT Zorunlu (korumalı) endpoint'ler

```
GET/POST /users/:id/*
GET/POST /vehicles/:id/*           (hepsi — details, specs, reports, trips, charges)
GET/POST /vehicles/:id/usage-profile
GET/POST /vehicles/:id/charge-summary
GET/POST /vehicles/:id/trips
GET/POST /vehicles/:id/battery-lifecycle
GET/POST /vehicles/:id/monthly-report/latest
POST     /vehicles/:id/public-report  (generate)
POST     /trips
POST     /charge-sessions
GET/POST /route-plans/*
POST     /users/:id/saved-locations
GET      /users/:id/saved-locations
DELETE   /saved-locations/:id
POST     /usage-signals
POST     /push-tokens
```

### Public (JWT gerekmez)

```
GET  /health
GET  /vehicle-specs              (katalog listesi, herkese açık)
GET  /vehicles/:id/public-report (UUID bilinen herkes görebilir — kasıtlı)
GET  /sponsor/*
GET  /legal/*
```

### Admin (ayrı tutuluyor — kullanıcı JWT ile karışmaz)

```
AdminApiKeyGuard → mevcut X-Admin-Key header düzeni değişmiyor
/admin/* endpointleri JWT guard'dan muaf
```

---

## A3 — VehicleAccessGuard — Genişletilmiş Kapsam

Araç endpoint'leri dışında türetilmiş verilerin tümü korunmalı:

```typescript
@Injectable()
export class VehicleAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user.id;
    const vehicleId = req.params.vehicleId ?? req.params.id;
    const hasAccess = await this.vehiclesService.canAccessVehicle(userId, vehicleId);
    if (!hasAccess) throw new ForbiddenException();
    return true;
  }
}
```

**Route plan özel durumu:**  
`/route-plans/:id` endpoint'lerinde önce route planın hangi vehicle'a bağlı olduğu bulunur, sonra `canAccessVehicle` o vehicle üzerinden çalışır. Route plan ID tek başına yetki vermez.

```typescript
// RoutePlansController
const plan = await this.routePlans.findById(planId);
const hasAccess = await this.vehicles.canAccessVehicle(req.user.id, plan.vehicleId);
if (!hasAccess) throw new ForbiddenException();
```

---

## A4 — userId Spoof Koruması

**Kural:** `userId` kaynağı yalnızca `req.user.id`'dir.

```typescript
// YANLIŞ:
async createTrip(@Body() body: CreateTripDto) {
  return this.trips.create(body.userId, ...);  // spoof edilebilir
}

// DOĞRU:
async createTrip(@Req() req, @Body() body: CreateTripDto) {
  return this.trips.create(req.user.id, ...);
}
```

Değiştirilecek endpoint sırası: trip, charge-session, vehicle-ownership, usage-signal, push-token.

---

## Mobil Taraf (apiClient.ts)

Tek nokta değişikliği:

```typescript
const token = await AsyncStorage.getItem('dmyc:authToken');
if (token) {
  config.headers['Authorization'] = `Bearer ${token}`;
}
```

Login başarısında token saklanır:

```typescript
await AsyncStorage.setItem('dmyc:authToken', response.token);
```

Logout'ta token silinir (mevcut `BACKEND_BINDING_STORAGE_KEY` temizleme yanına eklenir):

```typescript
await safeStorageRemove('dmyc:authToken');
```

---

## Test Kriterleri

Tamamlandı sayılmak için şu senaryolar geçmeli:

| # | Senaryo | Beklenen |
|---|---------|----------|
| 1 | Token olmadan korumalı endpoint çağrısı | `401 Unauthorized` |
| 2 | A kullanıcısı B'nin `userId`'siyle `active-binding` isteği | `403 Forbidden` |
| 3 | A kullanıcısı B'nin `vehicleId`'siyle `charge-summary` isteği | `403 Forbidden` |
| 4 | A kullanıcısı B'nin araç ID'siyle bağlantılı route plan isteği | `403 Forbidden` |
| 5 | Admin API key ile `/admin/*` endpoint — JWT olmadan | `200 OK` |
| 6 | Public `/vehicle-specs` — token olmadan | `200 OK` |
| 7 | Geçerli token ile kendi verilerini çekme | `200 OK` |

---

## Uygulama Sırası

| Adım | İş | Süre |
|------|-----|------|
| 1 | Mevcut login response'una `token` alanı ekle (Faz 1 başlangıcı) | 2 saat |
| 2 | `apiClient.ts` token header desteği | 1 saat |
| 3 | `AuthModule` + `JwtStrategy` + `JwtAuthGuard` | 4 saat |
| 4 | `VehicleAccessGuard` + route plan özel durumu | 3 saat |
| 5 | Tüm korumalı endpoint'lere guard ekleme | 4 saat |
| 6 | userId spoof → `req.user.id` dönüşümü | 3 saat |
| 7 | Test kriterleri doğrulama | 2 saat |
| 8 | Faz 2: `/auth/login` canonical endpoint, `POST /users/login` deprecated | 2 saat |

**Toplam tahmini:** ~2 gün

---

## Notlar

- `JWT_SECRET` → `.env` + production Cloudflare secret
- `vehicle_user_access` tablosu ve `canAccessVehicle()` zaten mevcut — yeniden yazılmıyor
- `AdminApiKeyGuard` değişmeyecek, admin/kullanıcı guard'ları birbirinden izole kalacak
- Refresh token + token iptal (çoklu cihaz logout) sonraki versiyon
