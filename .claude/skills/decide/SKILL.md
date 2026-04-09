---
name: decide
description: |
  Decision Mode — toma decisiones estrategicas usando 3 perspectivas de agentes (Pragmatico, Innovador, Critico) y genera memo HTML visual. Use when: architectural decisions, tech stack choices, approach evaluation, strategic trade-offs.
  Keywords - decide, decision, choose, evaluate, compare, trade-off, pros-cons, architecture-decision
type: workflow
argument-hint: "<pregunta o brief>"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: opus
---

# Decision Mode

## Workflow

### Paso 1: Preparar Brief

Leer el argumento del usuario. Si es una pregunta corta, usarla directamente. Si es un path a un archivo, leer el archivo como brief.

Estructurar internamente:
- **Pregunta central**: La decision a tomar
- **Contexto**: Informacion relevante proporcionada
- **Constraints**: Limitaciones mencionadas

### Paso 2: Lanzar 3 Perspectivas en Paralelo

Delegar a 3 agentes simultaneamente. Cada uno recibe el brief + su perspectiva:

#### Perspectiva Pragmatica (builder)
```
Eres el PRAGMATICO en una decision estrategica.

Brief: {brief}

Analiza desde la perspectiva de implementacion practica:
- Que es lo mas rapido y seguro de implementar?
- Que opcion minimiza riesgo tecnico?
- Que opcion es mas mantenible a largo plazo?
- Cual es el coste real de cada opcion (tiempo, complejidad, deuda tecnica)?

Responde en formato:
## Posicion Pragmatica
**Recomendacion**: [tu eleccion]
**Argumento principal**: [1-2 frases]
### Pros
- ...
### Contras
- ...
### Riesgos
- ...
```

#### Perspectiva Innovadora (architect)
```
Eres el INNOVADOR en una decision estrategica.

Brief: {brief}

Analiza desde la perspectiva de diseño y vision a largo plazo:
- Que solucion es la mas elegante y escalable?
- Que opcion abre mas posibilidades futuras?
- Hay alguna solucion no convencional que nadie esta considerando?
- Que harian los mejores ingenieros del mundo?

Responde en formato:
## Posicion Innovadora
**Recomendacion**: [tu eleccion]
**Argumento principal**: [1-2 frases]
### Pros
- ...
### Contras
- ...
### Oportunidades
- ...
```

#### Perspectiva Critica (reviewer)
```
Eres el CRITICO en una decision estrategica.

Brief: {brief}

Analiza desde la perspectiva de riesgos y problemas:
- Que puede salir mal con cada opcion?
- Que costes ocultos tiene cada alternativa?
- Que asunciones no verificadas hay?
- Que preguntas deberian responderse ANTES de decidir?

Responde en formato:
## Posicion Critica
**Recomendacion**: [tu eleccion, o "necesitamos mas informacion"]
**Argumento principal**: [1-2 frases]
### Riesgos por Opcion
- Opcion A: ...
- Opcion B: ...
### Asunciones No Verificadas
- ...
### Preguntas Pendientes
- ...
```

### Paso 3: Sintetizar

Tras recibir las 3 perspectivas, sintetizar:
1. **Recomendacion final**: Cual es la mejor opcion considerando las 3 perspectivas?
2. **Nivel de confianza**: alto (3/3 acuerdan), medio (2/3 acuerdan), bajo (0 acuerdo)
3. **Tensiones**: Donde discrepan las perspectivas y por que
4. **Next steps**: Acciones concretas

### Paso 4: Generar HTML

Delegar a builder: "Genera un archivo HTML auto-contenido con el memo de decision."

El HTML debe:
- Usar el template de `.claude/skills/decide/templates/memo.html` como base
- Rellenar con los datos reales de las perspectivas y sintesis
- Guardarse en el directorio actual como `decision-memo-{timestamp}.html`
- Abrirse automaticamente: `start decision-memo-{timestamp}.html` (Windows)

### Paso 5: Resumen

Dar al usuario un resumen breve de la decision y el path al HTML generado.

## Notas

- Las perspectivas se lanzan en PARALELO (3 Agent calls en un mensaje)
- Cada perspectiva recibe la expertise acumulada del agente base si existe
- El HTML es auto-contenido (CSS inline, sin dependencias externas)
- Soporte dark/light mode via prefers-color-scheme
