# Itinera — Guía de Expansión de Contenido
> **Para:** Agente de IA encargado de poblar la base de datos  
> **Contexto:** Itinera Suite — plataforma de turismo cultural de Honduras (WRO 2026)  
> **Estado actual:** 16 destinos publicados · 2 historias · Meta: 40+ destinos · 10+ historias

---

## 1. Acceso al sistema

### Panel de administración
```
URL: https://itinera-suite-wro-senior-future-inn.vercel.app/admin
     (o localmente: http://localhost:3001 en apps/web)
```

Para crear contenido necesitas una cuenta con rol `admin`. El sistema tiene un panel CRUD completo para Places, Stories, Sponsors y más.

### Base de datos directa (Supabase)
```
Project URL: https://hwsddziticyusncajyes.supabase.co
Dashboard:   https://supabase.com/dashboard/project/hwsddziticyusncajyes
```

Puedes insertar contenido directamente desde el **SQL Editor** del dashboard de Supabase.

---

## 2. Estructura de datos

### Tabla `places` — Destinos culturales
```sql
-- Campos principales para crear un lugar:
INSERT INTO places (
  slug,              -- URL amigable: "ruinas-copan", "catedral-comayagua"
  name_i18n,         -- {"es": "Ruinas de Copán", "en": "Copan Ruins"}
  description_i18n,  -- {"es": "Descripción larga...", "en": "..."}
  ai_summary_i18n,   -- {"es": "Resumen corto para IA...", "en": "..."}
  ai_tips_i18n,      -- {"es": "Consejos de visita...", "en": "..."}
  address_i18n,      -- {"es": "Copán Ruinas, Honduras"}
  hours,             -- {"es": "Lun-Dom 8am-4pm"}
  phone,             -- "+504 XXXX-XXXX" (opcional)
  website,           -- "https://..." (opcional)
  lat,               -- Latitud (requerida para el mapa)
  lng,               -- Longitud (requerida para el mapa)
  price_level,       -- 0=gratis, 1=$, 2=$$, 3=$$$, 4=$$$$
  accessibility,     -- true/false
  local_favorite,    -- true/false
  featured,          -- true/false (destacados aparecen primero)
  status,            -- 'published' para que aparezca
  category_id,       -- FK a place_categories
  region_id          -- FK a regions
) VALUES (...);
```

### Tabla `stories` — Historias culturales narradas con IA
```sql
INSERT INTO stories (
  slug,                   -- "legado-maya-copan"
  title_i18n,             -- {"es": "El Legado Maya de Copán", "en": "..."}
  summary_i18n,           -- {"es": "Resumen de 2-3 frases...", "en": "..."}
  body_markdown_i18n,     -- {"es": "# Historia completa en markdown...", "en": "..."}
  audio_storage_path,     -- null (o ruta en Supabase Storage si hay audio)
  featured,               -- true/false
  status,                 -- 'published'
  moderation_status,      -- 'approved'
  region_id               -- FK a regions
) VALUES (...);

-- Después de crear la historia, ligar lugares:
INSERT INTO story_places (story_id, place_id) VALUES (...);
```

---

## 3. IDs de referencia existentes

### Regiones (`regions` table)
```sql
-- Consulta para ver todas:
SELECT id, slug, name_i18n->>'es' as name FROM regions ORDER BY slug;
```
Regiones ya creadas (verificar con la query):
- Copán, Comayagua, Islas de la Bahía, Francisco Morazán, Cortés, Atlántida, etc.

### Categorías (`place_categories` table)
```sql
SELECT id, slug, name_i18n->>'es' as name FROM place_categories ORDER BY slug;
```
Categorías existentes:
- `heritage` — Patrimonio Cultural
- `nature` — Naturaleza
- `food` — Gastronomía
- `beach` — Playa
- `adventure` — Aventura
- `religion` — Religioso
- `arts` — Arte y Museos

---

## 4. Meta de contenido — Destinos a agregar (40+ total)

### Prioridad ALTA — Destinos icónicos faltantes

| Lugar | Región | Categoría | Lat | Lng |
|-------|--------|-----------|-----|-----|
| Basílica de Suyapa | Francisco Morazán | religion | 14.0722 | -87.1847 |
| Parque Nacional Pico Bonito | Atlántida | nature | 15.5833 | -86.8833 |
| Jardín Botánico Lancetilla | Atlántida | nature | 15.7333 | -87.4667 |
| Fortaleza de Omoa | Cortés | heritage | 15.7833 | -88.0167 |
| Lago de Yojoa | Cortés/Santa Bárbara | nature | 14.9000 | -87.9833 |
| Ciudad de Trujillo (histórica) | Colón | heritage | 15.9167 | -85.9667 |
| Cuevas de Talgua | Olancho | heritage | 14.6500 | -86.5833 |
| Gracias (ciudad colonial) | Lempira | heritage | 14.5833 | -88.5833 |
| Parque Nacional Celaque | Lempira | nature | 14.5500 | -88.6333 |
| Reserva de Biosfera del Río Plátano | Gracias a Dios | nature | 15.5 | -84.8 |
| Islas del Cisne | — | nature | 17.4 | -83.9 |
| Santa Rosa de Copán | Copán | heritage | 14.7667 | -88.7833 |
| Museo de Antropología e Historia (IHAH) | Francisco Morazán | arts | 14.0833 | -87.2000 |
| La Tigra (zona de camping) | Francisco Morazán | adventure | 14.1500 | -87.1500 |
| Puerto Cortés (malecón histórico) | Cortés | heritage | 15.8500 | -87.9333 |
| Valle de Ángeles | Francisco Morazán | arts | 14.1333 | -87.0667 |

### Prioridad MEDIA — Gastronomía y cultura local

| Lugar | Región | Categoría |
|-------|--------|-----------|
| Mercado de Artesanías de Copán | Copán | arts |
| Baleadas Express (representativo) | Cortés | food |
| Mercado Zonal Belén (Tegucigalpa) | Francisco Morazán | food |
| Feria de Comayagua (ubicación) | Comayagua | heritage |
| Pueblo de La Campa | Lempira | heritage |
| Pueblo de Yamaranguila | Intibucá | heritage |
| El Cusuco (Parque Nacional) | Cortés | nature |
| Tela (centro histórico) | Atlántida | heritage |
| Playa Miami (Tela) | Atlántida | beach |

### Prioridad BAJA — Completar cobertura departamental

Asegurarse de tener al menos 1-2 lugares por cada uno de los 18 departamentos:
- Choluteca, El Paraíso, Intibucá, La Paz, Ocotepeque, Santa Bárbara, Valle, Yoro

---

## 5. Meta de contenido — Historias a crear (10+ total)

Cada historia debe:
- Tener un título evocador (no solo descriptivo)
- Body en markdown con subtítulos `##` y `###`
- Conectar al menos 1 lugar de la DB (`story_places`)
- Estar en español con opción de inglés

### Historias sugeridas

| Título | Región | Lugares enlazados |
|--------|--------|------------------|
| "El Pueblo que Habla con los Reyes Mayas" | Copán | Ruinas de Copán |
| "La Campana que Dobla Hace 450 Años" | Comayagua | Catedral de Comayagua |
| "La Mosquitia: La Selva que Guardó el Secreto" | Gracias a Dios | Reserva Río Plátano |
| "Los Garífunas: Guardianes del Caribe hondureño" | Atlántida | Trujillo, Tela |
| "El Reloj Árabe que Conquistó Honduras" | Comayagua | Catedral de Comayagua |
| "Lempira: El Guerrero que no se Rindió" | Lempira | Gracias, Celaque |
| "Roatán: De Piratas a Paraíso" | Islas de la Bahía | Playa West Bay |
| "El Bosque Nublado que Abastece una Capital" | Francisco Morazán | La Tigra |
| "Las Cuevas de los Guerreros Blancos" | Olancho | Cuevas de Talgua |
| "Francisco Morazán: El Último Sueño Centroamericano" | Francisco Morazán | Tegucigalpa |

---

## 6. Formato del body de historia (Markdown)

```markdown
# Título de la historia

Párrafo introductorio evocador que engancha al lector...

## El contexto histórico

Texto del contexto...

## El lugar hoy

Qué encontrará el visitante actual...

## Por qué importa

Relevancia cultural para Honduras...

## Cómo llegar

Información práctica breve...
```

---

## 7. Activar embeddings semánticos después de agregar contenido

Después de crear nuevos lugares o historias, ejecutar el sync de embeddings:

```bash
# Desde el directorio raíz del proyecto
cd scripts
npx tsx sync-embeddings.ts --mode=changed

# O para reconstruir todos:
npx tsx sync-embeddings.ts --mode=all
```

O esperar máximo 1 hora — el GitHub Actions cron lo ejecuta automáticamente cada hora.

**Por qué es importante:** Sin los embeddings actualizados, el nuevo contenido no aparecerá en búsquedas semánticas del Centro IA ni del mapa.

---

## 8. Verificación de calidad

Antes de marcar un lugar como `status='published'`:

- [ ] `lat` y `lng` son correctos (verificar en Google Maps)
- [ ] `name_i18n` tiene al menos el campo `es`
- [ ] `description_i18n` tiene descripción real (no placeholder)
- [ ] `ai_summary_i18n` tiene resumen de 2-3 frases para la IA
- [ ] `category_id` y `region_id` son correctos
- [ ] `slug` es único y URL-amigable (solo letras, números y guiones)
- [ ] Si tiene fotos, subirlas a `media_assets` (bucket: `place-media`)

---

## 9. SQL de ejemplo — Insertar un lugar completo

```sql
-- 1. Obtener IDs de región y categoría
SELECT id FROM regions WHERE slug = 'atlantida';
SELECT id FROM place_categories WHERE slug = 'nature';

-- 2. Insertar el lugar
INSERT INTO places (
  slug, name_i18n, description_i18n, ai_summary_i18n, ai_tips_i18n,
  address_i18n, lat, lng, price_level, accessibility, local_favorite,
  featured, status, category_id, region_id
) VALUES (
  'parque-nacional-pico-bonito',
  '{"es": "Parque Nacional Pico Bonito", "en": "Pico Bonito National Park"}',
  '{"es": "El Parque Nacional Pico Bonito es una de las reservas de bosque lluvioso más biodiversas de Centroamérica, con más de 400 especies de aves y cascadas impresionantes cerca de La Ceiba.", "en": "..."}',
  '{"es": "Parque nacional con selva tropical, cascadas y gran diversidad de aves cerca de La Ceiba. Ideal para senderismo y ecoturismo.", "en": "..."}',
  '{"es": "Lleva repelente de insectos y ropa impermeable. Los senderos pueden ser resbaladizos. Contrata un guía local para las rutas más profundas.", "en": "..."}',
  '{"es": "La Ceiba, Atlántida, Honduras"}',
  15.5833, -86.8833,
  1, true, true, false,
  'published',
  (SELECT id FROM place_categories WHERE slug = 'nature'),
  (SELECT id FROM regions WHERE slug = 'atlantida')
);
```

---

*Última actualización: 16/05/2026 — Sesión 2. Al completar el contenido, ejecutar sync de embeddings y actualizar el campo `storyCount` / `placeCount` en STATUS.md.*
