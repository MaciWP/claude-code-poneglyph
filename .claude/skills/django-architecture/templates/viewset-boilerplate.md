# ViewSet Boilerplate Templates

Copy-paste ready ViewSet templates with service delegation. Based on `apps/core/views/`.

---

## Template 1: Basic ModelViewSet

```python
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

class MyModelViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.select_related().prefetch_related().order_by('name')
    serializer_class = MyModelSerializer
    permission_classes = [IsAuthenticated]
    service = MyModelService()

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.service.create(**serializer.validated_data)
        return Response(MyModelSerializer(instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = self.service.update(instance=instance, **serializer.validated_data)
        return Response(MyModelSerializer(updated).data)

    def destroy(self, request, pk=None):
        instance = self.get_object()
        self.service.delete(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
```

---

## Template 2: ViewSet with Custom Actions

```python
from rest_framework.decorators import action

class MyModelViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.select_related().order_by('name')
    serializer_class = MyModelSerializer
    service = MyModelService()

    def get_serializer_class(self):
        return {
            'custom_action': CustomActionInputSerializer,
        }.get(self.action, MyModelSerializer)

    @action(methods=['POST'], detail=True, url_path='custom-action')
    def custom_action(self, request, pk=None):
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = self.service.perform_custom_action(instance=instance, **serializer.validated_data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MyModelSerializer(result).data)
```

---

## Template 3: Read-Only ViewSet

```python
from rest_framework import viewsets, mixins

class MyModelViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = MyModel.objects.select_related().order_by('name')
    serializer_class = MyModelSerializer
    permission_classes = [IsAuthenticated]
```

---

## Template 4: ViewSet with Input/Output Serializers

```python
class MyModelViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.select_related().order_by('name')
    serializer_class = MyModelOutputSerializer
    service = MyModelService()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MyModelInputSerializer
        return MyModelOutputSerializer

    def create(self, request):
        input_serializer = self.get_serializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        instance = self.service.create(**input_serializer.validated_data)
        return Response(MyModelOutputSerializer(instance).data, status=status.HTTP_201_CREATED)
```

---

## Template 5: Perform Methods Pattern

From `apps/core/views/auth.py:64-65`:

```python
class MyModelViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.all()
    serializer_class = MyModelSerializer
    service = MyModelService()

    def perform_create(self, serializer):
        serializer.instance = self.service.create(**serializer.validated_data)

    def perform_update(self, serializer):
        serializer.instance = self.service.update(
            instance=serializer.instance, **serializer.validated_data
        )

    def perform_destroy(self, instance):
        self.service.delete(instance)
```

---

## Error Handling Pattern

```python
def create(self, request):
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        instance = self.service.create(**serializer.validated_data)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
    return Response(MyModelSerializer(instance).data, status=status.HTTP_201_CREATED)
```

---

## URL Registration

```python
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'my-models', MyModelViewSet, basename='my-model')
urlpatterns = [path('', include(router.urls))]
```

---

## ViewSet Creation Checklist

- [ ] `queryset` with `select_related()` + `order_by()`
- [ ] `serializer_class` or `get_serializer_class()`
- [ ] `permission_classes` (declarative)
- [ ] Service instance as class attribute
- [ ] Methods 5-15 lines, delegate to service
- [ ] NO business logic, NO direct ORM calls
- [ ] Proper error handling (try/except -> HTTP status)
- [ ] Custom actions use `@action` decorator

---

**Last Updated**: 2026-03-18
**Based on**: Real Binora patterns (apps/core/views/)
