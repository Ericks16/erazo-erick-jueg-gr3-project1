# Neon Drift

Arcade de supervivencia cyberpunk creado con Phaser 3. El piloto debe recoger
núcleos de energía, mantener el combo y sobrevivir a oleadas de drones durante
90 segundos para reactivar la ciudad Neon-7.

## Ejecutar

Abre `index.html` en un navegador o sirve la carpeta con cualquier servidor
estático. No requiere instalación ni compilación.

## Controles

- Flechas o `WASD`: mover el piloto.
- `Espacio`: dash direccional con enfriamiento.
- `P`: pausar o continuar.
- `M`: activar o silenciar la música procedural.
- `T`: abrir la tienda entre partidas.
- En móvil: el juego se adapta al tamaño de pantalla y permite tocar para
  iniciar/repetir.

## Sistemas nuevos

- La música se genera con Web Audio API, así que no necesita archivos ni
  dependencias adicionales.
- Los objetos depredadores vuelven al piloto invulnerable durante unos
  segundos: al tocar un drone, lo consume y otorga puntos y créditos.
- Las oleadas generan más drones y aumentan su velocidad progresivamente.
- La tienda permite gastar créditos en turbo, imán de núcleos y blindaje.
  Las mejoras quedan guardadas durante la sesión del navegador.

## GitHub Pages

En GitHub, entra en **Settings > Pages**, selecciona la rama principal y la
carpeta `/ (root)`. El archivo `index.html` carga Phaser desde jsDelivr y el
resto del juego usa rutas relativas, por lo que funciona directamente como
sitio estático.