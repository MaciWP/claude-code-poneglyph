# Reviewer Expertise


## 2026-04-20 — Session a09162a8
- The `AttachableModel.attach_document` pattern (based on `get_or_create`) in loops is a latent N+1 — any `attach_document` loop must be reviewed against the existence of a bulk helper. In this project `_bulk_attach_documents` already exists in ProcessService; if it appears again elsewhere, reuse it.
- `GenericRelation` appears in `Model._meta.get_fields()` with `attname` but is NOT `concrete` — any utility that iterates over meta fields to copy values must filter on `f.concrete`. Frequent regression when `AttachableModel` is added to an existing model.
- The pattern `@action(detail=False, methods=['patch'], url_path='/')` + overriding `self.action` in `initialize_request` is a workaround that appears when a PATCH for "link existing resource" without id in URL is desired. Signal that the endpoint should be designed as POST to a subpath (e.g. `/documents/link/`) or use canonical `UpdateModelMixin`.
- Tests that mock chains like `Manager.using(...).filter(...).values_list(...)` couple to the implementation; for multi-DB testing, prefer manipulating `settings.DATABASES` and creating real data in the test DB.
- Test names containing "idempotent" must verify that a second call produces NO effects (not delete+recreate). A test for replacement semantics should be named that way explicitly.

## 2026-04-20 — Session a09162a8
- In replication commands between DBs with Django ContentTypes, ALWAYS filter by `(app_label, model)` and never by `model` alone: the model name is not globally unique and a homonymous model in another app would silently break isolation.
- The `delete + bulk_create` pattern inside a `transaction.atomic` destroys tenant data if the source of truth is not exclusively main. In Binora, for any replication command, explicitly ask the author to declare which data is "main-only" vs "tenant-writable" — idempotent diff-based replication is almost always the correct intent.
- The `self.action = "partial_update"` hack inside `initialize_request` is a recurring smell when exposing PATCH on a viewset without `UpdateModelMixin`. The canonical solution is to add the mixin and restrict `http_method_names`, never patch `self.action` by hand.
- `AttachableModel.all_files` uses a manager with a fresh query (`Document.objects.filter(attachments__...)`) that does NOT take advantage of `prefetch_related("attachments__document")`. In bulk flows (Process start, Workflow clone), you must iterate over `self.attachments.all()` explicitly, not over `all_files`, to avoid triggering N+1.
- In Binora the rule "views HTTP-only, services business-logic" also applies to attach/detach/link of documents. Any `Attachment` CRUD (beyond `serializer.save()`) should go to a `DocumentsService`, especially if it is duplicated in Process and Task viewsets.

## 2026-04-20 — Session a09162a8
- In Binora, main→tenant replication must always filter ContentType by `(app_label, model)` together — never by `model` alone — to avoid cross-app collisions with destructive operations (DELETE+bulk_create).
- The nested documents viewsets pattern is triplicated (Asset/Process/Task) with initialize_request hack + @action patch + destroy with conditional detach; always flag in reviews that it should be extracted to a mixin in `apps/library/mixins.py`.
- `CloneMixin._post_clone` is an OCP hook: subclasses must use it without modifying clone(); during review, confirm there is no N+1 in the hook (attach in a loop is a red flag).
- In nested viewsets used only for URL hierarchy, a `GenericViewSet` without mixins leaves `queryset`/`get_queryset` as dead code — review whether `RetrieveModelMixin` was intended or whether registering the child route directly on the parent router is enough.
- `bulk_create` of Attachment with `ignore_conflicts=True` skips `full_clean` and the UniqueConstraint does not deduplicate at the Python level — useful when you know the target already persists and you want idempotence, but watch out because `object_id` is stringified (`str(target.pk)`).

## 2026-04-21 — Session a09162a8
- **Anchor ViewSets in nested routers need a complete permission stack**: a "placeholder" ViewSet with no HTTP methods is still registered in the router and must carry `IsAuthenticated + DualSystemPermissions`, otherwise it remains an open surface even though it exposes no actions today. Applies to any nested-router with an intermediate viewset without actions.
- **Base `DocumentSerializer` does not inherit `StrictSerializerMixin`**: any derived document serializer (Asset/Process/Task) carries this gap. Fixing it on the base is recommended to close the three in one go.
- **"serialize-before-destroy" pattern duplicated across 3 ViewSets**: `AssetDocumentsViewSet`, `ProcessDocumentsViewSet`, `TaskDocumentsViewSet` repeat `serialized_url = DocumentURLSerializer(...).data` before `detach_and_maybe_delete`. Clear candidate for a `LibraryDocumentsViewMixin` or for `LibraryService.detach_and_maybe_delete` to return the payload directly.
- **Prefetch on a base queryset is useless if it is later re-filtered**: `workflow.stages.prefetch_related("tasks__attachments__document").all()` followed by `workflow_stage.tasks.filter(...)` discards the prefetch. The prefetch must go on the queryset that is actually iterated.

## 2026-04-23 — Session a09162a8
- Binora `LibraryService` API: `create_and_link`, `unlink` (misnamed, actually LINKS), `unlink_and_maybe_delete`. The PATCH endpoint convention in Binora (asset/process/task documents) LINKS existing documents, it does not update.
- Binora pattern: `@action(detail=False, methods=["patch"], url_path="/")` + `initialize_request` override `self.action = "partial_update"` is the established workaround so that `frontend_permissions["partial_update"]` applies to a PATCH @action (DRF resolves PATCH @action as `"patch"` by default).
- `prefetch_related` lost when re-filtering a queryset: `parent.children.prefetch_related("X")` is useless if you later access via `parent.children.filter(...)` — Django creates a new queryset and discards the cache. Recurring N+1 pattern in ProcessService.
- Binora nested router anchor ViewSet pattern: `GenericViewSet` without mixins registered only to generate the URL namespace (`tasks_router.register("tasks", TaskViewSet)`). Requires minimal `permission_classes` to avoid `AssertionError` if the base URL is accessed.

## 2026-04-23 — Session a09162a8
- In Binora, when refactoring an inline endpoint into a service, verify that the new service's method names describe the observable behavior (PATCH = "Link" should map to `link()`, not `unlink()`). Here the bug passes tests because the misnamed method happens to do the right thing — positive tests do not protect against bad semantics.
- Recurring N+1 pattern in Binora: `stages.prefetch_related("tasks__X")` followed by `stage.tasks.filter(...).prefetch_related(...)` invalidates the original prefetch. The filter creates a new queryset. ALWAYS check that the `prefetch_related` is applied to the final iterated queryset, not to the parent.
- "Anchor" ViewSets (no endpoints, only for DRF nested routing) should not declare `permission_classes` that assume methods like `get_process()`. If someone adds an `@action` later, it will blow up with AssertionError. Anchor = no permissions or trivial permission.
- Binora's multi-tenant pattern (separate DB per tenant) makes operations on GenericForeignKey / ContentType safe without explicit filtering. There is no need to add filters by company — the DB already isolates. Valuable when reviewing polymorphic cloning and attachments.

## 2026-04-23 — Session a09162a8
- In Binora the `frontend_permissions = ()` (empty tuple) pattern disables the FrontendPermissions check for that action but keeps `IsAuthenticated + DualSystemPermissions` — if this gap repeats across ViewSets without a visible TODO, the system silently loses defense in depth.
- `LibraryService` introduces a new service pattern with `@staticmethod` (no DI via constructor), breaking with `AuthService`/`AssetService`/`ProcessService`. If replicated in future services, justify it or align with DI.
- `CloneMixin._post_clone` as a pass-through hook with `(saved_objects, uuids_mapping)` is the canonical mechanism to extend clone without coupling the mixin to specific domains (e.g. library/attachments). Reusable pattern.
- Business policy not expressed in code: docs copied from workflow→process are "master" and cannot be detached (JRV-720). Without a guard in `destroy`, DELETE endpoints silently break the invariant.
- `_meta.concrete_fields` includes the `parent_link` from multi-table inheritance (relevant for Rack-Asset in Binora); when using it in generic field-copy helpers you must explicitly exclude the ptrs or it will try to copy ptr FKs and break.

## 2026-04-23 — Session a09162a8
- The repo has a recurring pattern of misalignment between `@extend_schema(responses=...)` and the actual payload returned by the view. Always verify the `return Response(...)` against what `extend_schema` declares, not only against the contract.
- Methods with a name that lies about their behavior (e.g. `unlink` that does `attach`) appear in rushed refactors of services extracted from views: always verify that the service method name matches its observable effect in tests.
- `url_path="/"` in DRF `@action` is an anti-pattern that is used here to hang PATCH off the collection path; if it recurs, consider an alternative with `UpdateModelMixin` + partial=True.
- `NON_PASSING_TESTS` in `tests_app/tests/test_contract.py` typically grows due to missing setup in `fixtures_for_contract_testing` rather than real impossibility — check whether the endpoint can pass by adding fixtures before marking as xfail.
- `Process` and `Task` have PK `BigAutoField` (integer) because they inherit from `AuditModel`/`DateTrackingModel`, not from `UUIDModel` — unlike `Document` which is UUID. Contract path params must reflect this (integer for process/task_id, uuid for document_id).

## 2026-04-24 — Session e6135518
- `Process` and `Task` in Binora **do not** inherit from `UUIDModel` — they use Django's auto-increment integer. This makes `{id}` and `{task_id}` `type: integer` in the OpenAPI contract, unlike most models which are UUID.
- `NON_PASSING_TESTS` in `test_contract.py` is the mechanism to flag endpoints that have no working schemathesis examples. Typically: multipart POST (binaries) and DELETE with variable response (200/204).
- `LinkDocumentMixin` extracts the PATCH/link pattern common between `AssetDocumentsViewSet`, `ProcessDocumentsViewSet` and `TaskDocumentsViewSet` — reusable pattern for future document ViewSets.
- `Workflow._post_clone` requires `prefetch_related("attachments__document")` on the query that loads the originals — without this prefetch there is a silent N+1 in clones with many documents.
- `_save_formset_with_audit` in `apps/processes/admin/workflow.py` is the pattern for filling in `created_by`/`modified_by` in inline admins — necessary because Django admin does not fill them in automatically in GenericTabularInline.

## 2026-04-24 — Session e6135518
- `AttachableModel` is an abstract class with `GenericRelation` — it generates no columns and needs no migrations. It is safe to add as a parent without creating a migration.
- The properties pattern for `NestedHyperlinkedIdentityField` (`asset_id`, `process_id`, `task_id`) should reside in the mixins that access the parent resource, not in the individual ViewSets. See `AssetNestedResourceMixin` as the canonical reference.
- `CanAccessProcessNestedResource` acts as a substitute for `DatacenterFilterMixin` for ViewSets nested under processes — it validates access to the parent process instead of filtering the queryset directly.
- The `url_path="/"` pattern in `@action` is the correct way to make a PATCH share a URL with the list endpoint in this project (combined with `NestedDefaultRouterSanitized`).
- mypy errors of the kind `"method undefined in superclass"` on DRF mixins are expected technical false positives — the project resolves them with `# type: ignore[attr-defined]` or `# type: ignore[misc]`.

## 2026-04-24 — Session 7b9acbd9
- The "binora custom agents" do not exist — the `.claude/agents/` directory in binora is empty. Always verify with `find .claude/agents -type f` before assuming existence based on briefs.
- `validate-tests-pass.ts` uses `process.exit(EXIT_CODES.PASS)` in all its catch blocks — the hook is permissive by design, not a strict blocker. Do not assume it guarantees full coverage.
- `lead-enforcement.ts` is WARN-ONLY (always exit 0) — there is no real enforcement preventing the Lead from using direct tools. The restriction is behavioral, not technical.
- The size asymmetry in `agent-memory/` (reviewer=120 lines, error-analyzer=13, architect=9) suggests that the SubagentStop hook does not identify/persist memory for all agent types with equal effectiveness.
- In binora, the rule (short constraint) / skill (detail on demand) separation is well executed: rules between 21-52 lines, skills between 30-194 lines. It is the correct reference pattern for future projects.

## 2026-04-26 — Session 2d82b151
- The `_save_formset_with_audit` helper is a reusable Django admin pattern for setting audit fields on inline saves — when adding new inlines to an admin class that uses it, always verify the inline's model has `created_by`/`modified_by` fields before routing through the helper.
- `AttachmentManager.attach_document` uses `get_or_create`, so calling `attach_document` multiple times with the same document and target is safe and idempotent.
- In Binora, `LibraryService.link` intentionally performs no ownership check on the linked document — any authenticated tenant user can link any document that exists in the tenant's DB. This is a design decision, not an oversight.
- `ProcessNestedResourceMixin.get_task` filters by `stage__process_id` to prevent cross-process task access — this is the correct authorization pattern for doubly-nested resources in this codebase.
- `NON_PASSING_TESTS` in `test_contract.py` is the approved way to skip multipart/file upload and delete endpoints that schemathesis cannot generate valid test data for.

## 2026-04-27 — Session 129e8f80
- In this codebase, hooks that normalize opaque (hash) → canonical identifiers must use early-return + fallback chain instead of `||` chains, to avoid inflating complexity and to maintain readability across the 3 levels.
- When adding a new public function in a hook, verify that the "skipped" log captures ALL the inputs that were attempted to resolve (not only the agentId), to facilitate future forensics.
- The `rawX !== ""` pattern is common in this repo but does not guard against whitespace-only; prefer `rawX.trim() !== ""` when the input comes from stdin JSON (it may arrive poorly trimmed from the caller).
- The downstream `updateScores` groups by `trace.agents` as a Set: any inconsistency in normalization (uppercase, hashes) silently fragments the aggregates — the normalization fix is a prerequisite for the Commandment IX metric to be valid.

## 2026-04-29 — Session edd4198f
- In Binora, `GenericTabularInline` is the correct class for inlines on models with `GenericForeignKey` (such as `Attachment`). Using the standard `TabularInline` raises `ImproperlyConfigured`.
- The `get_model_perms → {}` pattern hides from the Django Admin menu without removing the actual direct-URL access permissions.
- `AttachmentManager.attach_document` uses `get_or_create`, making document linking idempotent — this behavior has no explicit test coverage in this PR's tests.
- Tests using `admin_client` or `admin_user` require a real DB and fail if PostgreSQL is not running; tests with `mocker.Mock()` (no DB) always pass.
- The `admin_get_request` fixture is duplicated between `apps/processes/tests/conftest.py` and `apps/processes/tests/workflow_admin_tests.py` with different URLs — pattern to avoid.

## 2026-04-29 — Session edd4198f
- In Binora, the mixin `SanitizeUrlsRouterMixin._add_patch_to_list_route` applies PATCH to the list route of **any** ViewSet registered in a `NestedDefaultRouterSanitized` that has `partial_update`. Currently only `LinkDocumentMixin` adds that method, so the scope is correct — but if a ViewSet with `UpdateModelMixin` is registered in a nested sanitized router in the future, it will automatically have PATCH on its list route.
- `CloneMixin.remap_uuids` treats `pk=None` for models without UUID PK (such as `Attachment` with auto-increment). This is a deliberate design decision that lets the DB assign the new PK. The GFK `object_id` (UUIDs of AttachableModel) IS remapped correctly via `gfk_fk_fields`.
- The unlink/delete pattern in Binora is: `destroy` on the nested document endpoint only unlinks and may return 200 (doc deletable) or 204 (doc not deletable); the physical deletion is the client's responsibility by calling `DocumentViewSet.destroy`.
- The test DB in this local environment has corrupted `auth_permission` (duplicate key) which prevents running any test that requires migrations. Tests in CI/CD should work correctly.

## 2026-04-29 — Session edd4198f
- The project has `enable_db_access_for_all_tests` in the root conftest — `pytestmark = pytest.mark.django_db` is always redundant and must be removed from new test files.
- The correct pattern for per-request cache in ViewSets/mixins is `hasattr(self, "_attr")`, not `@lru_cache` — already documented in lesson #29 and correctly applied in `ProcessNestedResourceMixin`.
- `AttachmentInline` with `GenericFK` always requires `GenericTabularInline` — already documented in lesson #30 and correctly applied.
- The `LinkDocumentMixin` mixin must expose `get_document_target()` (definitive name in the current state) — ViewSets only implement this method and the mixin manages full `perform_create`, `destroy` and `partial_update`.
- The task diff may show an intermediate version of the code that was already refined before merging; always verify the current state of the files, not just the diff.

## 2026-04-29 — Session edd4198f
- The `LinkDocumentMixin` mixin uses an `initialize_request` override to map `action="patch"` → `action="partial_update"` because of the `DualSystemPermissions` map — pattern specific to this project, not a hack, it is necessary because of how the permission system resolves DRF actions.
- `TaskViewSet` is an empty "anchor viewset" (no endpoints) so that `NestedDefaultRouterSanitized` can create the `/processes/{id}/tasks/{id}/documents/` nesting level. It is a valid pattern in this codebase.
- `WorkflowAdmin.save_formset` applies `_save_formset_with_audit` to all formsets without discriminating — it works because all models have `AuditModel`, but it is different from the defensive pattern in `ProcessAdmin`.
- Process/task document tests must NOT have `pytestmark = pytest.mark.django_db` — there is a global autouse fixture in the root conftest that covers it.
- The inline import in `views_documents_tests.py:14` (`from apps.library.models import Attachment` inside a fixture) violates the file-level imports rule; it is not circular.
