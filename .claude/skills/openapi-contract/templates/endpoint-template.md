# Endpoint YAML Template

Starter template for adding a new endpoint to the OpenAPI contract.

---

## CRUD Endpoint (List + Detail)

```yaml
paths:
  /api/{resource}/:
    get:
      operationId: {resource}_list
      summary: List {Resource}s
      tags:
        - {resource}
      parameters:
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
          description: "Page number"
        - name: page_size
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
          description: "Number of results per page"
        - name: search
          in: query
          required: false
          schema:
            type: string
          description: "Search by {search_fields}"
        - name: ordering
          in: query
          required: false
          schema:
            type: string
          description: "Ordering"
        # Add filter params here (see query-param-templates.md)
      responses:
        200:
          description: Paginated list of {resource}s
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Paginated{Resource}List'
        401:
          description: Authentication required

    post:
      operationId: {resource}_create
      summary: Create {Resource}
      tags:
        - {resource}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/{Resource}Create'
      responses:
        201:
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/{Resource}'
        400:
          description: Validation error
        401:
          description: Authentication required
        403:
          description: Permission denied

  /api/{resource}/{id}/:
    get:
      operationId: {resource}_retrieve
      summary: Retrieve {Resource}
      tags:
        - {resource}
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: {Resource} detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/{Resource}'
        401:
          description: Authentication required
        404:
          description: Not found

    patch:
      operationId: {resource}_partial_update
      summary: Update {Resource}
      tags:
        - {resource}
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/{Resource}Update'
      responses:
        200:
          description: Updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/{Resource}'
        400:
          description: Validation error
        401:
          description: Authentication required
        403:
          description: Permission denied
        404:
          description: Not found

    delete:
      operationId: {resource}_destroy
      summary: Delete {Resource}
      tags:
        - {resource}
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        204:
          description: Deleted
        401:
          description: Authentication required
        403:
          description: Permission denied
        404:
          description: Not found

components:
  schemas:
    {Resource}:
      type: object
      properties:
        url:
          type: string
          format: uri
          readOnly: true
        id:
          type: string
          format: uuid
          readOnly: true
        # Add output fields here
        created_at:
          type: string
          format: date-time
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true

    {Resource}Create:
      type: object
      properties:
        # Add input fields here (required for creation)
      required: []

    {Resource}Update:
      type: object
      properties:
        # Same as Create but NO required fields (PATCH = partial)

    Paginated{Resource}List:
      type: object
      properties:
        count:
          type: integer
        next:
          type: string
          format: uri
          nullable: true
        previous:
          type: string
          format: uri
          nullable: true
        results:
          type: array
          items:
            $ref: '#/components/schemas/{Resource}'
```

---

## Custom Action Endpoint

```yaml
  /api/{resource}/{id}/{action_url_path}/:
    post:
      operationId: {resource}_{action_name}
      summary: {Action description}
      tags:
        - {resource}
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/{Action}Request'
      responses:
        200:
          description: Action completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/{Action}Response'
        400:
          description: Validation error
        401:
          description: Authentication required
        403:
          description: Permission denied
        404:
          description: Not found
```

---

## Nested Endpoint

```yaml
  /api/{parent_resource}/{parent_id}/{child_resource}/:
    get:
      operationId: {parent}_{child}_list
      summary: List {Child}s for {Parent}
      tags:
        - {child_resource}
      parameters:
        - name: {parent_id}
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
        - name: page_size
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
      responses:
        200:
          description: Paginated list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Paginated{Child}List'
```

---

## Usage Notes

1. Replace `{resource}`, `{Resource}`, `{id}` with actual values
2. Use `format: uuid` for UUID PKs, `type: integer` for auto-increment PKs
3. Add filter params from `query-param-templates.md` as needed
4. Add examples with realistic data after defining schemas
5. Verify URL pattern with `python manage.py show_urls`
