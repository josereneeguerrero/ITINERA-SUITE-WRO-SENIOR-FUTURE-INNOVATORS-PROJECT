# Roadmap: pgvector y ranking semántico en nube

**Estado actual:** la búsqueda pública es **geo + SQL** mediante [`search_places_nearby`](../supabase/migrations/20260508050000_search.sql) (rating, distancia, boost de sponsors). No hay extensión `vector` ni tabla de embeddings en las migraciones actuales.

Este documento fija **cuándo** y **cómo** valuar pgvector sin comprometer el alcance IA v1 (ver [ia-scope-v1.md](ia-scope-v1.md)).

---

## 1. Señales para adoptar pgvector

Considerar embeddings en Supabase cuando **al menos una** sea cierta:

- Los visitantes preguntan en lenguaje natural con sinónimos o temas que **no** mapean bien a `category_id` / `slug`, y el equipo no quiere mantener un diccionario enorme de reglas.
- Se necesita **re-ranking** por similitud semántica **en servidor** (no solo en el Jetson) para coherencia entre terminales y futura app web.
- El volumen de lugares y consultas justifica el coste operativo (almacenamiento de vectores + jobs de actualización).

**No es obligatorio** si v1 se resuelve con:

- Ranking actual + RAG en el borde sobre fichas JSON ya descargadas.
- Clasificación de intents ligera + filtros explícitos en RPC.

---

## 2. Diseño de alto nivel (si entra en roadmap)

1. **Extensión:** migración `create extension if not exists vector;` (confirmar plan Supabase y límites de región).
2. **Tabla** (ejemplo conceptual, no implementado):
   - `place_embeddings (place_id uuid primary key references places(id), embedding vector(1536), model_id text, updated_at timestamptz)`
   - o columna `places.embedding vector(...)` si se prefiere denormalización (más simple de join, más pesada en backups).
3. **Índice:** `ivfflat` o `hnsw` según tamaño y latencia objetivo; tunear `lists` / `m` / `ef_construction` tras benchmarks.
4. **RPC híbrida:** función que combine `search_places_nearby` con similitud coseno filtrada por distancia máxima y `status = published`.

---

## 3. Privacidad y contenido

- Embeddings se generan sobre **texto público ya publicado** (`name_i18n`, descripciones, `ai_description_i18n` curado). Evitar reseñas de usuario crudas en v1 del índice.
- Versionar `model_id` en fila para **re-embed** cuando cambie el modelo.

---

## 4. Alternativas sin pgvector en nube

| Enfoque | Pros | Contras |
|--------|------|--------|
| RAG local en Jetson con SQLite + vector extension nativa o FAISS | Sin coste Supabase extra; latencia local | Cada terminal debe sincronizar / actualizar índice |
| Solo re-rank en vLLM/LLM con lista corta de RPC | Implementación rápida | Dependencia del modelo para ordenación; menos reproducible |
| Búsqueda lexical (Postgres `tsvector`) | Sin ML | No capta sinónimos como embeddings |

---

## 5. Criterio de cierre de evaluación

Antes de abrir un PR de migración pgvector, el equipo debe documentar:

- Tamaño esperado del corpus (nº de lugares, dimensiones del modelo).
- SLA de latencia p95 para una consulta híbrida geo + vector.
- Estrategia de actualización cuando cambie una ficha (batch nocturno vs trigger asíncrono).

Hasta entonces, **mantener search_places_nearby como fuente de verdad** del ranking v1.
