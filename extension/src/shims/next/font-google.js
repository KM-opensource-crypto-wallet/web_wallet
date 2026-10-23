// `next/font/google` for the extension. Fonts are bundled through CSS
// (src/app/fonts.css), so a font call only hands back the class names.
const font = ({variable} = {}) => ({
  className: '',
  variable: variable ? 'ext-font-variable' : '',
  style: {fontFamily: 'Roboto, system-ui, sans-serif'},
});

export const Roboto = font;
export default font;
