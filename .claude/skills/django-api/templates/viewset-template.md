# ViewSet Template

Copy-paste template for creating new ViewSets in Binora.

## Standard ModelViewSet

```python
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.permissions import DualSystemPermissions
from apps.frontend.models import FrontendPermissions

from ..models import MyModel
from ..serializers import MyModelCreateSerializer, MyModelOutputSerializer, MyModelUpdateSerializer
from ..services import MyModelService


class MyModelViewSet(ModelViewSet):
    my_model_service_class = MyModelService
    queryset = MyModel.objects.select_related(
        'related_fk',
    ).prefetch_related(
        'related_m2m',
    ).order_by('id')
    serializer_class = MyModelOutputSerializer
    permission_classes = [IsAuthenticated, DualSystemPermissions]
    frontend_permissions = {
        "list": [FrontendPermissions.MYMODEL_VIEW],
        "retrieve": [FrontendPermissions.MYMODEL_VIEW],
        "create": [FrontendPermissions.MYMODEL_CREATE],
        "update": [FrontendPermissions.MYMODEL_EDIT],
        "partial_update": [FrontendPermissions.MYMODEL_EDIT],
        "destroy": [FrontendPermissions.MYMODEL_DELETE],
    }

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            return qs.only('id', 'name', 'code', 'created_at')
        return qs

    def get_serializer_class(self):
        return {
            "create": MyModelCreateSerializer,
            "update": MyModelUpdateSerializer,
            "partial_update": MyModelUpdateSerializer,
        }.get(self.action, self.serializer_class)

    def perform_create(self, serializer):
        instance = self.my_model_service_class().create(serializer.validated_data)
        serializer.instance = instance

    def perform_update(self, serializer):
        instance = self.my_model_service_class().update(
            self.get_object(), serializer.validated_data
        )
        serializer.instance = instance
```

## Partial CRUD (Mixin Composition)

```python
from rest_framework.mixins import CreateModelMixin, ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet


class MyModelViewSet(CreateModelMixin, RetrieveModelMixin, ListModelMixin, GenericViewSet):
    # Same pattern, but only supports create + retrieve + list (no update/delete)
    ...
```

## Custom @action

```python
    @action(
        detail=True,
        methods=['post'],
        url_path='activate',
        permission_classes=[IsAuthenticated, DualSystemPermissions],
    )
    def activate(self, request, pk=None):
        instance = self.get_object()
        self.my_model_service_class().activate(instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=['get'],
        url_path='export',
        permission_classes=[IsAuthenticated, DualSystemPermissions],
        pagination_class=None,
    )
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        data = self.my_model_service_class().export(queryset)
        return Response(data)
```

## Nested ViewSet

```python
# routers.py
from apps.core.utils.routers import NestedDefaultRouterSanitized

router.register("mymodels", MyModelViewSet)
nested_router = NestedDefaultRouterSanitized(router, "mymodels", lookup="mymodel")
nested_router.register("documents", MyModelDocumentsViewSet, basename="mymodel-documents")
```
