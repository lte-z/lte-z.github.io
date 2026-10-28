const theme = (name: string, type: 'light' | 'dark', ink: string, background: string, keyword: string, string: string, comment: string, literal: string) => ({
  name,
  type,
  colors: { 'editor.foreground': ink, 'editor.background': background },
  tokenColors: [
    { scope: ['keyword', 'storage'], settings: { foreground: keyword } },
    { scope: ['string'], settings: { foreground: string } },
    { scope: ['comment'], settings: { foreground: comment } },
    { scope: ['constant', 'entity.name.type', 'support.type'], settings: { foreground: literal } }
  ]
});

export const codeThemes = {
  light: theme('lte-light', 'light', '#454252', '#f1eef2', '#675b87', '#77545f', '#595866', '#655c70'),
  dark: theme('lte-dark', 'dark', '#e5dfea', '#262431', '#c6a1ee', '#e2a89c', '#ada6b4', '#b3c5e6')
};