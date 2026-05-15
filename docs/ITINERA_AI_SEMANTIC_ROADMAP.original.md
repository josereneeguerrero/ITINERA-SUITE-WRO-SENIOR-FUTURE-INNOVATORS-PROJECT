# Itinera AI Semantic Roadmap

Este documento deja claro que sigue para convertir Itinera IA en un asistente semantico real, adaptable a nuevos datos y seguro contra invenciones.

## Objetivo

Itinera IA debe funcionar como guia cultural y operador del mapa. Su ventaja no sera responder bonito, sino entender el significado de los datos reales de Supabase y ejecutar acciones correctas en `/explore`.

La IA debe adaptarse cuando se agreguen nuevos destinos, historias, regiones o categorias desde el panel admin. No debe depender de listas hardcodeadas ni de los cinco destinos actuales.

## Estado actual

### Ya existe

- Supabase con lugares, historias, regiones, categorias, perfiles, Storage y Edge Functions.
- `tsvector` para busqueda full-text en lugares e historias.
- PostGIS para coordenadas y busqueda geografica.
- `/api/chat` en `apps/tourist` con Groq y acciones UI.
- `/explore` con mapa, pines, search bar, filtros, card de lugar, rutas y widget IA.
- Admin en `apps/web` para gestionar contenido.

### Problemas actuales

- La IA interpreta frases completas como filtros literales.
  - Ejemplo malo: "Tienes alguna playa bonita?" crea `Busqueda: Playa bonita` en vez de usar categoria `Playa`.
- No entiende bien referencias contextuales.
  - "Agregala a la ruta" debe usar el ultimo destino abierto o sugerido.
  - "Tambien Comayagua" debe agregar/filtrar por Comayagua, no repetir el destino anterior.
- Las recomendaciones no siempre respetan region/categoria.
  - "Que mas hay en Comayagua?" debe devolver solo resultados reales de Comayagua.
- No hay memoria semantica persistente.
- No hay embeddings ni pgvector.
- El widget recibe poco contexto del mapa.
- No existe un contrato fuerte de no invencion.

## Principio central

La IA solo puede hablar o accionar sobre entidades reales recuperadas desde Supabase. Si no hay datos suficientes, debe decirlo y ofrecer alternativas reales.

Regla:

```text
No row in Supabase = no factual claim.
```

## Arquitectura semantica propuesta

### 1. Corpus semantico

Crear una capa de documentos semanticos derivados de datos reales. Cada documento representa una entidad consultable:

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

Generar embeddings para cada documento semantico. El proveedor debe estar encapsulado para poder cambiarlo.

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

No reemplazar la busqueda actual. Combinar:

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

Usar RRF o fusion de scores para evitar que una coincidencia semantica debil supere un nombre exacto.

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

Usar busqueda hibrida para devolver candidatos con:

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

La salida del endpoint debe separar:

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

Cuando una accion ya se ejecuto, la respuesta debe ser corta:

- "Abri Playa West Bay en el mapa."
- "Encontre dos playas disponibles. Te muestro las opciones reales."
- "Agregue Playa West Bay a tu ruta."
- "No tengo destinos reales con ese texto. Te puedo sugerir estas alternativas."

Evitar introducciones largas y repetidas.

## Contrato de no invencion

La IA no debe:

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
- Al guardar contenido, marcar documento semantico como desactualizado.

### Tourist `/explore`

- Pasar contexto vivo al widget IA.
- Sincronizar IA con:
  - lugar seleccionado,
  - filtros,
  - ruta,
  - resultados visibles,
  - ubicacion.
- Search y chat deben usar la misma capa de intencion/semantica.

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

Este documento es la guia del siguiente bloque. El siguiente agente debe implementar la IA semantica como sistema adaptable, no como reglas para los datos actuales.
