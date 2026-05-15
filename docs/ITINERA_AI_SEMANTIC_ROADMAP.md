# Itinera AI Semantic Roadmap

Doc: roadmap → Itinera IA = asistente semantico real. Adaptable nuevos datos. Sin invenciones.

## Objetivo

Itinera IA = guia cultural + operador mapa. Ventaja: entender significado datos reales Supabase, ejecutar acciones correctas en `/explore`.

IA se adapta a nuevos destinos/historias/regiones/categorias desde admin. Sin listas hardcodeadas. Sin depender 5 destinos actuales.

## Estado actual

### Ya existe

- Supabase con lugares, historias, regiones, categorias, perfiles, Storage y Edge Functions.
- `tsvector` para busqueda full-text en lugares e historias.
- PostGIS para coordenadas y busqueda geografica.
- `/api/chat` en `apps/tourist` con Groq y acciones UI.
- `/explore` con mapa, pines, search bar, filtros, card de lugar, rutas y widget IA.
- Admin en `apps/web` para gestionar contenido.

### Problemas actuales

- IA interpreta frases como filtros literales. Malo: "Tienes alguna playa bonita?" → `Busqueda: Playa bonita` en vez de categoria `Playa`.
- Sin referencias contextuales. "Agregala a la ruta" → usar ultimo destino. "Tambien Comayagua" → agregar/filtrar Comayagua, no repetir anterior.
- Recomendaciones no respetan region/categoria. "Que mas hay en Comayagua?" → solo resultados reales Comayagua.
- No hay memoria semantica persistente.
- No hay embeddings ni pgvector.
- Widget recibe poco contexto mapa.
- Sin contrato no-invencion.

## Principio central

IA solo habla/acciona sobre entidades reales de Supabase. Sin datos → decirlo + ofrecer alternativas reales.

Regla:

```text
No row in Supabase = no factual claim.
```

## Arquitectura semantica propuesta

### 1. Corpus semantico

Capa documentos semanticos de datos reales. Cada doc = entidad consultable:

- lugar,
- historia,
- region,
- categoria,
- ruta sugerida,
- contenido cultural asociado.

Tabla futura sugerida: `semantic_documents`.

Campos recomendados:

- `id`
- `entity_type`
- `entity_id`
- `locale`
- `title`
- `content`
- `metadata`
- `content_hash`
- `embedding`
- `embedding_model`
- `updated_at`

El `content` se genera desde campos existentes:

- nombre,
- slug,
- categoria,
- region,
- descripcion,
- resumen IA,
- tips,
- accesibilidad,
- coordenadas,
- historias relacionadas,
- tags/aliases si existen.

### 2. Embeddings

Embeddings por documento semantico. Proveedor encapsulado (intercambiable).

Default recomendado:

- adapter de embeddings con variable de entorno,
- modelo pequeno y economico para busqueda,
- no exponer claves en cliente.

El embedding se regenera cuando:

- cambia el nombre,
- cambia la descripcion,
- cambia categoria/region,
- cambia resumen IA,
- cambia metadata relevante.

### 3. Busqueda hibrida

No reemplazar busqueda actual. Combinar:

- full-text (`tsvector`) para coincidencias exactas,
- vector search para significado,
- PostGIS para cercania,
- filtros por categoria, region, rating, guardados y disponibilidad.

Ranking recomendado:

- coincidencia exacta de nombre/slug primero,
- categoria/region detectada despues,
- score semantico,
- cercania si hay ubicacion,
- rating como desempate.

Usar RRF/fusion scores: coincidencia semantica debil no supera nombre exacto.

## Pipeline de IA

### Paso 1: normalizar mensaje

Entrada:

- texto del usuario,
- idioma,
- contexto de pagina,
- lugar seleccionado,
- ruta activa,
- filtros activos,
- ultima accion,
- resultados visibles,
- ubicacion del usuario si existe.

Salida:

- texto normalizado,
- palabras clave turisticas,
- posibles entidades,
- posibles intenciones.

### Paso 2: detectar intencion

Intenciones minimas:

- `search_place`
- `recommend_places`
- `filter_category`
- `filter_region`
- `select_place`
- `add_route_stop`
- `remove_route_stop`
- `set_route`
- `nearby`
- `clear_filters`
- `clear_route`
- `ask_place_info`
- `clarify`

Ejemplos:

| Usuario | Intencion correcta |
| --- | --- |
| "Tienes alguna playa bonita?" | `filter_category` + `recommend_places` con categoria `Playa` |
| "Que hay en Comayagua?" | `filter_region` + `recommend_places` con region `Comayagua` |
| "Agregala a la ruta" | `add_route_stop` usando ultimo lugar seleccionado/sugerido |
| "Tambien Comayagua" | aplicar region o agregar destino relacionado segun contexto |
| "Otra opcion" | recomendar alternativas reales, no crear filtro literal |

### Paso 3: recuperar candidatos reales

Busqueda hibrida → candidatos con:

- `id`,
- `slug`,
- `name`,
- `category`,
- `region`,
- `rating`,
- `coordinates`,
- `summary`,
- `match_reason`,
- `score`.

La IA solo puede elegir entre estos candidatos.

### Paso 4: planificar accion UI

Salida endpoint separa:

- respuesta breve para el usuario,
- acciones UI parseables,
- entidades anexadas.

Acciones UI esperadas:

- `select_place`
- `center_map`
- `apply_filter`
- `clear_filters`
- `set_route`
- `add_route_stop`
- `remove_route_stop`
- `get_nearby`
- `show_recommendations`
- `clarify`

### Paso 5: responder corto

Accion ejecutada → respuesta corta:

- "Abri Playa West Bay en el mapa."
- "Encontre dos playas disponibles. Te muestro las opciones reales."
- "Agregue Playa West Bay a tu ruta."
- "No tengo destinos reales con ese texto. Te puedo sugerir estas alternativas."

Sin introducciones largas.

## Contrato de no invencion

IA NO debe:

- inventar lugares,
- inventar ratings,
- inventar coordenadas,
- inventar historias,
- inventar rutas no calculadas,
- convertir frases completas en categorias,
- recomendar entidades que no vinieron de Supabase.

Si no hay datos:

```text
No encontre eso como destino real. Te puedo mostrar opciones disponibles.
```

## Cambios esperados por area

### Supabase

- Agregar extension/vector si no existe.
- Crear tabla `semantic_documents`.
- Crear RPC de busqueda hibrida.
- Crear proceso para regenerar embeddings.
- Mantener RLS y seguridad.

### Admin

- Mostrar salud semantica:
  - sin descripcion,
  - sin coordenadas,
  - embedding pendiente,
  - categoria faltante,
  - region faltante.
- Permitir enriquecer alias/tags si hace falta.
- Guardar contenido → marcar doc semantico desactualizado.
- Estado actual: admin (`apps/web`) ya dispara rebuild automatico en guardar/editar/publicar places/stories via endpoint interno `POST /api/semantic/rebuild`.

### Tourist `/explore`

- Pasar contexto vivo al widget IA.
- Sincronizar IA con:
  - lugar seleccionado,
  - filtros,
  - ruta,
  - resultados visibles,
  - ubicacion.
- Search y chat → misma capa intencion/semantica.

### `/api/chat`

- Separar claramente:
  - clasificacion de intencion,
  - recuperacion semantica,
  - plan de accion,
  - respuesta natural.
- Validar acciones contra entidades reales.
- Nunca enviar service role al cliente.

## Casos de prueba obligatorios

### Busqueda y filtros

- "Copan" abre/sugiere Ruinas de Copan.
- "Comayagua" muestra destinos de Comayagua.
- "Playa bonita" usa categoria Playa y recomienda playas reales.
- "Naturaleza cerca de mi" combina categoria + ubicacion.
- Texto invalido no crea chip literal inutil.

### Contexto conversacional

- Usuario abre Playa West Bay.
- "Agregala a la ruta" agrega Playa West Bay.
- "Tambien Comayagua" no repite West Bay; busca entidad/region Comayagua.
- "Que mas hay ahi?" usa la region o lugar activo.

### Rutas

- Agregar destino desde IA.
- Crear ruta con varios destinos reales.
- Quitar parada desde IA.
- Limpiar ruta desde IA.

### Datos futuros

- Crear nuevo destino desde admin.
- Regenerar embedding.
- Buscarlo por nombre parcial.
- Buscarlo por descripcion semantica.
- Verificar que aparece sin tocar codigo.

## Orden de implementacion recomendado

1. Documentar y limpiar estado del proyecto.
2. Crear schema semantico en Supabase.
3. Crear generador de documentos semanticos.
4. Crear pipeline de embeddings.
5. Crear RPC de busqueda hibrida.
6. Conectar search bar de `/explore`.
7. Conectar `/api/chat` a busqueda semantica.
8. Pasar contexto vivo desde `/explore` a la IA.
9. Agregar pruebas de conversaciones reales.
10. Agregar salud semantica al admin.

## Fuentes tecnicas

- Supabase AI & Vectors: https://supabase.com/docs/guides/ai
- Supabase Hybrid Search: https://supabase.com/docs/guides/ai/hybrid-search
- pgvector: https://github.com/pgvector/pgvector
- OpenAI Embeddings API: https://platform.openai.com/docs/api-reference/embeddings

## Decision actual

Doc = guia siguiente bloque. Agente: implementar IA semantica como sistema adaptable, no reglas para datos actuales.
