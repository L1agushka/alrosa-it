// CSS.supports accepts URL filters even in engines that do not render them
// on the backdrop. Limit the enhanced path to the engine tested here.
export const supportsRefraction = /Chrome\//.test(navigator.userAgent)
  && !/CriOS|EdgiOS/.test(navigator.userAgent);
