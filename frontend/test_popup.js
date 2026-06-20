// Just a thought experiment script to see how to intercept window.open
const originalOpen = window.open;
window.open = function (url, target, features) {
  let newFeatures = features;
  if (features) {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // If left/top are missing or we want to override
    if (!features.includes('left=')) {
      newFeatures += `,left=${left},top=${top}`;
    }
  }
  return originalOpen.call(this, url, target, newFeatures);
};
