# Ejemplos reales del proyecto JRV — calibra aquí el nivel de detalle

Destilados de tickets reales. Lee esto antes de redactar: el objetivo es un ticket que cabe en una pantalla, sin repetir nada, con ACs marcables. Ni esqueletos vacíos ni novelas.

## Historia buena (compacta, ~10 líneas de contenido)

Basada en un ticket real de borrado lógico:

```markdown
## 🧩 Historia de Usuario. Contexto (EL QUÉ)

**Como** administrador de binOra
**Quiero** que el borrado de Companies sea borrado lógico
**Para** poder activar y desactivar tenants sin borrar realmente la Company, y que sea recuperable

## ✅ Criterios de Aceptación (DoD funcional)

- [ ] Al borrar una Company queda marcada como eliminada, no se elimina de base de datos
- [ ] Se usa el mismo mecanismo de borrado lógico existente en otros modelos
- [ ] No se puede crear una Company con el mismo subdomain que otra, aunque esté borrada
- [ ] Al borrar una Company, su tenant deja de estar disponible
- [ ] Al recuperar una Company eliminada, su tenant vuelve a estar disponible
```

Por qué funciona: valor claro en 3 líneas, 5 ACs marcables de una línea, cero secciones vacías, cero duplicación. El CÓMO (qué tabla, qué flag) queda para el desarrollador.

## Agent Story buena (esencia)

```markdown
**Como** agente de IA conectado a binOra mediante MCP
**Quiero** poder solicitar procesos de forma guiada (paso a paso) o masiva
**Para** automatizar la creación de solicitudes reduciendo la intervención humana en tareas repetitivas

- [ ] **Solicitud guiada**
- [ ] Una tool MCP devuelve los campos requeridos para el tipo de proceso seleccionado
- [ ] Cada campo inválido devuelve error estructurado (código, campo, descripción) que permite autocorregir
- [ ] **Solicitud masiva (batch)**
- [ ] Un lote se procesa devolviendo resumen por solicitud (éxito con ID, o error con detalle)
- [ ] Las solicitudes fallidas no bloquean el resto del lote
```

Nota el nivel: contrato a nivel producto (qué recibe el agente), sin enumerar payloads campo a campo. Los bloques en negrita son etiquetas cortas, no frases que repiten a sus hijos.

## Antecedentes que valen su sitio

De una Agent Story real que casi no existe: el equipo dudó si la validación masiva por chat chocaba con la propuesta de valor de binOra (trazabilidad, decisión caso a caso) y concluyó que la validación debe ser siempre individual. Eso — la decisión de alcance y su porqué — son los Antecedentes perfectos: 2-3 líneas que evitan que la discusión se repita en refinamiento. Esa reflexión debe pasar EN la entrevista, antes de que el ticket exista.

## Anti-patrones reales (todos vistos en JRV)

**1. "Según diseño" como AC.** Visto en un informe de proceso:

```markdown
- [ ] **Cabecera del informe con datos generales del proceso**
- [ ] Según diseño
```

No es marcable ni aporta: el diseño ya vive en Figma. Corrección: la referencia Figma va en 🖇️ Referencias y el AC captura solo lo que el diseño no expresa ("Todo el informe es de solo lectura"). Ese mismo ticket dejó un placeholder "Cosita de siguientes partes" — el pase de recorte existe para cazar esto.

**2. Duplicación cabecera↔hijos y AC↔regla.** Visto en una historia de rechazo de solicitudes:

```markdown
- [ ] **La solicitud rechazada pasa a estado Rechazada sin generar proceso**
- [ ] Al rechazar una solicitud, esta cambia su estado a Rechazada.
...
## 🧠 Reglas de negocio
- Una solicitud rechazada nunca debe generar un proceso.
```

La negrita repite a sus hijos y la regla repite el AC. Corrección: cabecera = etiqueta corta ("Rechazo sin proceso"), y la regla se elimina o el AC — cada hecho vive en UN sitio.

**3. Mega-historia con casuística exhaustiva.** Una HU real de permisos ocupó 11.600 caracteres enumerando cada combinación origen × rol × permiso como bloques de ACs, con flags "revisar" incrustados. Ilegible e inestimable. Corrección: trocear por punto de entrada (una historia por origen) o extraer la matriz a un doc de Confluence referenciado, dejando en cada historia solo sus ACs.

**4. Plantilla rellenada por rellenar.** Un bug real de correos entre tenants: "Pasos para reproducir" vacío, resultado actual = solo una captura, y el entorno respondido con "Navegador: Si / versión: 2". Corrección: si un campo de la plantilla no aplica o no se sabe, se pregunta o se omite — nunca se rellena con ruido. Y los pasos para reproducir son innegociables en un Error.

**5. Contenido en la sección equivocada + secciones vacías entregadas.** Una historia real metió toda la investigación (opciones, capturas, dudas de infra) como bullets bajo el título de la sección Historia, dejando ACs y Referencias como cabeceras vacías. Si hay investigación que hacer, es un Spike; si es una historia, el Como/Quiero/Para no es opcional y las cabeceras vacías se eliminan.

**6. Prosa sin estructura.** Ticket real completo: "Si has entrado a Kanban, has filtrado por Mac…, y luego entras en uno de los procesos, al volver atrás, volver a mostrar el kanban filtrado." La necesidad es legítima pero no hay rol, valor ni ACs. Es el input perfecto para la entrevista, no un ticket terminado.

**7. Stack trace completo en la descripción.** Un Error real pegó ~3.000 caracteres de traceback. Corrección: 2-3 líneas significativas del log + diagnóstico en una frase con enlace al commit; el dump completo va a un comentario o adjunto.

**8. DoD transversal copiado en el ticket.** Checklists tipo "tests 100% / PR aprobada por front y back / contrato actualizado / nox pasa" aparecen repetidos en subtareas reales. En subtareas de desarrollo pueden ser plantilla del equipo; en una Historia son ruido: ese es el DoD transversal, aplica a TODO el trabajo y vive en los acuerdos del equipo, no en cada ticket. En la Historia solo va el DoD funcional (sus ACs) y, como excepción, requisitos de calidad que superen el estándar ("requiere prueba de carga con 10.000 activos").
