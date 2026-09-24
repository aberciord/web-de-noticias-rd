window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-VC72BJ3E69');

// Carga Google Analytics después de que la página ya cargó, para no
// competir por CPU con el contenido durante el render inicial.
window.addEventListener('load', function () {
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-VC72BJ3E69';
  document.head.appendChild(s);
});
