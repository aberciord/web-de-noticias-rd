var l = document.getElementById('gfonts-css');
if (l) {
  // Si ya terminó de bajar (cache, o llegó antes de que este script
  // corriera) el evento "load" ya se disparó y nunca lo vamos a atrapar
  // — l.sheet existe apenas se parsea el CSS, sin importar si su media
  // coincide con la página, así que sirve para detectar ese caso.
  if (l.sheet) { l.media = 'all'; }
  else { l.addEventListener('load', function () { l.media = 'all'; }); }
}
