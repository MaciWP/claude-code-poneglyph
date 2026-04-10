h# Ejemplos de Conventional Comments

Ejemplos reales organizados por label, usando codigo Python/Django del proyecto Binora.

---

## praise

```
praise: Excelente uso de `select_related('company')` en el queryset.
Evita N+1 queries en el listado de usuarios.
```

```
praise: Buena decision separar la logica en un service.
Esto facilita el testing y mantiene el view limpio.
```

```
praise: Me gusta como usaste `bulk_create` aqui.
Reduce las queries de N a 1 para la creacion masiva de assets.
```

---

## suggestion (blocking)

```
suggestion (blocking): Considera mover esta logica al `AssetService`.
El view no deberia contener logica de negocio -- esto viola la arquitectura
Views -> Services -> Models del proyecto.
```

```
suggestion (blocking): Usa `get_object_or_404` en lugar de try/except manual.
Esto simplifica el codigo y retorna el 404 correcto automaticamente.
```

```
suggestion (blocking): Anade `order_by('id')` al queryset.
Sin orden explicito, la paginacion puede devolver resultados duplicados
o inconsistentes entre paginas.
```

---

## suggestion (non-blocking)

```
suggestion (non-blocking): Se podria usar `values_list('id', flat=True)` aqui.
No es critico pero evita instanciar objetos completos cuando solo necesitas IDs.
```

```
suggestion (non-blocking): Considera extraer esta validacion a un metodo del serializer.
Quedaria mas limpio y reutilizable, pero funciona bien como esta.
```

---

## issue (blocking)

```
issue (blocking): Este endpoint no valida permisos del usuario.
Un usuario sin `AccessProfile` podria acceder a datos de otra company.

suggestion: Anade `permission_classes = [IsAuthenticated, HasAccessProfile]`
al ViewSet.
```

```
issue (blocking): `filter(tenant_id=company.id)` viola la regla de multi-tenant.
El middleware maneja el filtrado de tenant automaticamente.

suggestion: Cambia a `User.objects.filter(email=email)` sin filtro manual de tenant.
```

```
issue (blocking): Falta `select_related('product_model')` en el queryset de assets.
Esto genera una query adicional por cada asset en el listado (N+1).

suggestion: Anade `.select_related('product_model', 'parent')` al queryset base.
```

---

## question (non-blocking)

```
question (non-blocking): Hay alguna razon para usar `CharField` en lugar de `TextField` aqui?
El campo `description` podria necesitar mas de 255 caracteres.
```

```
question (non-blocking): Este `is_partial` se usa en algun otro lugar?
Pregunto porque no lo veo referenciado en el frontend ni en otros serializers.
```

```
question (non-blocking): Consideraste usar `transaction.atomic()` aqui?
Si falla la creacion del asset, el naming convention ya habra consumido un numero de secuencia.
```

---

## thought (non-blocking)

```
thought (non-blocking): Para el futuro, podriamos cachear el resultado de `get_naming_convention`.
Se llama en cada creacion de asset y la convencion rara vez cambia.
```

```
thought (non-blocking): Eventualmente podriamos unificar estos dos serializers en uno con campos dinamicos.
No es necesario ahora, pero simplificaria el mantenimiento.
```

---

## nitpick (non-blocking)

```
nitpick (non-blocking): Menor: preferiria `is_active` en lugar de `active` para consistencia
con el resto de modelos del proyecto.
```

```
nitpick (non-blocking): El import de `typing` no se usa. Se puede eliminar.
```

```
nitpick (non-blocking): Menor: los imports de terceros deberian ir antes que los locales
(stdlib -> third-party -> local).
```

---

## typo

```
typo: "recive" -> "receive" en el docstring de `AssetService.create`.
```

```
typo: "datcenter" -> "datacenter" en el nombre de la variable (linea 45).
```

---

## todo

```
todo: Falta anadir el archivo de migracion para el nuevo campo `rack_type`.
```

```
todo: Hay que actualizar el fixture `predefined_naming_conventions` con el nuevo tipo.
```

---

## chore

```
chore (non-blocking): Actualizar el contrato OpenAPI con el nuevo campo en la respuesta.
```

---

## note

```
note (non-blocking): Este endpoint tambien se consume desde el dashboard de administracion.
Cualquier cambio en el response afecta a ambos clientes.
```

```
note (non-blocking): El campo `datacenter` en Rack se rellena automaticamente
via `HierarchyService` al guardar. No hace falta setearlo manualmente.
```

---

## polish (non-blocking)

```
polish (non-blocking): Renombrar `data` a `asset_data` para mayor claridad.
El nombre generico `data` se confunde con el `request.data` de DRF.
```

```
polish (non-blocking): Extraer el magic number `30` a una constante `MAX_RETRY_ATTEMPTS`.
```

---

## Ejemplo Real: Review Completo

Ejemplo de como se veria una review completa de una PR:

### PR: "Anadir endpoint de listado de racks"

**Comentario general (en el body de la PR):**

```
praise: Buen trabajo con la implementacion del endpoint. La estructura sigue bien
el patron del proyecto y los tests cubren los casos principales.

note (non-blocking): Recuerda que los racks ahora son Assets (multi-table inheritance),
asi que el queryset base deberia filtrar por `asset_type=Asset.Type.RACK`.
```

**Comentarios en linea:**

```python
# En views/rack.py, linea 25
issue (blocking): Falta `order_by('code')` en el queryset.
Sin orden explicito la paginacion sera inconsistente.

suggestion: Anade `.order_by('code')` al `get_queryset()`.
```

```python
# En serializers/rack.py, linea 12
suggestion (non-blocking): Podrias usar `SerializerMethodField` para `full_location`
en lugar de calcularlo en el view. Mantiene la logica de presentacion en el serializer.
```

```python
# En services/rack_service.py, linea 8
praise: Buena decision inyectar el `HierarchyService` como dependencia.
Facilita el testing con mocks.
```

```python
# En tests/test_rack_views.py, linea 45
nitpick (non-blocking): El nombre `test_list` es muy generico.
Sugiero `test_list_racks_returns_only_company_racks` para mayor claridad.
```
