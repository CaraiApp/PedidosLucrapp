# Íconos de LucrApp

## Información importante sobre los íconos de la aplicación

Los archivos PNG en este directorio son marcadores de posición y deben ser reemplazados con íconos reales de alta calidad para la versión de producción.

Para generar íconos reales, puedes:

1. Usar el archivo `icon-base.svg` como base para generar todos los tamaños necesarios
2. Utilizar herramientas online como [RealFaviconGenerator](https://realfavicongenerator.net/) o [PWABuilder](https://www.pwabuilder.com/)
3. Utilizar herramientas gráficas como Adobe Illustrator, Sketch o Figma para exportar a los tamaños requeridos

## Instrucciones para desarrolladores

Para resolver el error de carga de íconos, asegúrate de:

1. Reemplazar los archivos de marcador de posición con íconos reales
2. Verificar que los tamaños coincidan con lo especificado en el manifest.json
3. Comprobar que los archivos tienen el formato correcto (PNG válido)

El manifest.json actual usa principalmente el ícono SVG, pero algunos navegadores y dispositivos requieren versiones en PNG.