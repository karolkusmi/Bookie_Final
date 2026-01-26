# Mensaje de Commit - Implementación de Chat con IA

## Resumen
Implementación completa de un sistema de chat con inteligencia artificial para recomendaciones de libros, incluyendo funcionalidad de streaming y botón "Sorpréndeme" para recomendaciones aleatorias.

## Cambios Principales

### Backend (Python/Flask)
- **src/api/routes.py**: 
  - Agregado endpoint `/api/ai-chat` con streaming de respuestas usando Server-Sent Events (SSE)
  - Agregado endpoint `/api/ai-chat/random-book` para obtener libros aleatorios desde Google Books API
  - Integración con Google Gemini API para generar recomendaciones de libros
  - Detección automática de modelos disponibles de Gemini

- **src/app.py**:
  - Agregado `load_dotenv()` para cargar variables de entorno desde archivo `.env`

- **requirements.txt**:
  - Agregado `google-generativeai==0.3.2` para integración con Google Gemini

- **Pipfile**:
  - Agregado `google-generativeai = "*"` en dependencias

- **.env.example**:
  - Agregado `GEMINI_API_KEY` como variable de entorno requerida

### Frontend (React)
- **src/front/components/AIChat/AIChat.jsx**: 
  - Nuevo componente de chat con IA completamente separado del chat existente
  - Implementación de streaming de mensajes en tiempo real
  - Manejo de historial de conversación
  - Integración con endpoint de backend

- **src/front/components/AIChat/AIChat.css**:
  - Estilos modernos para la interfaz de chat con IA
  - Diseño responsive
  - Animaciones y efectos visuales

- **src/front/pages/AIChatPage.jsx**:
  - Nueva página dedicada para el chat con IA

- **src/front/pages/AIChatPage.css**:
  - Estilos para la página del chat con IA

- **src/front/routes.jsx**:
  - Agregada ruta `/ai-chat` dentro del Layout principal

- **src/front/components/Navbar.jsx**:
  - Agregado enlace "Chat IA" en el menú de navegación

## Funcionalidades Implementadas

1. **Chat con IA**: Los usuarios pueden conversar con un asistente virtual especializado en recomendaciones de libros
2. **Streaming de Respuestas**: Las respuestas de la IA se muestran en tiempo real mientras se generan
3. **Botón "Sorpréndeme"**: Permite obtener recomendaciones aleatorias de libros desde Google Books API
4. **Historial de Conversación**: El chat mantiene contexto de la conversación para recomendaciones más precisas
5. **Interfaz Separada**: El chat con IA es completamente independiente del chat entre usuarios existente

## Configuración Requerida

- Variable de entorno `GEMINI_API_KEY` debe estar configurada en el archivo `.env`
- Instalar dependencias: `pipenv install` o `pip install -r requirements.txt`

## Notas Técnicas

- El sistema detecta automáticamente qué modelos de Gemini están disponibles
- Usa Server-Sent Events (SSE) para streaming eficiente de respuestas
- Integrado con Google Books API para recomendaciones aleatorias
- Diseño responsive y accesible
