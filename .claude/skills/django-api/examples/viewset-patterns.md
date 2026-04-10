# ViewSet Patterns - Examples

## Example 1: Anti-Patterns to Correction

### BEFORE (multiple anti-patterns)

```python
class BadUserViewSet(ModelViewSet):
    queryset = User.objects.all()  # Missing select_related, order_by
    serializer_class = UserSerializer  # Same for read/write
    permission_classes = [IsAuthenticated]  # Hardcoded

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password = generate_password()  # Business logic in view
        user = User.objects.create(email=serializer.validated_data['email'], password=make_password(password))
        send_mail('Welcome', f'Password: {password}', 'noreply@binora.com', [user.email])  # Side effect
        return Response(UserSerializer(user).data, status=201)
```

### AFTER (correct)

```python
class GoodUserViewSet(ModelViewSet):
    auth_service_class = AuthService
    queryset = User.objects.select_related('company').order_by('id')
    serializer_class = UserMeSerializer
    frontend_permissions = {"create": [FrontendPermissions.USERS_CREATE]}

    def get_serializer_class(self):
        return UserCreateSerializer if self.action == 'create' else self.serializer_class

    def perform_create(self, serializer):
        user = self.auth_service_class().create_user(serializer.validated_data)
        serializer.instance = user
```

## Example 2: @action Best Practices

### WRONG

```python
@action(detail=False, methods=['get'])  # No permissions, inherits pagination
def export_users(self, request):
    users = User.objects.all()  # N+1 query
    output = StringIO()
    writer = csv.writer(output)
    for user in users:
        writer.writerow([user.email, user.company.name])  # N+1 here
    return Response(output.getvalue(), content_type='text/csv')
```

### CORRECT

```python
@action(detail=False, methods=['get'], url_path='export', permission_classes=[HasFrontendPermissions], pagination_class=None)
def export_users(self, request):
    users = self.get_queryset().select_related('company')
    csv_content = UserExportService().export_to_csv(users)
    response = HttpResponse(csv_content, content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="users.csv"'
    return response
```

## Example 3: get_queryset() Optimization by Action

```python
class ProcessViewSet(ModelViewSet):
    queryset = Process.objects.select_related('created_by').order_by('-created_at')

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            return qs.select_related('created_by', 'process_type').only('id', 'code', 'name', 'status', 'created_at')
        elif self.action == 'retrieve':
            return qs.select_related('workflow').prefetch_related(
                Prefetch('documents', queryset=Document.objects.filter(active=True).select_related('created_by')),
                Prefetch('comments', queryset=Comment.objects.order_by('-created_at'))
            )
        return qs
```

**Performance**: list 500 queries -> 2 queries, retrieve 8 queries -> 6 queries

## Example 4: Mixin Composition

```python
class HierarchyLevelMixin:
    hierarchy_service_class = HierarchyService

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.select_related('parent').order_by('code') if self.action == 'list' else qs

    @action(detail=True, methods=['get'], url_path='navigate')
    def navigate(self, request, pk=None):
        tree = self.hierarchy_service_class().navigate_from_node(self.get_object())
        return Response(tree)

class DatacenterViewSet(HierarchyLevelMixin, CreateModelMixin, RetrieveModelMixin, ListModelMixin, GenericViewSet):
    queryset = Datacenter.objects.all()
    serializer_class = DatacenterSerializer
```

**Benefits**: DRY (navigate() once), flexible CRUD composition
