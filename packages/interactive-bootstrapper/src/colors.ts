export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  fg: {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    crimson: '\x1b[38m', // Scarlet
  },
};
const colorsList = Object.values(colors.fg);
let colorsIndex = Math.floor(0 * colorsList.length);
// Make sure we never put the same color next to each other

export const randomColor = () => {
  colorsIndex += 1;
  return colorsList[colorsIndex % colorsList.length];
};

export const iconWithSpace = (icon: string) => {
  if (icon === '🥷') return `${icon} `; // no idea why but this emoji is a liar
  return [...icon].length > 1 ? `${icon}  ` : `${icon} `;
};
