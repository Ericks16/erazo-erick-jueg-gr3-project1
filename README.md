# Neon Drift

Campaña arcade cyberpunk creada con Phaser 3. El piloto debe cruzar tres actos,
recoger núcleos, sobrevivir a oleadas cada vez más agresivas y destruir al
Soberano, la inteligencia artificial que controla Neon-7.

## Ejecutar

Abre `index.html` en un navegador o sirve la carpeta con cualquier servidor
estático. No requiere instalación ni compilación.

## Controles

- Flechas o `WASD`: mover el piloto.
- `Espacio`: dash direccional con enfriamiento.
- `P`: pausar o continuar.
- `M`: activar o silenciar la música procedural.
- `T`: abrir la tienda entre partidas.
- `F` o clic: disparar una bala al objetivo más cercano.
- `R`: recargar munición.
- En móvil: el juego se adapta al tamaño de pantalla y permite tocar para
  iniciar/repetir.

## Sistemas nuevos

- La música se genera con Web Audio API, así que no necesita archivos ni
  dependencias adicionales.
- Los objetos depredadores vuelven al piloto invulnerable durante unos
  segundos: al tocar un drone, lo consume y otorga puntos y créditos.
- Las cajas de munición aparecen durante la campaña. Las balas destruyen drones
  y también dañan directamente al jefe.
- Las esquinas del mapa están protegidas por pinchos; el skyline, sus ventanas,
  las estrellas y el tráfico aéreo tienen animaciones independientes.
- Las oleadas generan más drones y aumentan su velocidad progresivamente.
- La tienda permite gastar créditos en turbo, imán de núcleos y blindaje.
  Las mejoras quedan guardadas durante la sesión del navegador.

## Campaña

1. **Distrito Cero:** recoge 12 núcleos antes de que se cierre el sector.
2. **La Fosa:** sobrevive 45 segundos con una densidad creciente de drones.
3. **Núcleo Soberano:** consigue un objeto Depredador y consume al jefe para
   destruirlo. El contacto normal con el jefe causa daño.

## GitHub Pages

El repositorio incluye un workflow oficial en
`.github/workflows/pages.yml`. Cada push a `main` publica automáticamente la
carpeta raíz como sitio estático. La URL pública es:

`https://ericks16.github.io/erazo-erick-jueg-gr3-project1/`

El archivo `index.html` carga Phaser desde jsDelivr y el resto del juego usa
rutas relativas, por lo que no requiere un proceso de compilación.